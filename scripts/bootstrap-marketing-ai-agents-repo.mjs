#!/usr/bin/env node
// bootstrap-marketing-ai-agents-repo.mjs
// Garante que o repo rafaelnovaes22/marketing-ai-agents está clonado e atualizado
// em NOVAIS_SOCIAL_PATH antes do sync ler o filesystem.
//
// Comportamento:
// - Se pasta não existe: git clone
// - Se já existe: git pull
// - Se já existe mas não é repo git: skip + warning (assume fonte local de dev)
//
// Auth no Railway: usa GITHUB_TOKEN (ou GH_TOKEN) em configuração efêmera do subprocesso.
// Auth local: usa credenciais do git do user (https + helper ou ssh)
//
// Uso:
//   node scripts/bootstrap-marketing-ai-agents-repo.mjs           # auto-detecta path
//   NOVAIS_SOCIAL_PATH=/app/marketing-ai-agents npm run marketing-ai-agents:bootstrap

import { spawn, execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { loadLocalEnv } from "./lib/env.mjs";
import { authenticatedGitEnvironment, canRefreshMarketingCheckout, MARKETING_REPOSITORY } from "./lib/repository-bootstrap.mjs";

await loadLocalEnv();

const REPO_URL_HTTPS = MARKETING_REPOSITORY;
const REPO_BRANCH = "main";

// Path resolvido por ordem de prioridade:
// 1. env NOVAIS_SOCIAL_PATH
// 2. ./marketing-ai-agents (mono-repo style)
// 3. ../marketing-ai-agents (sibling, local dev)
function resolveNovaisSocialPath() {
  const envPath = process.env.NOVAIS_SOCIAL_PATH?.trim();
  if (envPath) return envPath;

  const monorepo = resolve(process.cwd(), "marketing-ai-agents");
  if (existsSync(monorepo)) return monorepo;

  const sibling = resolve(process.cwd(), "..", "marketing-ai-agents");
  if (existsSync(sibling)) return sibling;

  // Default: clonar em ./marketing-ai-agents
  return monorepo;
}

function runGit(args, opts = {}) {
  return new Promise((done, fail) => {
    const proc = spawn("git", args, {
      stdio: "inherit",
      ...opts,
      env: authenticatedGitEnvironment(process.env)
    });
    proc.on("close", (code) => {
      if (code === 0) done();
      else fail(new Error(`Git operation exited with code ${code}`));
    });
    proc.on("error", fail);
  });
}

function canRefreshCheckout(targetPath) {
  const read = (args) => execFileSync("git", ["-C", targetPath, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  // Sem token, depende do helper local. Com token, usa header efêmero, sem URL autenticada.
  return canRefreshMarketingCheckout(read(["remote", "get-url", "origin"]), read(["branch", "--show-current"]), read(["status", "--porcelain"]));
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
  const targetPath = resolveNovaisSocialPath();
  console.log(`[bootstrap-marketing-ai-agents] Target path: ${targetPath}`);

  if (!existsSync(targetPath)) {
    console.log(`[bootstrap-marketing-ai-agents] Cloning ${REPO_URL_HTTPS} → ${targetPath}`);
    await runGit(["clone", "--branch", REPO_BRANCH, "--depth", "1", REPO_URL_HTTPS, targetPath]);
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
    if (!canRefreshCheckout(targetPath)) {
      console.warn("[bootstrap-marketing-ai-agents] Atualização ignorada: remoto, branch ou alterações locais exigem revisão.");
      return;
    }
    await runGit(["-C", targetPath, "pull", "--ff-only", "origin", REPO_BRANCH]);
    console.log(`[bootstrap-marketing-ai-agents] ✅ Pull OK (fast-forward)`);
  } catch (err) {
    console.warn(`[bootstrap-marketing-ai-agents] ⚠️  Pull falhou: ${err.message}`);
    console.warn(`   Continuando com versão local existente.`);
  }
}

main().catch((err) => {
  console.error(`[bootstrap-marketing-ai-agents] ❌ Erro fatal: ${err.message}`);
  process.exit(1);
});
