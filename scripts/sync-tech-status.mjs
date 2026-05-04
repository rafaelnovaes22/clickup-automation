#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createClickUpClient, findListByTarget, listTasks } from "./lib/clickup.mjs";
import { clickUpCredentials, githubToken, loadLocalEnv, root } from "./lib/env.mjs";
import { collectEvidence, createGitHubClient, decideStatus, formatEvidenceComment } from "./lib/github-evidence.mjs";
import { canonicalStatus, parseTechTask } from "./lib/tech-tasks.mjs";

const contractPath = resolve(root, "config/tech-automation-contract.json");
const defaultFixturePath = resolve(root, "examples/clickup-tech-tasks.fixture.json");

const args = process.argv.slice(2);
const live = args.includes("--live");
const dryRun = !live || args.includes("--dry-run");
const offline = args.includes("--offline");
const commentAlways = args.includes("--comment-always");
const clientArg = args.find((arg) => arg.startsWith("--client="));
const fixtureArg = args.find((arg) => arg.startsWith("--fixture="));
const clientFilter = clientArg ? clientArg.slice("--client=".length).toLowerCase() : null;
const fixturePath = fixtureArg ? resolve(root, fixtureArg.slice("--fixture=".length)) : defaultFixturePath;

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
  const info = parseTechTask(task);
  const evidence = await collectEvidence(info, { githubClient: github, offline });
  const nextStatus = decideStatus(evidence);
  const shouldUpdateStatus = canonicalStatus(info.status) !== nextStatus;
  const shouldComment = commentAlways || shouldUpdateStatus;
  const comment = formatEvidenceComment(info, evidence, nextStatus);

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
const techTasks = tasks
  .filter((task) => task.name.startsWith("[TECH]"))
  .filter((task) => {
    if (!clientFilter) return true;
    return parseTechTask(task).clientName.toLowerCase().includes(clientFilter);
  });

console.log(`Tech status sync ${dryRun ? "(dry-run)" : "(live)"}`);
console.log(`Fonte: ${source}`);
console.log(`Tarefas: ${techTasks.length}\n`);

for (const task of techTasks) {
  await syncTask(task);
}

if (!techTasks.length) {
  console.log("Nenhuma tarefa [TECH] encontrada para o filtro informado.");
}
