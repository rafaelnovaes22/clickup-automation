#!/usr/bin/env node

import { createHmac, timingSafeEqual } from "node:crypto";
import http from "node:http";
import { createClickUpClient } from "./scripts/lib/clickup.mjs";
import { agentRequestToPayload, createTechTasksFromPayload, findAgentRequestTask, generatedStatus, shouldProcessAgentRequest } from "./scripts/lib/agent-request.mjs";
import { clickUpCredentials, loadLocalEnv } from "./scripts/lib/env.mjs";

await loadLocalEnv();

const port = Number(process.env.PORT ?? 3000);
const nodeEnv = (process.env.NODE_ENV ?? "development").toLowerCase();
const isProduction = nodeEnv === "production";
const webhookSecret = process.env.CLICKUP_WEBHOOK_SECRET;

if (isProduction && !webhookSecret) {
  console.error("FATAL: CLICKUP_WEBHOOK_SECRET is required when NODE_ENV=production. Refusing to start without signature verification.");
  process.exit(1);
}

if (!webhookSecret) {
  console.warn("[warn] CLICKUP_WEBHOOK_SECRET is not set; webhook signature verification is DISABLED. Allowed only in non-production.");
}

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

  let expectedBuffer;
  let receivedBuffer;
  try {
    expectedBuffer = Buffer.from(expected, "hex");
    receivedBuffer = Buffer.from(received, "hex");
  } catch {
    return false;
  }

  if (expectedBuffer.length !== receivedBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, receivedBuffer);
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

  let payload;
  try {
    payload = rawBody.length ? JSON.parse(rawBody.toString("utf8")) : {};
  } catch (parseError) {
    jsonResponse(response, 400, { ok: false, error: "Invalid JSON body" });
    return;
  }

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
  const result = await createTechTasksFromPayload(clickUp, teamId, techPayload, { idempotencyKey: task.id });

  if (result.alreadyGenerating) {
    jsonResponse(response, 202, { ok: true, skipped: "Task is already being processed (idempotency lock)" });
    return;
  }

  await clickUp.request("POST", `/task/${task.id}/comment`, {
    comment_text: [
      "Backlog tecnico gerado automaticamente a partir desta solicitacao.",
      `Tasks criadas: ${result.created.length}`,
      `Tasks ja existentes: ${result.existing.length}`,
      `Idempotency key: ${task.id}`,
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
    const errorPayload = isProduction
      ? { ok: false, error: "Internal server error" }
      : { ok: false, error: error.message ?? "Internal server error" };
    jsonResponse(response, 500, errorPayload);
  }
});

server.listen(port, () => {
  console.log(`ClickUp Novais Digital webhook backend listening on :${port} (NODE_ENV=${nodeEnv})`);
});
