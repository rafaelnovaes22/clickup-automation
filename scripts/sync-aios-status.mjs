#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createClickUpClient, findListByTarget, listTasks } from "./lib/clickup.mjs";
import { clickUpCredentials, githubToken, loadLocalEnv, root } from "./lib/env.mjs";
import { collectEvidence, createGitHubClient } from "./lib/github-evidence.mjs";
import {
  collectAiosEvidence,
  decideStatusForManualTask,
  decideStatusFromAiosEvidence,
  formatAiosEvidenceComment
} from "./lib/aios-evidence.mjs";
import { parseAiosTask } from "./lib/aios-modules.mjs";
import { canonicalStatus } from "./lib/tech-tasks.mjs";

const contractPath = resolve(root, "config/aios-pipeline-contract.json");

const args = process.argv.slice(2);
const live = args.includes("--live");
const dryRun = !live || args.includes("--dry-run");
const offline = args.includes("--offline");
const commentAlways = args.includes("--comment-always");
const clientArg = args.find((arg) => arg.startsWith("--client="));
const moduleArg = args.find((arg) => arg.startsWith("--module="));
const fixtureArg = args.find((arg) => arg.startsWith("--fixture="));

const clientFilter = clientArg ? clientArg.slice("--client=".length).toLowerCase() : null;
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

async function loadTasks() {
  if (offline) {
    if (!fixturePath) {
      throw new Error("--offline requires --fixture=<path>");
    }
    const fixture = JSON.parse(await readFile(fixturePath, "utf8"));
    return {
      source: `fixture ${fixturePath}`,
      tasks: fixture.tasks ?? []
    };
  }

  const list = await findListByTarget(clickUp, teamId, contract.target);
  return {
    source: `${contract.target.space} / ${contract.target.list}`,
    tasks: await listTasks(clickUp, list.id)
  };
}

async function syncTask(task) {
  const info = parseAiosTask(task);
  const evidence = info.isManual
    ? { found: false, stage: "manual_implementation", module: info.moduleKey, reason: "tarefa manual - sem artefato AIOS" }
    : collectAiosEvidence({ module: info.moduleKey, stage: info.stageKey, projectRoot: info.projectRoot });

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

  const nextStatus = info.isManual
    ? decideStatusForManualTask(githubEvidence)
    : decideStatusFromAiosEvidence(evidence, githubEvidence);

  const shouldUpdateStatus = canonicalStatus(info.status) !== nextStatus;
  const shouldComment = commentAlways || shouldUpdateStatus;
  const comment = formatAiosEvidenceComment(info, evidence, githubEvidence, nextStatus);

  console.log(`${dryRun ? "[dry-run]" : "[live]"} ${info.name}`);
  console.log(`  ${info.status || "sem status"} -> ${nextStatus}`);

  if (dryRun) {
    console.log(comment.split("\n").map((line) => `  ${line}`).join("\n"));
    return;
  }

  if (shouldUpdateStatus) {
    await clickUp.request("PUT", `/task/${info.id}`, { status: nextStatus });
  }

  if (shouldComment) {
    await clickUp.request("POST", `/task/${info.id}/comment`, {
      comment_text: comment,
      notify_all: false
    });
  }
}

const { source, tasks } = await loadTasks();
const aiosTasks = tasks
  .filter((task) => task.name.startsWith("[AIOS]") || task.name.startsWith("[MANUAL]"))
  .filter((task) => {
    const parsed = parseAiosTask(task);
    if (clientFilter && !parsed.clientName.toLowerCase().includes(clientFilter)) return false;
    if (moduleFilter && (!parsed.moduleKey || !parsed.moduleKey.toLowerCase().includes(moduleFilter))) return false;
    return true;
  });

console.log(`AIOS status sync ${dryRun ? "(dry-run)" : "(live)"}`);
console.log(`Fonte: ${source}`);
console.log(`Tarefas: ${aiosTasks.length}\n`);

for (const task of aiosTasks) {
  await syncTask(task);
}

if (!aiosTasks.length) {
  console.log("Nenhuma tarefa [AIOS] ou [MANUAL] encontrada para o filtro informado.");
}
