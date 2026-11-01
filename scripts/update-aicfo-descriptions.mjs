#!/usr/bin/env node

// Atualiza descricoes das tasks ja criadas em "05 Institucional Novais Digital / Plataforma Aicfo / Modulos"
// para incluir o titulo, resumo e funcionalidades em linguagem de negocios (CEO-friendly).
//
// Por que existe: o generate-aios-modules.mjs faz [skip] em tasks ja existentes, sem atualizar
// descricoes. Este script complementa, percorrendo as tasks existentes e fazendo PUT na API.
//
// Idempotente: pode rodar quantas vezes quiser. Sempre escreve a descricao gerada a partir do
// payload + aios-module-functionalities.json.
//
// Uso:
//   node scripts/update-aicfo-descriptions.mjs --dry-run                 # mostra o que vai mudar
//   node scripts/update-aicfo-descriptions.mjs --live                    # aplica via API
//   node scripts/update-aicfo-descriptions.mjs --live --module=ingest    # so um modulo

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createClickUpClient } from "./lib/clickup.mjs";
import { clickUpCredentials, loadLocalEnv, root } from "./lib/env.mjs";
import { findOrCreatePlatformFolder, findOrCreateModuleList, listAllTasks } from "./lib/aios-platform.mjs";
import {
  moduleParentDescription,
  moduleParentName,
  parseAiosTask,
  planTasksForModule,
  stageSubtaskDescription,
  stageSubtaskName
} from "./lib/aios-modules.mjs";

await loadLocalEnv();

const args = process.argv.slice(2);
const live = args.includes("--live");
const dryRun = !live || args.includes("--dry-run");
const moduleFilterArg = args.find((arg) => arg.startsWith("--module="));
const moduleFilter = moduleFilterArg ? moduleFilterArg.split("=")[1] : null;

const { token, teamId } = clickUpCredentials();
if (live && (!token || !teamId)) {
  console.error("Missing ClickUp credentials. Set NOVAIS_INTERNAL_CLICKUP_TOKEN + NOVAIS_INTERNAL_WORKSPACE_ID.");
  process.exit(1);
}
const clickUp = token && teamId ? createClickUpClient({ token }) : null;

const payloadPath = resolve(root, "examples/aicfo-modules.payload.json");
const functionalitiesPath = resolve(root, "config/aios-module-functionalities.json");
const catalogPath = resolve(root, "config/aios-module-catalog.json");

const [payload, functionalities, catalog] = await Promise.all([
  readFile(payloadPath, "utf8").then(JSON.parse),
  readFile(functionalitiesPath, "utf8").then(JSON.parse),
  readFile(catalogPath, "utf8").then(JSON.parse)
]);

const spaceName = "05 Institucional Novais Digital";
const folderName = payload.platform_name || "Plataforma Aicfo";
const listName = payload.list_name || "Modulos";

console.log(`Update Aicfo descriptions ${dryRun ? "(dry-run)" : "(LIVE)"}`);
console.log(`Cliente: ${payload.client_name}`);
console.log(`Folder: ${folderName} (em ${spaceName})`);
console.log(`List: ${listName}`);
console.log(`Modulos no payload: ${payload.modules.length}`);
if (moduleFilter) console.log(`Filtro: --module=${moduleFilter}`);
console.log("");

if (!clickUp) {
  console.log("[dry-run sem credenciais] vou apenas mostrar o que seria atualizado.");
  console.log("");
}

// 1. Localizar Folder + List
const folderResult = clickUp
  ? await findOrCreatePlatformFolder(clickUp, teamId, spaceName, folderName, { dryRun: true })
  : { folder: { id: "dry-folder" } };

const listResult = clickUp
  ? await findOrCreateModuleList(clickUp, folderResult.folder.id, listName, { dryRun: true })
  : { list: { id: "dry-list" } };

console.log(`> Folder: ${folderResult.folder.id}`);
console.log(`> List:   ${listResult.list.id}\n`);

// 2. Listar todas as tasks (parents + subtasks) com paginacao manual.
// listAllTasks da lib nao pagina; ClickUp retorna max 100 por pagina.
async function listAllTasksPaginated(clickUp, listId) {
  const all = [];
  let page = 0;
  while (true) {
    const data = await clickUp.request(
      "GET",
      `/list/${listId}/task?archived=false&subtasks=true&include_closed=true&page=${page}`
    );
    const tasks = data.tasks ?? [];
    all.push(...tasks);
    if (tasks.length < 100) break;
    page += 1;
    if (page > 20) {
      console.warn(`[warn] paginacao parou em page=${page} para evitar loop infinito`);
      break;
    }
  }
  return all;
}

const allTasks = clickUp ? await listAllTasksPaginated(clickUp, listResult.list.id) : [];
console.log(`> Tasks na list: ${allTasks.length}\n`);

const parentsByModuleKey = new Map();
const subtasksByParentId = new Map();
for (const task of allTasks) {
  const info = parseAiosTask(task);
  if (info.isModuleParent && info.moduleKey) {
    parentsByModuleKey.set(info.moduleKey, task);
  } else if (info.isStage && task.parent) {
    if (!subtasksByParentId.has(task.parent)) subtasksByParentId.set(task.parent, []);
    subtasksByParentId.get(task.parent).push(task);
  }
}

console.log(`> Parents indexados: ${parentsByModuleKey.size}`);
console.log(`> Parents com subtasks: ${subtasksByParentId.size}\n`);

// 3. Para cada modulo do payload, atualizar parent + subtasks
let updatedParents = 0;
let updatedSubtasks = 0;
let skippedParents = 0;
let skippedSubtasks = 0;
const errors = [];

for (const module of payload.modules) {
  if (moduleFilter && module.key !== moduleFilter) continue;

  const info = functionalities.modules?.[module.key];
  if (!info) {
    console.log(`[skip] ${module.key}: sem entry em aios-module-functionalities.json`);
    skippedParents += 1;
    continue;
  }

  const parentTask = parentsByModuleKey.get(module.key);
  if (!parentTask) {
    console.log(`[warn] ${module.key}: parent task nao encontrada na list`);
    skippedParents += 1;
    continue;
  }

  // Atualiza parent
  const parentDescription = moduleParentDescription(payload, module, info);
  console.log(`> ${module.key} (parent ${parentTask.id})`);
  console.log(`  novo titulo: ${moduleParentName(module, info)}`);

  if (dryRun) {
    console.log(`  [dry-run] PUT /task/${parentTask.id} (${parentDescription.length} chars)`);
  } else {
    try {
      await clickUp.request("PUT", `/task/${parentTask.id}`, {
        name: moduleParentName(module, info),
        description: parentDescription,
        markdown_description: parentDescription
      });
      console.log(`  [live] parent atualizado`);
      updatedParents += 1;
    } catch (err) {
      console.error(`  [error] parent ${module.key}: ${err.message}`);
      errors.push({ moduleKey: module.key, kind: "parent", error: err.message });
    }
  }

  // Atualiza subtasks
  const plans = planTasksForModule(module, catalog);
  const subtasks = subtasksByParentId.get(parentTask.id) ?? [];
  const subtasksByName = new Map(subtasks.map((t) => [t.name, t]));

  for (const plan of plans) {
    const stageKey = plan.manual ? "manual_implementation" : plan.stage.key;
    const subName = stageSubtaskName({ key: stageKey });
    const subtask = subtasksByName.get(subName);

    if (!subtask) {
      console.log(`    [warn] subtask nao encontrada: ${subName}`);
      skippedSubtasks += 1;
      continue;
    }

    const subDescription = stageSubtaskDescription(payload, plan, parentTask.id, info);

    if (dryRun) {
      console.log(`    [dry-run] PUT /task/${subtask.id} (${subName}, ${subDescription.length} chars)`);
    } else {
      try {
        await clickUp.request("PUT", `/task/${subtask.id}`, {
          description: subDescription,
          markdown_description: subDescription
        });
        console.log(`    [live] subtask atualizada: ${subName}`);
        updatedSubtasks += 1;
      } catch (err) {
        console.error(`    [error] subtask ${subName}: ${err.message}`);
        errors.push({ moduleKey: module.key, kind: "subtask", subName, error: err.message });
      }
    }
  }
  console.log("");
}

// 4. Resumo
console.log("---");
console.log(`Resumo ${dryRun ? "(dry-run)" : "(live)"}:`);
console.log(`  parents atualizados:  ${updatedParents}`);
console.log(`  subtasks atualizadas: ${updatedSubtasks}`);
console.log(`  parents skipados:     ${skippedParents}`);
console.log(`  subtasks skipadas:    ${skippedSubtasks}`);
if (errors.length) {
  console.log(`  ERROS:                ${errors.length}`);
  for (const err of errors) {
    console.log(`    - ${err.moduleKey} ${err.kind} ${err.subName ?? ""}: ${err.error}`);
  }
  process.exit(1);
}

if (dryRun && live) {
  console.log("\n[dry-run] Para aplicar, rode: node scripts/update-aicfo-descriptions.mjs --live");
}
