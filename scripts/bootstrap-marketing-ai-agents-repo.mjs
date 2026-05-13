#!/usr/bin/env node
// bootstrap-marketing-ai-agents-repo.mjs
// Garante que o repo acme-startup/marketing-ai-agents está clonado e atualizado
// em ACME_SOCIAL_PATH antes do sync ler o filesystem.
//
// Comportamento:
// - Se pasta não existe: git clone
// - Se já existe: git pull
// - Se já existe mas não é repo git: skip + warning (assume fonte local de dev)
//
// Auth no Railway: usa GITHUB_TOKEN (ou GH_TOKEN) injetado em https://${TOKEN}@github.com/...
// Auth local: usa credenciais do git do user (https + helper ou ssh)
//
// Uso:
//   node scripts/bootstrap-marketing-ai-agents-repo.mjs           # auto-detecta path
//   ACME_SOCIAL_PATH=/app/marketing-ai-agents npm run marketing-ai-agents:bootstrap

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { loadLocalEnv } from "./lib/env.mjs";

await loadLocalEnv();

const REPO_URL_HTTPS = "https://github.com/acme-startup/marketing-ai-agents.git";
const REPO_BRANCH = "main";

// Path resolvido por ordem de prioridade:
// 1. env ACME_SOCIAL_PATH
// 2. ./marketing-ai-agents (mono-repo style)
// 3. ../Acme_Social (sibling, local dev)
function resolveAcmeSocialPath() {
  const envPath = process.env.ACME_SOCIAL_PATH?.trim();
  if (envPath) return envPath;

  const monorepo = resolve(process.cwd(), "marketing-ai-agents");
  if (existsSync(monorepo)) return monorepo;

  const sibling = resolve(process.cwd(), "..", "Acme_Social");
  if (existsSync(sibling)) return sibling;

  // Default: clonar em ./marketing-ai-agents
  return monorepo;
}

function runGit(args, opts = {}) {
  return new Promise((done, fail) => {
    const proc = spawn("git", args, {
      stdio: "inherit",
      ...opts,
      env: { ...process.env, GIT_TERMINAL_PROMPT: "0" }
    });
    proc.on("close", (code) => {
      if (code === 0) done();
      else fail(new Error(`git ${args.join(" ")} exited with code ${code}`));
    });
    proc.on("error", fail);
  });
}

function buildAuthenticatedUrl() {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (!token) return REPO_URL_HTTPS; // sem token, depende do helper local
  // Inject token: https://${token}@github.com/...
  return REPO_URL_HTTPS.replace("https://", `https://${token}@`);
}

async function isGitRepo(path) {
  try {
    await new Promise((done, fail) => {
      const proc = spawn("git", ["-C", path, "rev-parse", "--git-dir"], { stdio: "ignore" });
      proc.on("close", (code) => (code === 0 ? done() : fail()));
      proc.on("error", fail);
    });
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const targetPath = resolveAcmeSocialPath();
  console.log(`[bootstrap-marketing-ai-agents] Target path: ${targetPath}`);

  if (!existsSync(targetPath)) {
    console.log(`[bootstrap-marketing-ai-agents] Cloning ${REPO_URL_HTTPS} → ${targetPath}`);
    const authUrl = buildAuthenticatedUrl();
    await runGit(["clone", "--branch", REPO_BRANCH, "--depth", "1", authUrl, targetPath]);
    console.log(`[bootstrap-marketing-ai-agents] ✅ Clone OK`);
    return;
  }

  if (!(await isGitRepo(targetPath))) {
    console.warn(
      `[bootstrap-marketing-ai-agents] ⚠️  Pasta existe mas não é repo git — assumindo fonte local de dev. Skip pull.`
    );
    return;
  }

  console.log(`[bootstrap-marketing-ai-agents] Pulling latest from ${REPO_BRANCH}`);
  try {
    // Garante que estamos no branch correto e remoto atualizado
    await runGit(["-C", targetPath, "fetch", "origin", REPO_BRANCH, "--depth", "1"]);
    await runGit(["-C", targetPath, "reset", "--hard", `origin/${REPO_BRANCH}`]);
    console.log(`[bootstrap-marketing-ai-agents] ✅ Pull OK (reset hard para origin/${REPO_BRANCH})`);
  } catch (err) {
    console.warn(`[bootstrap-marketing-ai-agents] ⚠️  Pull falhou: ${err.message}`);
    console.warn(`   Continuando com versão local existente.`);
  }
}

main().catch((err) => {
  console.error(`[bootstrap-marketing-ai-agents] ❌ Erro fatal: ${err.message}`);
  process.exit(1);
});
