import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { findListByTarget, listTasks } from "./clickup.mjs";
import { root } from "./env.mjs";
import { selectedPlatforms, taskDescription, taskName, validatePayload } from "./tech-tasks.mjs";

export const agentRequestTarget = {
  space: "05 Institucional Acme",
  list: "Solicitacoes de agente"
};

export const generatedStatus = "gerado";
export const readyStatus = "escopo pronto";

const platformCatalogPath = resolve(root, "config/tech-platform-catalog.json");
const contractPath = resolve(root, "config/tech-automation-contract.json");

export async function loadTechConfig() {
  return {
    platformCatalog: JSON.parse(await readFile(platformCatalogPath, "utf8")),
    contract: JSON.parse(await readFile(contractPath, "utf8"))
  };
}

export function customFieldValue(task, fieldName) {
  const field = (task.custom_fields ?? []).find((item) => item.name === fieldName);
  if (!field || field.value === null || field.value === undefined) return null;

  if (field.type === "drop_down") {
    const options = field.type_config?.options ?? [];
    const selected = options.find((option) =>
      option.id === field.value ||
      option.orderindex === field.value ||
      String(option.orderindex) === String(field.value)
    );
    return selected?.name ?? String(field.value);
  }

  if (field.type === "date") {
    const date = new Date(Number(field.value));
    if (!Number.isNaN(date.getTime())) return date.toISOString().slice(0, 10);
  }

  return String(field.value);
}

function splitPlatforms(value) {
  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function agentRequestToPayload(task) {
  const clientName = customFieldValue(task, "Cliente") ?? task.name.replace(/^\[AGENTE\]\s*/i, "").trim();
  const technicalPlatforms = splitPlatforms(customFieldValue(task, "Plataformas tecnicas"));

  return {
    client_name: clientName,
    client_task_id: task.id,
    technical_platforms: technicalPlatforms,
    tech_owner: customFieldValue(task, "Responsavel tecnico") ?? "AI Engineer",
    delivery_due_date: customFieldValue(task, "Prazo desejado"),
    repository_url: customFieldValue(task, "Repositorio"),
    environment: customFieldValue(task, "Ambiente") ?? "dev",
    notes: [
      `Solicitacao de agente: ${task.name}`,
      customFieldValue(task, "Problema de negocio") ? `Problema: ${customFieldValue(task, "Problema de negocio")}` : null,
      customFieldValue(task, "Outcome esperado") ? `Outcome: ${customFieldValue(task, "Outcome esperado")}` : null,
      customFieldValue(task, "Tipo de agente") ? `Tipo: ${customFieldValue(task, "Tipo de agente")}` : null,
      customFieldValue(task, "Canal principal") ? `Canal: ${customFieldValue(task, "Canal principal")}` : null,
      customFieldValue(task, "Nivel de autonomia") ? `Autonomia: ${customFieldValue(task, "Nivel de autonomia")}` : null,
      customFieldValue(task, "Quando chamar humano") ? `Handoff: ${customFieldValue(task, "Quando chamar humano")}` : null,
      customFieldValue(task, "Metrica de sucesso") ? `Metrica: ${customFieldValue(task, "Metrica de sucesso")}` : null
    ].filter(Boolean).join("\n")
  };
}

export async function findAgentRequestTask(clickUp, teamId, taskId) {
  const list = await findListByTarget(clickUp, teamId, agentRequestTarget);
  const task = await clickUp.request("GET", `/task/${taskId}`).catch(() => null);
  if (!task) return null;
  if (task.list?.id && String(task.list.id) !== String(list.id)) return null;
  if (!task.list?.id) {
    const tasks = await listTasks(clickUp, list.id);
    if (!tasks.some((item) => item.id === taskId)) return null;
  }
  return task;
}

export async function existingTaskNames(clickUp, listId) {
  const tasks = await listTasks(clickUp, listId);
  return new Set(tasks.map((task) => task.name));
}

export async function createTechTasksFromPayload(clickUp, teamId, input, { dryRun = false } = {}) {
  const { platformCatalog, contract } = await loadTechConfig();
  validatePayload(input, contract);

  const platforms = selectedPlatforms(input, platformCatalog);
  const planned = platforms.flatMap((platform) =>
    platform.tasks.map((task) => ({ platform, task }))
  );

  const list = dryRun
    ? { id: "dry-backlog" }
    : await findListByTarget(clickUp, teamId, contract.target);
  const existingNames = dryRun ? new Set() : await existingTaskNames(clickUp, list.id);
  const result = {
    created: [],
    existing: [],
    planned: planned.length
  };

  for (const item of planned) {
    const name = taskName(input, item.platform, item.task);
    if (existingNames.has(name)) {
      result.existing.push(name);
      continue;
    }

    result.created.push(name);
    if (dryRun) continue;

    await clickUp.request("POST", `/list/${list.id}/task`, {
      name,
      description: taskDescription(input, item.platform, item.task),
      due_date: Date.parse(`${input.delivery_due_date}T23:59:59.000Z`),
      tags: ["ia-gerado", "revisao-humana"]
    });
  }

  return result;
}

export function shouldProcessAgentRequest(task) {
  return String(task.status?.status ?? "").toLowerCase() === readyStatus;
}
