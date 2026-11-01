import assert from "node:assert/strict";
import { createServer } from "node:http";
import { after, before, test } from "node:test";
import { serveBriefing } from "../scripts/lib/briefing-web.mjs";

const server = createServer(async (request, response) => {
  if (!(await serveBriefing(request, response))) response.writeHead(404).end();
});
let baseUrl;
before(async () => {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});
after(() => new Promise((resolve) => server.close(resolve)));

const briefing = () =>
  new URLSearchParams({
    client_name: "Teste",
    client_task_id: "task-123",
    tech_owner: "Ana",
    delivery_due_date: "2026-10-10",
    environment: "dev",
    technical_platforms: "whatsapp",
  });

test("root serves a working briefing form without ClickUp credentials", async () => {
  const response = await fetch(baseUrl);
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /text\/html/);
  assert.match(await response.text(), /action="\/preview#resultado"/);
});

test("preview derives real tasks and acceptance criteria from the catalog", async () => {
  const response = await fetch(`${baseUrl}/preview`, {
    method: "POST",
    body: briefing(),
  });
  const html = await response.text();
  assert.equal(response.status, 200);
  assert.match(html, /Configurar webhook WhatsApp/);
  assert.match(html, /Webhook recebe evento real e responde com sucesso/);
  assert.match(html, /4<\/strong> entregas definidas/);
});

test("preview rejects missing platforms and oversized input", async () => {
  const missing = briefing();
  missing.delete("technical_platforms");
  const rejected = await fetch(`${baseUrl}/preview`, {
    method: "POST",
    body: missing,
  });
  assert.equal(rejected.status, 400);
  const oversized = briefing();
  oversized.set("notes", "x".repeat(20_000));
  assert.equal(
    (await fetch(`${baseUrl}/preview`, { method: "POST", body: oversized }))
      .status,
    400,
  );
});

test("user input is escaped before rendering", async () => {
  const malicious = briefing();
  malicious.set("client_name", '<script>alert("x")</script>');
  const response = await fetch(`${baseUrl}/preview`, {
    method: "POST",
    body: malicious,
  });
  const html = await response.text();
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;/);
});
