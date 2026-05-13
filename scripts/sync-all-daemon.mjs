#!/usr/bin/env node

import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { root } from "./lib/env.mjs";

const args = process.argv.slice(2);
const intervalArg = args.find((a) => a.startsWith("--interval-ms="));
const intervalMs = intervalArg ? Number(intervalArg.slice("--interval-ms=".length)) : 15 * 60 * 1000;

if (!Number.isFinite(intervalMs) || intervalMs < 1000) {
  console.error(`Invalid --interval-ms: ${intervalArg}`);
  process.exit(1);
}

// Sources de sincronização — cada uma tem script e args próprios.
// Plataformas (delivery_type=platform) usam sync-aios-status.mjs.
// Agentes (delivery_type=agentic_saas) usam scripts dedicados.
const SOURCES = [
  {
    name: "Plataforma SchoolPlatform",
    type: "platform",
    script: "scripts/sync-aios-status.mjs",
    args: ["--live", "--platform=Plataforma SchoolPlatform"]
  },
  {
    name: "Plataforma Aicfo",
    type: "platform",
    script: "scripts/sync-aios-status.mjs",
    args: ["--live", "--platform=Plataforma Aicfo"]
  },
  {
    name: "Acme Social",
    type: "agentic_saas",
    script: "scripts/sync-marketing-ai-agents-from-forge.mjs",
    args: ["--live"]
  }
];

function syncSource(source) {
  return new Promise((done) => {
    const scriptPath = resolve(root, source.script);
    const proc = spawn(process.execPath, [scriptPath, ...source.args], { stdio: "inherit" });
    proc.on("close", (code) => {
      if (code !== 0) {
        console.warn(`[${new Date().toISOString()}] sync "${source.name}" exited with code ${code}`);
      }
      done();
    });
  });
}

async function tick() {
  console.log(`[${new Date().toISOString()}] sync:all tick (${SOURCES.length} sources)`);
  await Promise.all(SOURCES.map(syncSource));
}

console.log(
  `sync:all daemon started - sources: ${SOURCES.map((s) => `${s.name} (${s.type})`).join(", ")} - interval ${Math.round(intervalMs / 1000)}s`
);
await tick();
setInterval(tick, intervalMs);
