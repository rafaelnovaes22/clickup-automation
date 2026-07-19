#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createClickUpClient } from "./lib/clickup.mjs";
import { clickUpCredentials, loadLocalEnv, root } from "./lib/env.mjs";
import { findOrCreatePlatformFolder, listAllTasks } from "./lib/aios-platform.mjs";

await loadLocalEnv();

const { token, teamId } = clickUpCredentials();
if (!token || !teamId) {
  console.error("Missing ClickUp credentials.");
  process.exit(1);
}

const args = process.argv.slice(2);
const live = args.includes("--live");
const dryRun = !live || args.includes("--dry-run");

const spaceName = "05 Institucional Novais Digital";
const folderName = "Plataforma SchoolPlatform";
const listName = "Modulos";
const fieldName = "Semana";

const clickUp = createClickUpClient({ token });

const payload = JSON.parse(await readFile(resolve(root, "examples/edix-modules.payload.json"), "utf8"));
const weekByModule = new Map(payload.modules.map((m) => [m.key, m.week]));

console.log(`AIOS week field seed ${dryRun ? "(dry-run)" : "(live)"}`);

const folderResult = await findOrCreatePlatformFolder(clickUp, teamId, spaceName, folderName);
if (folderResult.created) {
  console.error(`Folder "${folderName}" nao existe ainda.`);
  process.exit(1);
}

const lists = await clickUp.request("GET", `/folder/${folderResult.folder.id}/list?archived=false`);
const list = (lists.lists ?? []).find((l) => l.name === listName);
if (!list) throw new Error(`List "${listName}" nao encontrada na folder.`);
console.log(`List ${listName} (id ${list.id})`);

// Step 1: ensure field exists
const existingFields = (await clickUp.request("GET", `/list/${list.id}/field`)).fields ?? [];
let weekField = existingFields.find((f) => f.name === fieldName);

if (weekField) {
  console.log(`Field "${fieldName}" ja existe (id ${weekField.id})`);
} else {
  console.log(`${dryRun ? "[dry-run]" : "[live]"} criar custom field "${fieldName}" (number)`);
  if (!dryRun) {
    await clickUp.request("POST", `/list/${list.id}/field`, {
      name: fieldName,
      type: "number"
    });
    // POST nao retorna o id - re-fetch a lista de fields
    const refreshed = (await clickUp.request("GET", `/list/${list.id}/field`)).fields ?? [];
    weekField = refreshed.find((f) => f.name === fieldName);
    if (!weekField) throw new Error(`Field "${fieldName}" nao apareceu apos criacao.`);
    console.log(`  id: ${weekField.id}`);
  } else {
    weekField = { id: "dry-field-id" };
  }
}

// Step 2: populate field for each parent
const tasks = await listAllTasks(clickUp, list.id);
const parents = tasks.filter((task) => !task.parent);
console.log(`\nParents encontrados: ${parents.length}`);

let updated = 0;
let skipped = 0;
for (const parent of parents) {
  const match = parent.name.match(/^([a-z0-9_]+)\s+·/);
  if (!match) {
    console.log(`  [skip] nome nao parseavel: ${parent.name}`);
    skipped += 1;
    continue;
  }
  const moduleKey = match[1];
  const week = weekByModule.get(moduleKey);
  if (week === undefined) {
    console.log(`  [skip] modulo ${moduleKey} nao tem week no payload`);
    skipped += 1;
    continue;
  }

  // Check if already set
  const existing = (parent.custom_fields ?? []).find((f) => f.name === fieldName);
  if (existing && Number(existing.value) === week) {
    console.log(`  [skip] ${moduleKey}: Semana ja = ${week}`);
    skipped += 1;
    continue;
  }

  console.log(`  ${dryRun ? "[dry-run]" : "[live]"} ${moduleKey} -> Semana ${week}`);
  if (dryRun) continue;

  await clickUp.request("POST", `/task/${parent.id}/field/${weekField.id}`, {
    value: week
  });
  updated += 1;
}

if (!dryRun) {
  console.log(`\nAtualizados: ${updated} | Pulados: ${skipped}`);
}
