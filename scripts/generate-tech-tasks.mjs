#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const API_BASE = "https://api.clickup.com/api/v2";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, ".env");
const platformCatalogPath = resolve(root, "config/tech-platform-catalog.json");
const contractPath = resolve(root, "config/tech-automation-contract.json");

const args = process.argv.slice(2);
const live = args.includes("--live");
const dryRun = !live || args.includes("--dry-run");
const payloadArg = args.find((arg) => arg.startsWith("--payload="));
const payloadFileArg = args.find((arg) => arg.startsWith("--payload-file="));

await loadLocalEnv();

const token = process.env.CLICKUP_TOKEN ?? process.env.ACME_INTERNAL_CLICKUP_TOKEN;
const teamId = process.env.CLICKUP_TEAM_ID ?? process.env.ACME_INTERNAL_WORKSPACE_ID;
const platformCatalog = JSON.parse(await readFile(platformCatalogPath, "utf8"));
const contract = JSON.parse(await readFile(contractPath, "utf8"));
const payload = await resolvePayload();

if (live && (!token || !teamId)) {
  console.error("Missing ClickUp credentials.");
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

function samplePayload() {
  return {
    client_name: "Cliente Exemplo",
    client_task_id: "CLICKUP_CLIENT_TASK_ID",
    diagnostic_task_id: "CLICKUP_DIAGNOSTIC_TASK_ID",
    technical_platforms: ["whatsapp", "node_backend"],
    tech_owner: "Dev",
    delivery_due_date: "2026-05-15",
    repository_url: "https://github.com/acme/example",
    environment: "dev",
    notes: "Payload de exemplo para dry-run."
  };
}

async function resolvePayload() {
  if (payloadFileArg) {
    const payloadPath = resolve(root, payloadFileArg.slice("--payload-file=".length));
    return JSON.parse(await readFile(payloadPath, "utf8"));
  }

  if (payloadArg) {
    return JSON.parse(payloadArg.slice("--payload=".length));
  }

  return samplePayload();
}

function validatePayload(input) {
  const missing = contract.requiredFields.filter((field) => {
    const value = input[field];
    return value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0);
  });

  if (missing.length) {
    throw new Error(`Missing required fields: ${missing.join(", ")}`);
  }
}

function selectedPlatforms(input) {
  const keys = new Set(input.technical_platforms);
  const platforms = platformCatalog.platforms.filter((platform) => keys.has(platform.key));
  const unknown = [...keys].filter((key) => !platforms.some((platform) => platform.key === key));
  if (unknown.length) throw new Error(`Unknown technical platforms: ${unknown.join(", ")}`);
  return platforms;
}

function taskName(input, platform, task) {
  return `[TECH] ${input.client_name} / ${platform.label} / ${task.title}`;
}

function taskDescription(input, platform, task) {
  return [
    `Cliente: ${input.client_name}`,
    `Plataforma: ${platform.label}`,
    `Responsavel tecnico: ${input.tech_owner}`,
    `Ambiente: ${input.environment}`,
    `Cliente task: ${input.client_task_id}`,
    input.diagnostic_task_id ? `Diagnostico task: ${input.diagnostic_task_id}` : null,
    input.setup_task_id ? `Setup task: ${input.setup_task_id}` : null,
    input.repository_url ? `Repositorio: ${input.repository_url}` : null,
    "",
    `Entrega tecnica: ${task.title}`,
    `Artefato esperado: ${task.artifact}`,
    `Done when: ${task.doneWhen}`,
    "",
    "Controle automatico:",
    `platform_key=${platform.key}`,
    `task_key=${task.key}`,
    `client_task_id=${input.client_task_id}`,
    input.notes ? `Notas: ${input.notes}` : null
  ].filter(Boolean).join("\n");
}

async function findBacklogList() {
  const spaces = (await request("GET", `/team/${teamId}/space?archived=false`)).spaces ?? [];
  const space = spaces.find((item) => item.name === contract.target.space);
  if (!space) throw new Error(`Space not found: ${contract.target.space}`);

  const lists = (await request("GET", `/space/${space.id}/list?archived=false`)).lists ?? [];
  const list = lists.find((item) => item.name === contract.target.list);
  if (!list) throw new Error(`List not found: ${contract.target.space} / ${contract.target.list}`);

  return list;
}

async function existingTaskNames(listId) {
  const tasks = (await request("GET", `/list/${listId}/task?archived=false&subtasks=false&include_closed=true`)).tasks ?? [];
  return new Set(tasks.map((task) => task.name));
}

async function createTechTasks(input) {
  validatePayload(input);
  const platforms = selectedPlatforms(input);
  const planned = platforms.flatMap((platform) =>
    platform.tasks.map((task) => ({ platform, task }))
  );

  console.log(`Tech task generation ${dryRun ? "(dry-run)" : "(live)"}`);
  console.log(`Client: ${input.client_name}`);
  console.log(`Platforms: ${platforms.map((platform) => platform.key).join(", ")}`);
  console.log(`Tasks: ${planned.length}\n`);

  const list = dryRun ? { id: "dry-backlog" } : await findBacklogList();
  const existingNames = dryRun ? new Set() : await existingTaskNames(list.id);

  for (const item of planned) {
    const name = taskName(input, item.platform, item.task);
    if (existingNames.has(name)) {
      console.log(`${dryRun ? "[dry-run]" : "[live]"} task exists: ${name}`);
      continue;
    }

    console.log(`${dryRun ? "[dry-run]" : "[live]"} create task: ${name}`);
    if (dryRun) continue;

    await request("POST", `/list/${list.id}/task`, {
      name,
      description: taskDescription(input, item.platform, item.task),
      due_date: Date.parse(`${input.delivery_due_date}T23:59:59.000Z`),
      tags: ["ia-gerado", "revisao-humana"]
    });
  }
}

await createTechTasks(payload).catch((error) => {
  console.error(error.message);
  process.exit(1);
});
