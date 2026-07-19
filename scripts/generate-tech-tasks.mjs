#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createClickUpClient, findListByTarget, listTasks } from "./lib/clickup.mjs";
import { clickUpCredentials, loadLocalEnv, root } from "./lib/env.mjs";
import { selectedPlatforms, taskDescription, taskName, validatePayload } from "./lib/tech-tasks.mjs";

const platformCatalogPath = resolve(root, "config/tech-platform-catalog.json");
const contractPath = resolve(root, "config/tech-automation-contract.json");

const args = process.argv.slice(2);
const live = args.includes("--live");
const dryRun = !live || args.includes("--dry-run");
const payloadArg = args.find((arg) => arg.startsWith("--payload="));
const payloadFileArg = args.find((arg) => arg.startsWith("--payload-file="));

await loadLocalEnv();

const { token, teamId } = clickUpCredentials();
const platformCatalog = JSON.parse(await readFile(platformCatalogPath, "utf8"));
const contract = JSON.parse(await readFile(contractPath, "utf8"));
const payload = await resolvePayload();
const clickUp = createClickUpClient({ token });

if (live && (!token || !teamId)) {
  console.error("Missing ClickUp credentials.");
  process.exit(1);
}

function samplePayload() {
  return {
    client_name: "Cliente Exemplo",
    client_task_id: "CLICKUP_CLIENT_TASK_ID",
    diagnostic_task_id: "CLICKUP_DIAGNOSTIC_TASK_ID",
    technical_platforms: ["ai_agent", "whatsapp", "node_backend"],
    tech_owner: "AI Engineer",
    delivery_due_date: "2026-05-15",
    repository_url: "https://github.com/novais-digital/example",
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

async function findBacklogList() {
  return findListByTarget(clickUp, teamId, contract.target);
}

async function existingTaskNames(listId) {
  const tasks = await listTasks(clickUp, listId);
  return new Set(tasks.map((task) => task.name));
}

async function createTechTasks(input) {
  validatePayload(input, contract);
  const platforms = selectedPlatforms(input, platformCatalog);
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

    await clickUp.request("POST", `/list/${list.id}/task`, {
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
