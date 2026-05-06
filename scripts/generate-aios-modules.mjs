#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createClickUpClient } from "./lib/clickup.mjs";
import { clickUpCredentials, loadLocalEnv, root } from "./lib/env.mjs";
import {
  isManualModule,
  moduleParentDescription,
  moduleParentName,
  moduleParentTags,
  planTasksForModule,
  stageSubtaskDescription,
  stageSubtaskName,
  stageSubtaskTags,
  validateAiosPayload
} from "./lib/aios-modules.mjs";
import {
  findOrCreateModuleList,
  findOrCreatePlatformFolder,
  indexParentsByModuleKey,
  listAllTasks
} from "./lib/aios-platform.mjs";

const catalogPath = resolve(root, "config/aios-module-catalog.json");
const contractPath = resolve(root, "config/aios-pipeline-contract.json");
const functionalitiesPath = resolve(root, "config/aios-module-functionalities.json");

const args = process.argv.slice(2);
const live = args.includes("--live");
const dryRun = !live || args.includes("--dry-run");
const payloadArg = args.find((arg) => arg.startsWith("--payload="));
const payloadFileArg = args.find((arg) => arg.startsWith("--payload-file="));

await loadLocalEnv();

const { token, teamId } = clickUpCredentials();
const catalog = JSON.parse(await readFile(catalogPath, "utf8"));
const contract = JSON.parse(await readFile(contractPath, "utf8"));
const functionalities = await loadFunctionalitiesOrEmpty();
const payload = await resolvePayload();
const clickUp = token ? createClickUpClient({ token }) : null;

if (live && (!token || !teamId)) {
  console.error("Missing ClickUp credentials.");
  process.exit(1);
}

async function loadFunctionalitiesOrEmpty() {
  try {
    return JSON.parse(await readFile(functionalitiesPath, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return { modules: {} };
    throw error;
  }
}

function samplePayload() {
  return {
    client_name: "Cliente AIOS Exemplo",
    platform_name: "Plataforma Cliente AIOS Exemplo",
    list_name: "Modulos",
    modules: [
      { key: "cadastros", tier: "A", week: 3 },
      { key: "cnab", tier: "C", week: 9 }
    ],
    tech_owner: "Rafael Novaes",
    delivery_due_date: "2026-07-15",
    repository_url: "https://github.com/acme/example-saas",
    project_root: "c:/Users/Rafael/Projetos/Exemplo",
    environment: "dev"
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

async function generate(input) {
  validateAiosPayload(input, contract);

  const spaceName = contract.target?.space ?? "05 Institucional Acme";
  const folderName = input.platform_name;
  const listName = input.list_name ?? "Modulos";

  console.log(`AIOS module generation ${dryRun ? "(dry-run)" : "(live)"}`);
  console.log(`Cliente: ${input.client_name}`);
  console.log(`Folder: ${folderName} (em ${spaceName})`);
  console.log(`List: ${listName}`);
  console.log(`Modulos: ${input.modules.length}\n`);

  if (dryRun && !clickUp) {
    console.log("[dry-run] sem credenciais ClickUp - simulando estrutura");
  }

  const folderResult = clickUp
    ? await findOrCreatePlatformFolder(clickUp, teamId, spaceName, folderName, { dryRun })
    : { folder: { id: "dry-folder" }, created: true, dryRun: true };

  console.log(`> Folder ${folderResult.created ? "criada" : "ja existia"}: ${folderResult.folder.id}`);

  const listResult = clickUp
    ? await findOrCreateModuleList(clickUp, folderResult.folder.id, listName, {
        dryRun,
        content: `Modulos da ${folderName}. Cada task = 1 modulo. Subtasks = stages do pipeline AIOS.`
      })
    : { list: { id: "dry-list" }, created: true, dryRun: true };

  console.log(`> List ${listResult.created ? "criada" : "ja existia"}: ${listResult.list.id}`);

  const existing = (clickUp && !listResult.dryRun) ? await listAllTasks(clickUp, listResult.list.id) : [];
  const existingByName = new Map(existing.map((task) => [task.name, task]));
  const existingParents = indexParentsByModuleKey(existing);

  const dueTimestamp = Date.parse(`${input.delivery_due_date}T23:59:59.000Z`);
  const moduleParentIds = new Map();
  const dependenciesQueue = [];
  let parentsCreated = 0;
  let subtasksCreated = 0;

  // Phase 1: parent tasks
  for (const module of input.modules) {
    const info = functionalities.modules?.[module.key];
    const name = moduleParentName(module, info);
    const existingParent = existingParents.get(module.key) ?? existingByName.get(name);

    if (existingParent) {
      moduleParentIds.set(module.key, existingParent.id);
      console.log(`  [skip] parent ja existe: ${name} (id ${existingParent.id})`);
      continue;
    }

    console.log(`  ${dryRun ? "[dry-run]" : "[live]"} parent: ${name}`);
    if (dryRun) {
      moduleParentIds.set(module.key, `dry-parent-${module.key}`);
      continue;
    }
    const description = moduleParentDescription(input, module, info);
    const created = await clickUp.request("POST", `/list/${listResult.list.id}/task`, {
      name,
      description,
      markdown_description: description,
      tags: moduleParentTags(module)
    });
    moduleParentIds.set(module.key, created.id);
    parentsCreated += 1;
  }

  // Phase 2: stage subtasks per module
  for (const module of input.modules) {
    const parentId = moduleParentIds.get(module.key);
    const plans = planTasksForModule(module, catalog);
    const info = functionalities.modules?.[module.key];
    const stageIdByKey = new Map();

    console.log(`\n> ${module.key} (parent ${parentId}, ${plans.length} subtask${plans.length === 1 ? "" : "s"})`);

    const existingSubtasks = existing.filter((task) => task.parent === parentId);

    for (const plan of plans) {
      const stageKey = plan.manual ? "manual_implementation" : plan.stage.key;
      const subName = stageSubtaskName({ key: stageKey });
      const existingSub = existingSubtasks.find((sub) => sub.name === subName);
      if (existingSub) {
        stageIdByKey.set(stageKey, existingSub.id);
        console.log(`    [skip] ja existe: ${subName} (id ${existingSub.id})`);
        continue;
      }

      console.log(`    ${dryRun ? "[dry-run]" : "[live]"} ${subName}`);
      if (dryRun) {
        stageIdByKey.set(stageKey, `dry-${module.key}-${stageKey}`);
        continue;
      }
      const description = stageSubtaskDescription(input, plan, parentId, info);
      const created = await clickUp.request("POST", `/list/${listResult.list.id}/task`, {
        name: subName,
        description,
        markdown_description: description,
        tags: stageSubtaskTags(plan),
        parent: parentId,
        due_date: dueTimestamp
      });
      stageIdByKey.set(stageKey, created.id);
      subtasksCreated += 1;
    }

    // queue dependencies
    if (!isManualModule(module)) {
      for (const plan of plans) {
        for (const dep of plan.stage.depends_on ?? []) {
          const childId = stageIdByKey.get(plan.stage.key);
          const parentDepId = stageIdByKey.get(dep);
          if (!childId || !parentDepId) continue;
          dependenciesQueue.push({
            moduleKey: module.key,
            childStage: plan.stage.key,
            depStage: dep,
            childId,
            parentDepId
          });
        }
      }
    }
  }

  // Phase 3: dependencies
  let depsCreated = 0;
  console.log(`\nDependencias para configurar: ${dependenciesQueue.length}`);
  for (const dep of dependenciesQueue) {
    console.log(`  ${dryRun ? "[dry-run]" : "[live]"} ${dep.moduleKey}: ${dep.childStage} depends_on ${dep.depStage}`);
    if (dryRun) continue;
    try {
      await clickUp.request("POST", `/task/${dep.childId}/dependency`, { depends_on: dep.parentDepId });
      depsCreated += 1;
    } catch (error) {
      if (error.message.includes("already exists") || error.message.includes("DEP_001")) {
        console.log(`     [skip] dependencia ja existe`);
      } else {
        throw error;
      }
    }
  }

  if (!dryRun) {
    console.log("");
    console.log(`Resumo:`);
    console.log(`  parents criados:   ${parentsCreated}`);
    console.log(`  subtasks criadas:  ${subtasksCreated}`);
    console.log(`  dependencias:      ${depsCreated}`);
    console.log(`URL: https://app.clickup.com/${teamId}/v/li/${listResult.list.id}`);
  }
}

await generate(payload).catch((error) => {
  console.error(error.message);
  process.exit(1);
});
