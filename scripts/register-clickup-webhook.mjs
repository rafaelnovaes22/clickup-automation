#!/usr/bin/env node

import { createClickUpClient } from "./lib/clickup.mjs";
import { clickUpCredentials, loadLocalEnv } from "./lib/env.mjs";

const args = process.argv.slice(2);
const urlArg = args.find((arg) => arg.startsWith("--url="));

await loadLocalEnv();

const endpointBase = urlArg?.slice("--url=".length) ?? process.env.WEBHOOK_PUBLIC_URL ?? process.env.RAILWAY_PUBLIC_DOMAIN;
const { token, teamId } = clickUpCredentials();
if (!token || !teamId) {
  console.error("Missing ClickUp credentials.");
  process.exit(1);
}

if (!endpointBase) {
  console.error("Missing webhook public URL. Use --url=https://... or WEBHOOK_PUBLIC_URL=https://...");
  process.exit(1);
}

const endpoint = endpointBase.startsWith("http")
  ? `${endpointBase.replace(/\/$/, "")}/webhooks/clickup`
  : `https://${endpointBase.replace(/\/$/, "")}/webhooks/clickup`;

const clickUp = createClickUpClient({ token });
const webhook = await clickUp.request("POST", `/team/${teamId}/webhook`, {
  endpoint,
  events: ["taskStatusUpdated", "taskUpdated"]
});

console.log(`Webhook registered: ${webhook.id ?? webhook.webhook?.id ?? "(id unavailable)"}`);
console.log(`Endpoint: ${endpoint}`);
