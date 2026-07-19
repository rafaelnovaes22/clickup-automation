#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createClickUpClient, findListByTarget } from "./lib/clickup.mjs";
import { clickUpCredentials, loadLocalEnv, root } from "./lib/env.mjs";

const customFieldsPath = resolve(root, "config/clickup-custom-fields.json");

const args = new Set(process.argv.slice(2));
const live = args.has("--live");
const dryRun = !live || args.has("--dry-run");

await loadLocalEnv();

const { token, teamId } = clickUpCredentials();
const config = JSON.parse(await readFile(customFieldsPath, "utf8"));
const clickUp = createClickUpClient({ token });

if (live && (!token || !teamId)) {
  console.error("Missing ClickUp credentials.");
  console.error("Expected CLICKUP_TOKEN + CLICKUP_TEAM_ID or NOVAIS_INTERNAL_CLICKUP_TOKEN + NOVAIS_INTERNAL_WORKSPACE_ID.");
  process.exit(1);
}

function log(action, detail) {
  console.log(`${dryRun ? "[dry-run]" : "[live]"} ${action}: ${detail}`);
}

function optionColor(index) {
  const colors = [
    "#2ecd6f",
    "#1bbc9c",
    "#3498db",
    "#9b59b6",
    "#f1c40f",
    "#e67e22",
    "#e74c3c",
    "#95a5a6"
  ];
  return colors[index % colors.length];
}

function fieldPayload(field) {
  const payload = {
    name: field.name,
    type: field.type
  };

  if (field.type === "drop_down") {
    payload.type_config = {
      options: field.options.map((name, index) => ({
        name,
        color: optionColor(index),
        orderindex: index
      }))
    };
  }

  return payload;
}

async function existingFields(listId) {
  const data = await clickUp.request("GET", `/list/${listId}/field`);
  return data.fields ?? [];
}

async function ensureField(list, field, existing) {
  const found = existing.find((item) => item.name === field.name);
  if (found) {
    log("field exists", `${list.name} / ${field.name}`);
    return;
  }

  log("create field", `${list.name} / ${field.name}`);
  if (dryRun) return;

  await clickUp.request("POST", `/list/${list.id}/field`, fieldPayload(field));
}

async function ensureFieldSet(fieldSet) {
  const list = dryRun
    ? { id: `dry-list-${fieldSet.target.list}`, name: fieldSet.target.list }
    : await findListByTarget(clickUp, teamId, fieldSet.target);

  const existing = dryRun ? [] : await existingFields(list.id);

  console.log(`\n${fieldSet.target.space} / ${fieldSet.target.list}`);
  for (const field of fieldSet.fields) {
    await ensureField(list, field, existing);
  }
}

async function main() {
  console.log(`ClickUp Novais Digital custom fields seed ${dryRun ? "(dry-run)" : "(live)"}`);
  console.log(`Field sets: ${config.version}`);

  for (const fieldSet of config.fieldSets) {
    await ensureFieldSet(fieldSet);
  }

  console.log("\nDone.");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
