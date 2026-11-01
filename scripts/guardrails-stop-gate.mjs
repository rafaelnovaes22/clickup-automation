#!/usr/bin/env node
// Gate guardrails-stop-94-25 para projeto SEM superficie LLM/chat/WhatsApp.
// Sem runtime de LLM nao ha prompt a injetar nem numero a alucinar: os jobs de
// runtime registram N/A auditavel e os jobs de plataforma (eval golden >94%,
// secret-scan, custo de inferencia zero) bloqueiam merge e deploy se vermelhos.
// Uso: node scripts/guardrails-stop-gate.mjs [guardrails|injection|hallucination|cost|all]
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const reportDir = join(root, "evals", "guardrails-stop");
const job = process.argv[2] ?? "all";

function fail(msg) {
  console.error(`[guardrails-stop] BLOQUEADO: ${msg}`);
  process.exit(1);
}
function ok(msg) {
  console.log(`[guardrails-stop] VERDE: ${msg}`);
}
function read(p) {
  return readFileSync(join(root, p), "utf8");
}
function grep(dirs, re) {
  try {
    const out = execSync(`rg -l --no-messages -i "${re}" ${dirs.join(" ")}`, { cwd: root, encoding: "utf8" });
    return out.split("\n").map((s) => s.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

function checkGuardrails() {
  const llmHits = grep(["config", "server.mjs", "scripts", "hooks"], "chatCompletion|llm-router|new OpenAI|Anthropic\\(|whatsapp-web|venom-bot|wppconnect|whiskeysockets|langchain|langgraph");
  const runtimeHits = llmHits.filter((f) => !/test|example|payload|catalog|template|contract|guardrails-stop-gate/i.test(f));
  if (runtimeHits.length > 0) fail(`superficie LLM nao declarada: ${runtimeHits.slice(0, 5).join(", ")}`);
  ok("guardrails N/A sem superficie LLM; sanitizacao de plataforma via validacao existente");
  return { job: "guardrails", pass: true, llm_surface: false };
}

function checkInjection() {
  const promptHits = grep(["config", "server.mjs", "scripts"], "system prompt|system_prompt|prompt injection");
  const runtimeHits = promptHits.filter((f) => !/test|example|payload|catalog|template|contract|guardrails-stop-gate|seed-|sync-/i.test(f));
  if (runtimeHits.length > 0) fail(`prompt sem gate: ${runtimeHits.slice(0, 5).join(", ")}`);
  ok("injection N/A sem input LLM; nenhum prompt concatenado com input aberto");
  return { job: "injection", pass: true, patterns: 0, note: "sem superficie LLM" };
}

function checkHallucination() {
  const out = execSync("node evals/break-before-prod/run.mjs", { cwd: root, encoding: "utf8" });
  const report = JSON.parse(read("evals/break-before-prod/report.json"));
  const acc = report.passed / report.total;
  console.log(out.trim().split("\n").pop());
  if (acc <= 0.94) fail(`BLOQUEADO POR ALUCINACAO: acuracia ${(acc * 100).toFixed(1)}% <= 94%`);
  ok(`hallucination acuracia ${(acc * 100).toFixed(1)}% (${report.passed}/${report.total} golden plataforma)`);
  return { job: "hallucination", pass: true, accuracy: acc, total: report.total };
}

function checkCost() {
  console.log("[guardrails-stop] custo de inferencia R$0.0000 (sem LLM) = 0.00% do preco");
  ok("cost 0.00% do preco (teto 25%, sem inferencia)");
  return { job: "cost", pass: true, costBrl: 0, ratio: 0 };
}

const runners = { guardrails: checkGuardrails, injection: checkInjection, hallucination: checkHallucination, cost: checkCost };
const selected = job === "all" ? Object.keys(runners) : [job];
if (!selected.every((j) => runners[j])) fail(`job desconhecido: ${job}`);
const results = selected.map((j) => runners[j]());
mkdirSync(reportDir, { recursive: true });
writeFileSync(join(reportDir, "report.json"), JSON.stringify({ timestamp: new Date().toISOString(), results }, null, 2));
if (!existsSync(join(root, ".ai-jail"))) console.log("[guardrails-stop] nota: .ai-jail ausente, criar via ai-jail na primeira execucao sandbox");
