#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createClickUpClient } from "./lib/clickup.mjs";
import { clickUpCredentials, githubToken, loadLocalEnv, root } from "./lib/env.mjs";
import { collectEvidence, createGitHubClient } from "./lib/github-evidence.mjs";
import {
  canonicalAiosStatus,
  collectAiosEvidence,
  decideStatusForManualTask,
  decideStatusFromAiosEvidence,
  formatAiosEvidenceComment,
  isBlockedSignal
} from "./lib/aios-evidence.mjs";
import { parseAiosTask } from "./lib/aios-modules.mjs";
import {
  currentStageFromSubtasks,
  findOrCreatePlatformFolder,
  indexSubtasksByParent,
  listAllTasks,
  rollupParentStatus
} from "./lib/aios-platform.mjs";

const contractPath = resolve(root, "config/aios-pipeline-contract.json");

const args = process.argv.slice(2);
const live = args.includes("--live");
const dryRun = !live || args.includes("--dry-run");
const offline = args.includes("--offline");
const commentAlways = args.includes("--comment-always");
const platformArg = args.find((arg) => arg.startsWith("--platform="));
const moduleArg = args.find((arg) => arg.startsWith("--module="));
const fixtureArg = args.find((arg) => arg.startsWith("--fixture="));

const platformOverride = platformArg ? platformArg.slice("--platform=".length) : null;
const moduleFilter = moduleArg ? moduleArg.slice("--module=".length).toLowerCase() : null;
const fixturePath = fixtureArg ? resolve(root, fixtureArg.slice("--fixture=".length)) : null;

await loadLocalEnv();

const { token, teamId } = clickUpCredentials();
const contract = JSON.parse(await readFile(contractPath, "utf8"));
const clickUp = token ? createClickUpClient({ token }) : null;
const github = createGitHubClient({ token: githubToken() });

if (live && offline) {
  console.error("--live and --offline cannot be used together.");
  process.exit(1);
}

if (!offline && (!token || !teamId)) {
  console.error("Missing ClickUp credentials.");
  process.exit(1);
}

async function loadPlatformTasks() {
  if (offline) {
    if (!fixturePath) throw new Error("--offline requires --fixture=<path>");
    const fixture = JSON.parse(await readFile(fixturePath, "utf8"));
    return {
      source: `fixture ${fixturePath}`,
      tasks: fixture.tasks ?? [],
      listId: null
    };
  }

  const spaceName = contract.target?.space ?? "05 Institucional Novais Digital";
  const folderName = platformOverride;
  if (!folderName) {
    throw new Error("--platform=<folder name> e obrigatorio em modo online (ex: --platform=\"Plataforma SchoolPlatform\")");
  }

  const folderResult = await findOrCreatePlatformFolder(clickUp, teamId, spaceName, folderName);
  if (folderResult.created) {
    throw new Error(`Folder "${folderName}" nao existe ainda - rode aios:generate primeiro`);
  }

  // Find the only list inside (or first one named "Modulos")
  const lists = await clickUp.request("GET", `/folder/${folderResult.folder.id}/list?archived=false`);
  const list = (lists.lists ?? []).find((l) => l.name === "Modulos") ?? (lists.lists ?? [])[0];
  if (!list) {
    throw new Error(`Nenhuma list encontrada na folder "${folderName}"`);
  }

  return {
    source: `${spaceName} / ${folderName} / ${list.name}`,
    tasks: await listAllTasks(clickUp, list.id),
    listId: list.id
  };
}

async function syncSubtask(task) {
  const info = parseAiosTask(task);

  // Para Tier C (manual), tenta _review_{module}.md como evidência suplementar.
  // Se o review estiver aprovado, usa o mesmo decisor dos stages AIOS — isso permite
  // que módulos manuais com spec+review formalizados apareçam como "em revisão" no ClickUp.
  const githubArgs = { githubClient: github, repositoryUrl: info.repositoryUrl };

  const manualReviewEvidence = info.isManual && (info.projectRoot || info.repositoryUrl)
    ? await collectAiosEvidence({ module: info.moduleKey, stage: "review", projectRoot: info.projectRoot, ...githubArgs })
    : null;

  const evidence = info.isManual
    ? (manualReviewEvidence?.found
        ? manualReviewEvidence
        : { found: false, stage: "manual_implementation", module: info.moduleKey, reason: "tarefa manual - sem artefato AIOS" })
    : await collectAiosEvidence({ module: info.moduleKey, stage: info.stageKey, projectRoot: info.projectRoot, ...githubArgs });

  const githubEvidence = await collectEvidence(
    {
      clientName: info.clientName,
      platformKey: info.moduleKey,
      taskKey: info.stageKey,
      clientTaskId: info.clientTaskId,
      repositoryUrl: info.repositoryUrl
    },
    { githubClient: github, offline }
  );

  // Para Tier C com review aprovado, "merged" é implícito (sem branch/PR separada —
  // o trabalho vai direto para main). Simula githubEvidence com merged=true para
  // que decideStatusFromAiosEvidence retorne "complete" quando reviewApproved + CI ok.
  const githubEvidenceForManual = (info.isManual && manualReviewEvidence?.reviewApproved)
    ? { ...githubEvidence, prs: [{ merged_at: new Date().toISOString(), state: "closed", number: 0, updated_at: new Date().toISOString() }, ...(githubEvidence?.prs ?? [])] }
    : githubEvidence;

  const nextStatus = info.isManual
    ? (manualReviewEvidence?.found
        ? decideStatusFromAiosEvidence(evidence, githubEvidenceForManual)
        : decideStatusForManualTask(githubEvidence))
    : decideStatusFromAiosEvidence(evidence, githubEvidence);

  const blocked = isBlockedSignal(evidence, githubEvidence);
  const shouldUpdateStatus = canonicalAiosStatus(info.status) !== nextStatus;
  const shouldComment = commentAlways || shouldUpdateStatus || blocked;
  const comment = formatAiosEvidenceComment(info, evidence, githubEvidence, nextStatus, { blocked });

  console.log(`${dryRun ? "[dry-run]" : "[live]"} ${task.name}`);
  console.log(`  ${info.status || "sem status"} -> ${nextStatus}`);

  if (dryRun) {
    console.log(comment.split("\n").map((line) => `  ${line}`).join("\n"));
    return { taskId: info.id, parentId: info.parentTaskId, info, nextStatus };
  }

  if (shouldUpdateStatus) {
    try {
      await clickUp.request("PUT", `/task/${info.id}`, { status: nextStatus });
    } catch (error) {
      if (error.message.includes("STATUS_001") || /status.*not found/i.test(error.message)) {
        console.warn(`     ! status "${nextStatus}" nao existe na list - configurar via UI. Mantendo status atual.`);
      } else {
        throw error;
      }
    }
  }

  if (shouldComment) {
    await clickUp.request("POST", `/task/${info.id}/comment`, {
      comment_text: comment,
      notify_all: false
    });
  }

  return { taskId: info.id, parentId: info.parentTaskId, info, nextStatus };
}

async function rollupParent(parent, subtaskResults) {
  const parentInfo = parseAiosTask(parent);
  if (!subtaskResults.length) return;

  const subtaskInfos = subtaskResults.map((r) => ({ stageKey: r.info.stageKey, status: r.nextStatus }));
  const newStatus = rollupParentStatus(subtaskInfos);
  const currentStage = currentStageFromSubtasks(subtaskInfos);
  const currentStatus = canonicalAiosStatus(parentInfo.status);

  if (newStatus === null || newStatus === currentStatus) {
    console.log(`  parent ${parent.name}: ${currentStatus || "sem status"} (sem mudanca)`);
    return;
  }

  console.log(`${dryRun ? "[dry-run]" : "[live]"} parent ${parent.name}`);
  console.log(`  ${currentStatus || "sem status"} -> ${newStatus}${currentStage ? ` (stage atual: ${currentStage})` : ""}`);

  if (dryRun) return;
  await clickUp.request("PUT", `/task/${parent.id}`, { status: newStatus });
}

const { source, tasks, listId } = await loadPlatformTasks();
const parents = tasks.filter((task) => !task.parent);
const subtasks = tasks.filter((task) => task.parent);

const filtered = subtasks.filter((task) => {
  const info = parseAiosTask(task);
  if (moduleFilter && (!info.moduleKey || !info.moduleKey.toLowerCase().includes(moduleFilter))) return false;
  return true;
});

console.log(`AIOS status sync ${dryRun ? "(dry-run)" : "(live)"}`);
console.log(`Fonte: ${source}`);
console.log(`Parents: ${parents.length} | Subtasks alvo: ${filtered.length}\n`);

const subtaskResults = [];
for (const task of filtered) {
  const result = await syncSubtask(task);
  subtaskResults.push(result);
}

// Rollup parents
const subsByParent = indexSubtasksByParent([...filtered, ...subtaskResults.map((r) => ({ id: r.taskId, parent: r.parentId }))]);
const resultsByParent = new Map();
for (const r of subtaskResults) {
  if (!r.parentId) continue;
  const list = resultsByParent.get(r.parentId) ?? [];
  list.push(r);
  resultsByParent.set(r.parentId, list);
}

console.log(`\nRollup de status nos parents:`);
for (const parent of parents) {
  if (moduleFilter) {
    const info = parseAiosTask(parent);
    if (!info.moduleKey || !info.moduleKey.toLowerCase().includes(moduleFilter)) continue;
  }
  const childResults = resultsByParent.get(parent.id) ?? [];
  await rollupParent(parent, childResults);
}

if (!filtered.length) {
  console.log("Nenhuma subtask AIOS encontrada para o filtro informado.");
}

if (listId) {
  console.log(`\nURL: https://app.clickup.com/${teamId}/v/li/${listId}`);
}
