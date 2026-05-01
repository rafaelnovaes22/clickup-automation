#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const API_BASE = "https://api.clickup.com/api/v2";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const blueprintPath = resolve(root, "config/clickup-governance.blueprint.json");
const navigationPath = resolve(root, "docs/HOW_TO_NAVIGATE_CLICKUP.md");
const envPath = resolve(root, ".env");

const args = new Set(process.argv.slice(2));
const live = args.has("--live");
const dryRun = !live || args.has("--dry-run");

await loadLocalEnv();

const token = process.env.CLICKUP_TOKEN ?? process.env.ACME_INTERNAL_CLICKUP_TOKEN;
const teamId = process.env.CLICKUP_TEAM_ID ?? process.env.ACME_INTERNAL_WORKSPACE_ID;

const blueprint = JSON.parse(await readFile(blueprintPath, "utf8"));
const navigationDoc = await readFile(navigationPath, "utf8");

if (live && (!token || !teamId)) {
  console.error("Missing ClickUp credentials.");
  console.error("Expected CLICKUP_TOKEN + CLICKUP_TEAM_ID or ACME_INTERNAL_CLICKUP_TOKEN + ACME_INTERNAL_WORKSPACE_ID.");
  console.error("Run dry mode with: npm run bootstrap:dry");
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

function spacePayload(space) {
  return {
    name: space.name,
    multiple_assignees: true,
    features: {
      due_dates: { enabled: true, start_date: true, remap_due_dates: true, remap_closed_due_date: false },
      time_tracking: { enabled: false },
      tags: { enabled: true },
      time_estimates: { enabled: false },
      checklists: { enabled: true },
      custom_fields: { enabled: true },
      remap_dependencies: { enabled: true },
      dependency_warning: { enabled: true },
      portfolios: { enabled: false }
    }
  };
}

async function getSpaces() {
  const data = await request("GET", `/team/${teamId}/space?archived=false`);
  return data.spaces ?? [];
}

async function ensureSpace(space, existingSpaces) {
  const existing = existingSpaces.find((item) => item.name === space.name);
  if (existing) {
    log("space exists", space.name);
    return existing;
  }

  const reusableDefaultSpace = existingSpaces.find((item) =>
    ["Espaço da equipe", "Espaco da equipe", "Team Space"].includes(item.name)
  );

  if (reusableDefaultSpace && space.name === blueprint.navigationDocTask.space) {
    log("rename default space", `${reusableDefaultSpace.name} -> ${space.name}`);
    if (dryRun) return { ...reusableDefaultSpace, name: space.name };

    try {
      const renamed = await request("PUT", `/space/${reusableDefaultSpace.id}`, {
        ...spacePayload(space),
        name: space.name
      });
      return renamed;
    } catch (error) {
      console.warn(`Could not rename default space: ${error.message}`);
      console.warn("Reusing it without renaming so the bootstrap can continue.");
      return reusableDefaultSpace;
    }
  }

  log("create space", space.name);
  if (dryRun) return { id: `dry-space-${space.name}`, name: space.name };

  return request("POST", `/team/${teamId}/space`, spacePayload(space));
}

async function getLists(spaceId) {
  const data = await request("GET", `/space/${spaceId}/list?archived=false`);
  return data.lists ?? [];
}

async function ensureList(spaceId, list, existingLists) {
  const existing = existingLists.find((item) => item.name === list.name);
  if (existing) {
    log("list exists", list.name);
    return existing;
  }

  log("create list", list.name);
  if (dryRun) return { id: `dry-list-${list.name}`, name: list.name };

  return request("POST", `/space/${spaceId}/list`, {
    name: list.name,
    content: `${list.entity}. Status desejados: ${list.statuses.join(" -> ")}`
  });
}

async function ensureTag(spaceId, tag) {
  log("ensure tag", tag);
  if (dryRun) return;

  try {
    await request("POST", `/space/${spaceId}/tag`, {
      tag: {
        name: tag,
        tag_fg: "#ffffff",
        tag_bg: "#2f80ed"
      }
    });
  } catch (error) {
    if (!String(error.message).includes("already exists")) {
      throw error;
    }
  }
}

async function getTasks(listId) {
  const data = await request("GET", `/list/${listId}/task?archived=false&subtasks=false&include_closed=true`);
  return data.tasks ?? [];
}

async function ensureNavigationTask(listId) {
  const taskName = blueprint.navigationDocTask.name;

  if (!dryRun) {
    const tasks = await getTasks(listId);
    if (tasks.some((task) => task.name === taskName)) {
      log("task exists", taskName);
      return;
    }
  }

  log("create task", taskName);
  if (dryRun) return;

  await request("POST", `/list/${listId}/task`, {
    name: taskName,
    description: navigationDoc,
    status: "to do"
  });
}

function printStatusChecklist() {
  console.log("\nStatus checklist for ClickUp UI review:");
  for (const space of blueprint.spaces) {
    console.log(`\n${space.name}`);
    for (const list of space.lists) {
      console.log(`- ${list.name}: ${list.statuses.join(" -> ")}`);
    }
  }
}

async function main() {
  console.log(`ClickUp Acme bootstrap ${dryRun ? "(dry-run)" : "(live)"}`);
  console.log(`Blueprint: ${blueprint.version} from ${blueprint.source}\n`);

  let existingSpaces = [];
  if (!dryRun) existingSpaces = await getSpaces();

  const listsByName = new Map();

  for (const space of blueprint.spaces) {
    const createdSpace = await ensureSpace(space, existingSpaces);

    for (const tag of blueprint.tags) {
      await ensureTag(createdSpace.id, tag);
    }

    const existingLists = dryRun ? [] : await getLists(createdSpace.id);
    for (const list of space.lists) {
      const createdList = await ensureList(createdSpace.id, list, existingLists);
      listsByName.set(`${space.name}/${list.name}`, createdList);
    }
  }

  const docKey = `${blueprint.navigationDocTask.space}/${blueprint.navigationDocTask.list}`;
  const docList = listsByName.get(docKey);
  if (!docList) throw new Error(`Navigation doc target list not found: ${docKey}`);
  await ensureNavigationTask(docList.id);

  printStatusChecklist();
  console.log("\nDone.");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
