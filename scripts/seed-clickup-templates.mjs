#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const API_BASE = "https://api.clickup.com/api/v2";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, ".env");
const templatesPath = resolve(root, "config/clickup-task-templates.json");

const args = new Set(process.argv.slice(2));
const live = args.has("--live");
const dryRun = !live || args.has("--dry-run");

await loadLocalEnv();

const token = process.env.CLICKUP_TOKEN ?? process.env.ACME_INTERNAL_CLICKUP_TOKEN;
const teamId = process.env.CLICKUP_TEAM_ID ?? process.env.ACME_INTERNAL_WORKSPACE_ID;
const templateConfig = JSON.parse(await readFile(templatesPath, "utf8"));

if (live && (!token || !teamId)) {
  console.error("Missing ClickUp credentials.");
  console.error("Expected CLICKUP_TOKEN + CLICKUP_TEAM_ID or ACME_INTERNAL_CLICKUP_TOKEN + ACME_INTERNAL_WORKSPACE_ID.");
  process.exit(1);
}

const headers = {
  Authorization: token,
  "Content-Type": "application/json"
};

async function loadLocalEnv() {
  let content;
  try {
    content = await readFile(envPath, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return;
    throw error;
  }

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) process.env[key] = value;
  }
}

async function request(method, path, body) {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : {};

  if (!response.ok) {
    throw new Error(`${method} ${path} failed (${response.status}): ${text}`);
  }

  return data;
}

function log(action, detail) {
  console.log(`${dryRun ? "[dry-run]" : "[live]"} ${action}: ${detail}`);
}

function templateDescription(template) {
  const requiredFields = template.fields?.filter((field) => field.required) ?? [];
  const optionalFields = template.fields?.filter((field) => !field.required) ?? [];
  const fieldLines = [
    "## Campos obrigatorios",
    ...requiredFields.map(formatField),
    "",
    "## Campos opcionais",
    ...(optionalFields.length ? optionalFields.map(formatField) : ["- Nenhum."])
  ];
  const activityLines = [
    "## Atividades disparadas",
    ...((template.activities ?? []).map((activity) => `- Quando \`${activity.trigger}\`: ${activity.action}`))
  ];

  return [
    ...template.description,
    "",
    ...fieldLines,
    "",
    ...activityLines,
    "",
    `Template key: ${template.key}`,
    `Lista alvo: ${template.target.space} / ${template.target.list}`,
    `Status desejado: ${template.target.desiredStatus}`
  ].join("\n");
}

function formatField(field) {
  const options = field.options?.length ? ` Opcoes: ${field.options.join(", ")}.` : "";
  const example = field.example !== undefined ? ` Exemplo: ${field.example}.` : "";
  return `- \`${field.key}\` (${field.type}) - ${field.label}.${options}${example}`;
}

async function findList(spaceName, listName) {
  const spaces = (await request("GET", `/team/${teamId}/space?archived=false`)).spaces ?? [];
  const space = spaces.find((item) => item.name === spaceName);
  if (!space) throw new Error(`Space not found: ${spaceName}`);

  const lists = (await request("GET", `/space/${space.id}/list?archived=false`)).lists ?? [];
  const list = lists.find((item) => item.name === listName);
  if (!list) throw new Error(`List not found: ${spaceName} / ${listName}`);

  return list;
}

async function findTaskByName(listId, taskName) {
  const tasks = (await request("GET", `/list/${listId}/task?archived=false&subtasks=false&include_closed=true`)).tasks ?? [];
  return tasks.find((task) => task.name === taskName);
}

async function createTask(listId, payload) {
  if (dryRun) return { id: `dry-task-${payload.name}` };
  return request("POST", `/list/${listId}/task`, payload);
}

async function updateTask(taskId, payload) {
  if (dryRun) return;
  await request("PUT", `/task/${taskId}`, payload);
}

async function ensureTemplate(template) {
  const list = dryRun
    ? { id: `dry-list-${template.target.list}`, name: template.target.list }
    : await findList(template.target.space, template.target.list);

  const existingTask = dryRun ? null : await findTaskByName(list.id, template.name);
  if (existingTask) {
    log("update template", template.name);
    await updateTask(existingTask.id, {
      name: template.name,
      description: templateDescription(template)
    });
    return;
  }

  log("create template", `${template.target.space} / ${template.target.list} / ${template.name}`);
  const parent = await createTask(list.id, {
    name: template.name,
    description: templateDescription(template),
    tags: ["ia-gerado", "revisao-humana"]
  });

  for (const subtask of template.subtasks) {
    log("create subtask", `${template.name} -> ${subtask}`);
    await createTask(list.id, {
      name: subtask,
      description: `Subtask padrao do template ${template.key}.`,
      parent: parent.id
    });
  }
}

async function main() {
  console.log(`ClickUp Acme template seed ${dryRun ? "(dry-run)" : "(live)"}`);
  console.log(`Templates: ${templateConfig.version}\n`);

  for (const template of templateConfig.templates) {
    await ensureTemplate(template);
  }

  console.log("\nDone.");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
