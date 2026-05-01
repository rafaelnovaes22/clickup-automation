#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const API_BASE = "https://api.clickup.com/api/v2";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, ".env");
const catalogPath = resolve(root, "config/activity-catalog.json");

const args = new Set(process.argv.slice(2));
const live = args.has("--live");
const dryRun = !live || args.has("--dry-run");

await loadLocalEnv();

const token = process.env.CLICKUP_TOKEN ?? process.env.ACME_INTERNAL_CLICKUP_TOKEN;
const teamId = process.env.CLICKUP_TEAM_ID ?? process.env.ACME_INTERNAL_WORKSPACE_ID;
const catalog = JSON.parse(await readFile(catalogPath, "utf8"));

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

function taskName(activity) {
  return `[ATIVIDADE ${String(activity.id).padStart(3, "0")}] ${activity.activity}`;
}

function taskDescription(activity) {
  return [
    `Fase: ${activity.phase}`,
    `Dono: ${activity.owner}`,
    `Onde: ${activity.space} / ${activity.list}`,
    `Status desejado: ${activity.status}`,
    `Trigger: ${activity.trigger}`,
    activity.artifact ? `Artefato produzido: ${activity.artifact}` : null,
    "",
    "Uso operacional:",
    "- Esta task e um blueprint operacional.",
    "- Tasks reais devem nascer a partir do evento/trigger correspondente.",
    "- Artefatos devem ser anexados ou linkados na task real que os produziu."
  ].filter(Boolean).join("\n");
}

async function findListCache() {
  if (dryRun) return new Map();

  const spaces = (await request("GET", `/team/${teamId}/space?archived=false`)).spaces ?? [];
  const cache = new Map();

  for (const space of spaces) {
    const lists = (await request("GET", `/space/${space.id}/list?archived=false`)).lists ?? [];
    for (const list of lists) {
      cache.set(`${space.name}/${list.name}`, list);
    }
  }

  return cache;
}

async function getTasks(listId) {
  const data = await request("GET", `/list/${listId}/task?archived=false&subtasks=false&include_closed=true`);
  return data.tasks ?? [];
}

async function ensureActivity(activity, listCache, taskCache) {
  const key = `${activity.space}/${activity.list}`;
  const list = dryRun ? { id: `dry-list-${activity.list}` } : listCache.get(key);
  if (!list) throw new Error(`List not found: ${key}`);

  const name = taskName(activity);
  const existingTasks = dryRun
    ? []
    : taskCache.get(list.id) ?? await getTasks(list.id);
  if (!dryRun && !taskCache.has(list.id)) taskCache.set(list.id, existingTasks);

  const existing = existingTasks.find((task) => task.name === name);
  if (existing) {
    log("update activity", name);
    if (!dryRun) {
      await request("PUT", `/task/${existing.id}`, {
        name,
        description: taskDescription(activity)
      });
    }
    return;
  }

  log("create activity", `${key} / ${name}`);
  if (dryRun) return;

  await request("POST", `/list/${list.id}/task`, {
    name,
    description: taskDescription(activity),
    tags: ["ia-gerado", "revisao-humana"]
  });
}

async function main() {
  console.log(`ClickUp Acme activity seed ${dryRun ? "(dry-run)" : "(live)"}`);
  console.log(`Activities: ${catalog.activities.length}\n`);

  const listCache = await findListCache();
  const taskCache = new Map();

  for (const activity of catalog.activities) {
    await ensureActivity(activity, listCache, taskCache);
  }

  console.log("\nDone.");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
