#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createClickUpClient, findListByTarget, listTasks } from "./lib/clickup.mjs";
import { clickUpCredentials, loadLocalEnv, root } from "./lib/env.mjs";
import { clientNameFromTask, statusWeight } from "./lib/tech-tasks.mjs";

const contractPath = resolve(root, "config/tech-automation-contract.json");

const args = process.argv.slice(2);
const clientArg = args.find((arg) => arg.startsWith("--client="));
const clientFilter = clientArg ? clientArg.slice("--client=".length).toLowerCase() : null;

await loadLocalEnv();

const { token, teamId } = clickUpCredentials();
const contract = JSON.parse(await readFile(contractPath, "utf8"));
const clickUp = createClickUpClient({ token });

if (!token || !teamId) {
  console.error("Missing ClickUp credentials.");
  process.exit(1);
}

async function findBacklogList() {
  return findListByTarget(clickUp, teamId, contract.target);
}

function summarize(tasks) {
  const byClient = new Map();

  for (const task of tasks) {
    const client = clientNameFromTask(task);
    if (clientFilter && !client.toLowerCase().includes(clientFilter)) continue;

    if (!byClient.has(client)) byClient.set(client, []);
    byClient.get(client).push(task);
  }

  for (const [client, clientTasks] of byClient.entries()) {
    const weights = clientTasks.map((task) => statusWeight(task.status?.status, contract));
    const progress = Math.round(weights.reduce((sum, value) => sum + value, 0) / weights.length);
    const blocked = clientTasks.filter((task) => String(task.status?.status ?? "").toLowerCase() === "bloqueado");

    console.log(`Cliente: ${client}`);
    console.log(`Progresso tecnico: ${progress}%`);
    console.log(`Tarefas: ${clientTasks.length}`);
    if (blocked.length) console.log(`Bloqueadas: ${blocked.length}`);

    for (const task of clientTasks) {
      console.log(`- ${task.name.replace(/^\[TECH\]\s+/, "")}: ${task.status?.status ?? "sem status"}`);
    }
    console.log("");
  }

  if (!byClient.size) {
    console.log("Nenhuma tarefa [TECH] encontrada para o filtro informado.");
  }
}

const list = await findBacklogList();
const tasks = await listTasks(clickUp, list.id);
summarize(tasks.filter((task) => task.name.startsWith("[TECH]")));
