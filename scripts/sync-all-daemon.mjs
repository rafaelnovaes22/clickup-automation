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

const PLATFORMS = ["Plataforma SchoolPlatform", "Plataforma Aicfo"];
const syncScript = resolve(root, "scripts/sync-aios-status.mjs");

function syncPlatform(platform) {
  return new Promise((done) => {
    const proc = spawn(process.execPath, [syncScript, "--live", `--platform=${platform}`], { stdio: "inherit" });
    proc.on("close", (code) => {
      if (code !== 0) console.warn(`[${new Date().toISOString()}] sync "${platform}" exited with code ${code}`);
      done();
    });
  });
}

async function tick() {
  console.log(`[${new Date().toISOString()}] sync:all tick`);
  await Promise.all(PLATFORMS.map(syncPlatform));
}

console.log(`AIOS sync:all daemon started - platforms: ${PLATFORMS.join(", ")} - interval ${Math.round(intervalMs / 1000)}s`);
await tick();
setInterval(tick, intervalMs);
