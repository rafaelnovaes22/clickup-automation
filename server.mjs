#!/usr/bin/env node

import { createHmac, timingSafeEqual } from "node:crypto";
import http from "node:http";
import { createClickUpClient } from "./scripts/lib/clickup.mjs";
import { agentRequestToPayload, createTechTasksFromPayload, findAgentRequestTask, generatedStatus, shouldProcessAgentRequest } from "./scripts/lib/agent-request.mjs";
import { clickUpCredentials, loadLocalEnv } from "./scripts/lib/env.mjs";

await loadLocalEnv();

const port = Number(process.env.PORT ?? 3000);
const webhookSecret = process.env.CLICKUP_WEBHOOK_SECRET;
const { token, teamId } = clickUpCredentials();
const clickUp = createClickUpClient({ token });

function jsonResponse(response, statusCode, body) {
  response.writeHead(statusCode, { "Content-Type": "application/json" });
  response.end(JSON.stringify(body));
}

async function readBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return Buffer.concat(chunks);
}

function verifyClickUpSignature(request, body) {
  if (!webhookSecret) return true;
  const signature = request.headers["x-signature"];
  if (!signature || Array.isArray(signature)) return false;

  const expected = createHmac("sha256", webhookSecret).update(body).digest("hex");
  const received = signature.replace(/^sha256=/, "");
  const expectedBuffer = Buffer.from(expected, "hex");
  const receivedBuffer = Buffer.from(received, "hex");

  return expectedBuffer.length === receivedBuffer.length && timingSafeEqual(expectedBuffer, receivedBuffer);
}

function taskIdFromWebhook(payload) {
  return payload.task_id ?? payload.taskId ?? payload.history_items?.[0]?.task_id ?? payload.history_items?.[0]?.parent_id;
}

async function handleClickUpWebhook(request, response) {
  if (!token || !teamId) {
    jsonResponse(response, 500, { ok: false, error: "Missing ClickUp credentials" });
    return;
  }

  const rawBody = await readBody(request);
  if (!verifyClickUpSignature(request, rawBody)) {
    jsonResponse(response, 401, { ok: false, error: "Invalid ClickUp signature" });
    return;
  }

  const payload = rawBody.length ? JSON.parse(rawBody.toString("utf8")) : {};
  const taskId = taskIdFromWebhook(payload);
  if (!taskId) {
    jsonResponse(response, 202, { ok: true, skipped: "No task id in webhook payload" });
    return;
  }

  const task = await findAgentRequestTask(clickUp, teamId, taskId);
  if (!task) {
    jsonResponse(response, 202, { ok: true, skipped: "Task is not in Solicitacoes de agente" });
    return;
  }

  if (!shouldProcessAgentRequest(task)) {
    jsonResponse(response, 202, { ok: true, skipped: `Status is ${task.status?.status ?? "unknown"}` });
    return;
  }

  const techPayload = agentRequestToPayload(task);
  const result = await createTechTasksFromPayload(clickUp, teamId, techPayload);

  await clickUp.request("POST", `/task/${task.id}/comment`, {
    comment_text: [
      "Backlog tecnico gerado automaticamente a partir desta solicitacao.",
      `Tasks criadas: ${result.created.length}`,
      `Tasks ja existentes: ${result.existing.length}`,
      "",
      ...result.created.map((name) => `- ${name}`)
    ].join("\n"),
    notify_all: false
  });

  await clickUp.request("PUT", `/task/${task.id}`, { status: generatedStatus });

  jsonResponse(response, 200, {
    ok: true,
    task_id: task.id,
    created: result.created.length,
    existing: result.existing.length
  });
}

const server = http.createServer(async (request, response) => {
  try {
    if (request.method === "GET" && request.url === "/health") {
      jsonResponse(response, 200, { ok: true });
      return;
    }

    if (request.method === "POST" && request.url === "/webhooks/clickup") {
      await handleClickUpWebhook(request, response);
      return;
    }

    jsonResponse(response, 404, { ok: false, error: "Not found" });
  } catch (error) {
    console.error(error);
    jsonResponse(response, 500, { ok: false, error: error.message });
  }
});

server.listen(port, () => {
  console.log(`ClickUp Acme webhook backend listening on :${port}`);
});
