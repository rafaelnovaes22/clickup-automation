import { readFile } from "node:fs/promises";
import { loadTechConfig } from "./agent-request.mjs";
import {
  selectedPlatforms,
  taskDescription,
  taskName,
  validatePayload,
} from "./tech-tasks.mjs";
import { renderBriefing } from "./briefing-view.mjs";

const MAX_BODY_BYTES = 16_384;

/** @param {import('node:http').IncomingMessage} request @returns {Promise<URLSearchParams>} */
async function readForm(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES)
      throw new Error("Briefing excede o limite de 16 KB.");
    chunks.push(chunk);
  }
  return new URLSearchParams(Buffer.concat(chunks).toString("utf8"));
}

/** @param {URLSearchParams} fields @returns {Record<string, string|string[]>} */
export function briefingPayload(fields) {
  const payload = Object.fromEntries(fields);
  payload.technical_platforms = fields.getAll("technical_platforms");
  for (const field of [
    "client_name",
    "client_task_id",
    "tech_owner",
    "delivery_due_date",
    "environment",
  ]) {
    if (!String(payload[field] ?? "").trim())
      throw new Error(`Preencha o campo ${field}.`);
  }
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(payload.delivery_due_date) ||
    new Date(payload.delivery_due_date).toISOString().slice(0, 10) !==
      payload.delivery_due_date
  ) {
    throw new Error("Informe uma data de entrega válida.");
  }
  if (!["dev", "staging", "prod"].includes(payload.environment))
    throw new Error("Ambiente inválido.");
  return payload;
}

/** @param {Record<string, string|string[]>} payload @returns {Promise<object[]>} */
export async function previewBacklog(payload) {
  const { platformCatalog, contract } = await loadTechConfig();
  validatePayload(payload, contract);
  return selectedPlatforms(payload, platformCatalog).flatMap((platform) =>
    platform.tasks.map((task) => ({
      name: taskName(payload, platform, task),
      description: taskDescription(payload, platform, task),
      artifact: task.artifact,
      doneWhen: task.doneWhen,
    })),
  );
}

/** @param {import('node:http').ServerResponse} response @param {number} status @param {string} html @returns {void} */
function sendPage(response, status, html) {
  response.writeHead(status, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
    "Content-Security-Policy":
      "default-src 'none'; style-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
    "X-Content-Type-Options": "nosniff",
  });
  response.end(html);
}

/** @param {import('node:http').IncomingMessage} request @param {import('node:http').ServerResponse} response @returns {Promise<boolean>} */
export async function serveBriefing(request, response) {
  if (request.method === "GET" && request.url === "/briefing.css") {
    response.writeHead(200, { "Content-Type": "text/css; charset=utf-8" });
    response.end(
      await readFile(new URL("../../public/briefing.css", import.meta.url)),
    );
    return true;
  }
  const isForm = request.method === "POST" && request.url === "/preview";
  if (!isForm && !(request.method === "GET" && request.url === "/"))
    return false;
  const { platformCatalog } = await loadTechConfig();
  try {
    const payload = isForm ? briefingPayload(await readForm(request)) : {};
    const tasks = isForm ? await previewBacklog(payload) : [];
    sendPage(
      response,
      200,
      renderBriefing(platformCatalog.platforms, payload, tasks),
    );
  } catch (error) {
    sendPage(
      response,
      400,
      renderBriefing(platformCatalog.platforms, {}, [], error.message),
    );
  }
  return true;
}
