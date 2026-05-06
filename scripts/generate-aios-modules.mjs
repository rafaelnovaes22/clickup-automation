#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createClickUpClient, findListByTarget, listTasks } from "./lib/clickup.mjs";
import { clickUpCredentials, loadLocalEnv, root } from "./lib/env.mjs";
import {
  aiosTaskDescription,
  aiosTaskName,
  aiosTaskTags,
  isManualModule,
  planTasksForModule,
  validateAiosPayload
} from "./lib/aios-modules.mjs";

const catalogPath = resolve(root, "config/aios-module-catalog.json");
const contractPath = resolve(root, "config/aios-pipeline-contract.json");

const args = process.argv.slice(2);
const live = args.includes("--live");
const dryRun = !live || args.includes("--dry-run");
const payloadArg = args.find((arg) => arg.startsWith("--payload="));
const payloadFileArg = args.find((arg) => arg.startsWith("--payload-file="));

await loadLocalEnv();

const { token, teamId } = clickUpCredentials();
const catalog = JSON.parse(await readFile(catalogPath, "utf8"));
const contract = JSON.parse(await readFile(contractPath, "utf8"));
const payload = await resolvePayload();
const clickUp = token ? createClickUpClient({ token }) : null;

if (live && (!token || !teamId)) {
  console.error("Missing ClickUp credentials.");
  process.exit(1);
}

function samplePayload() {
  return {
    client_name: "Cliente AIOS Exemplo",
    client_task_id: "CLICKUP_CLIENT_TASK_ID",
    modules: [
      { key: "cadastros", tier: "A", week: 3 },
      { key: "cnab",      tier: "C", week: 9 }
    ],
    tech_owner: "Rafael Novaes",
    delivery_due_date: "2026-07-15",
    repository_url: "https://github.com/acme/example-saas",
    project_root: "c:/Users/Rafael/Projetos/Exemplo",
    environment: "dev",
    notes: "Payload AIOS de exemplo para dry-run."
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

function logHeader(input, totalTasks) {
  console.log(`AIOS module generation ${dryRun ? "(dry-run)" : "(live)"}`);
  console.log(`Cliente: ${input.client_name}`);
  console.log(`Modulos: ${input.modules.length}`);
  console.log(`Tasks planejadas: ${totalTasks}\n`);
}

async function createAiosTasks(input) {
  validateAiosPayload(input, contract);

  const moduleBatches = input.modules.map((module) => ({
    module,
    plans: planTasksForModule(module, catalog)
  }));
  const totalTasks = moduleBatches.reduce((acc, batch) => acc + batch.plans.length, 0);
  logHeader(input, totalTasks);

  const list = dryRun ? { id: "dry-backlog" } : await findBacklogList();
  const existingNames = dryRun ? new Set() : await existingTaskNames(list.id);
  const dueTimestamp = Date.parse(`${input.delivery_due_date}T23:59:59.000Z`);
  let dryRunIdCounter = 0;

  for (const batch of moduleBatches) {
    const stageIdByKey = new Map();
    const isManual = isManualModule(batch.module);

    console.log(`> Modulo ${batch.module.key} (tier ${batch.module.tier}, semana ${batch.module.week}) - ${batch.plans.length} task${batch.plans.length === 1 ? "" : "s"}${isManual ? " [MANUAL]" : ""}`);

    for (const plan of batch.plans) {
      const name = aiosTaskName(input, plan);
      if (existingNames.has(name)) {
        console.log(`  ${dryRun ? "[dry-run]" : "[live]"} task exists: ${name}`);
        continue;
      }

      const description = aiosTaskDescription(input, plan);
      const tags = aiosTaskTags(plan);
      const stageKey = plan.manual ? "manual_implementation" : plan.stage.key;

      console.log(`  ${dryRun ? "[dry-run]" : "[live]"} create task: ${name}`);

      let createdId;
      if (dryRun) {
        createdId = `dry-${batch.module.key}-${stageKey}-${++dryRunIdCounter}`;
      } else {
        const created = await clickUp.request("POST", `/list/${list.id}/task`, {
          name,
          description,
          due_date: dueTimestamp,
          tags
        });
        createdId = created.id;
      }
      stageIdByKey.set(stageKey, createdId);

      const dependencies = plan.manual ? [] : (plan.stage.depends_on ?? []);
      for (const dep of dependencies) {
        const parentId = stageIdByKey.get(dep);
        if (!parentId) {
          console.log(`    [warn] missing predecessor ${dep} for ${stageKey} - skipping dependency`);
          continue;
        }
        console.log(`    -> depends_on: ${dep}`);
        if (!dryRun) {
          await clickUp.request("POST", `/task/${createdId}/dependency`, {
            depends_on: parentId
          });
        }
      }
    }
  }
}

await createAiosTasks(payload).catch((error) => {
  console.error(error.message);
  process.exit(1);
});
