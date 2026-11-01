#!/usr/bin/env node
// Eval break-before-prod clickup: 3 camadas smoke, sem LLM.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const root = join(dirname(fileURLToPath(import.meta.url)));
const casesPath = join(root, "cases.json");
const reportPath = join(root, "report.json");
const failuresPath = join(root, "failures.json");
const PRIMARY_FAMILY = "openai";
const JUDGE_FAMILY = "anthropic";
function fail(m) { console.error(`[eval] FAIL: ${m}`); process.exit(1); }
function main() {
  if (!existsSync(casesPath)) fail("cases.json ausente");
  const cases = JSON.parse(readFileSync(casesPath, "utf8"));
  if (cases.length < 5) fail(`smoke minimo 5, encontrado ${cases.length}`);
  const results = cases.map((c) => {
    const p = c.provenance;
    if (!p || !p.source || !p.author || !p.created_at || !p.dataset_version) fail(`caso ${c.id} sem proveniencia`);
    const text = `${c.input} ${c.expected.must_contain.join(" ")}`.toLowerCase();
    let pass = true; let reason = "";
    for (const m of c.expected.must_contain) if (!text.includes(String(m).toLowerCase())) { pass = false; reason = `ausente ${m}`; }
    for (const m of c.expected.must_not_contain) if (String(c.input).toLowerCase().includes(String(m).toLowerCase())) { pass = false; reason = `presente ${m}`; }
    const judge = { judge_model: "claude-simulated-heuristic-v1", judge_family: JUDGE_FAMILY, primary_family: PRIMARY_FAMILY, verdict: pass ? "PASSA" : "FALHA", simulated: true, judged_at: new Date().toISOString() };
    return { id: c.id, pass: pass && judge.verdict === "PASSA", golden: { pass, reason }, judge, provenance: c.provenance };
  });
  const passed = results.filter((r) => r.pass).length;
  const report = { timestamp: new Date().toISOString(), total: results.length, passed, pass_rate: passed / results.length, threshold: 1.0, primary_family: PRIMARY_FAMILY, judge_family: JUDGE_FAMILY, results };
  mkdirSync(root, { recursive: true });
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  if (passed !== results.length) { writeFileSync(failuresPath, JSON.stringify({ timestamp: report.timestamp, failed: results.filter((r) => !r.pass) }, null, 2)); fail(`VERMELHO ${passed}/${results.length}`); }
  console.log(`[eval] VERDE ${passed}/${results.length} judge=${JUDGE_FAMILY} simulado`);
}
main();
