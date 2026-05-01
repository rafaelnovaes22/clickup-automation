#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const API_BASE = "https://api.clickup.com/api/v2";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, ".env");
const contractPath = resolve(root, "config/tech-automation-contract.json");

const args = process.argv.slice(2);
const clientArg = args.find((arg) => arg.startsWith("--client="));
const clientFilter = clientArg ? clientArg.slice("--client=".length).toLowerCase() : null;

await loadLocalEnv();

const token = process.env.CLICKUP_TOKEN ?? process.env.ACME_INTERNAL_CLICKUP_TOKEN;
const teamId = process.env.CLICKUP_TEAM_ID ?? process.env.ACME_INTERNAL_WORKSPACE_ID;
const contract = JSON.parse(await readFile(contractPath, "utf8"));

if (!token || !teamId) {
  console.error("Missing ClickUp credentials.");
  process.exit(1);
}

const headers = {
  Authorization: token,
  "Content-Type": "application/json"
};

async function loadLocalEnv() {
  let content;
  try {
    content = await readFile(envPath, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return;
    throw error;
  }

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) process.env[key] = value;
  }
}

async function request(method, path) {
  const response = await fetch(`${API_BASE}${path}`, { method, headers });
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};

  if (!response.ok) {
    throw new Error(`${method} ${path} failed (${response.status}): ${text}`);
  }

  return data;
}

async function findBacklogList() {
  const spaces = (await request("GET", `/team/${teamId}/space?archived=false`)).spaces ?? [];
  const space = spaces.find((item) => item.name === contract.target.space);
  if (!space) throw new Error(`Space not found: ${contract.target.space}`);

  const lists = (await request("GET", `/space/${space.id}/list?archived=false`)).lists ?? [];
  const list = lists.find((item) => item.name === contract.target.list);
  if (!list) throw new Error(`List not found: ${contract.target.space} / ${contract.target.list}`);

  return list;
}

function clientNameFromTask(task) {
  const match = task.name.match(/^\[TECH\]\s+(.+?)\s+\/\s+/);
  return match?.[1] ?? "Sem cliente";
}

function statusWeight(status) {
  const normalized = String(status ?? "").toLowerCase();
  const rule = contract.progressRules.find((item) => item.status === normalized);
  if (rule) return rule.weight;

  if (["complete", "closed", "done"].includes(normalized)) return 100;
  if (normalized.includes("review")) return 70;
  if (normalized.includes("progress")) return 35;
  return 0;
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
    const weights = clientTasks.map((task) => statusWeight(task.status?.status));
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
const tasks = (await request("GET", `/list/${list.id}/task?archived=false&subtasks=false&include_closed=true`)).tasks ?? [];
summarize(tasks.filter((task) => task.name.startsWith("[TECH]")));
