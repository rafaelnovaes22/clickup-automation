#!/usr/bin/env node

import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { root } from "./lib/env.mjs";

const args = process.argv.slice(2);
const intervalArg = args.find((arg) => arg.startsWith("--interval-ms="));
const intervalMs = intervalArg ? Number(intervalArg.slice("--interval-ms=".length)) : 15 * 60 * 1000;
const live = args.includes("--live");
const passThrough = args.filter(
  (arg) => !arg.startsWith("--interval-ms=") && arg !== "--live"
);

if (!Number.isFinite(intervalMs) || intervalMs < 1000) {
  console.error(`Invalid --interval-ms: ${intervalArg}`);
  process.exit(1);
}

const syncScript = resolve(root, "scripts/sync-aios-status.mjs");

function tick() {
  const flag = live ? "--live" : "--dry-run";
  const cliArgs = [syncScript, flag, ...passThrough];
  console.log(`[${new Date().toISOString()}] aios:sync tick (${flag})`);
  const proc = spawn(process.execPath, cliArgs, { stdio: "inherit" });
  return new Promise((resolveTick) => proc.on("close", (code) => {
    if (code !== 0) {
      console.warn(`[${new Date().toISOString()}] sync exited with code ${code}`);
    }
    resolveTick();
  }));
}

console.log(`AIOS sync daemon started - interval ${Math.round(intervalMs / 1000)}s, mode ${live ? "live" : "dry-run"}`);
await tick();
setInterval(tick, intervalMs);
