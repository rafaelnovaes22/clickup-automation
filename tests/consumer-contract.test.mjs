import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { consumerContractErrors } from "../scripts/lib/consumer-contract.mjs";

const manifest = { framework: { canonical: false, version: "0.21.0", constitution_version: "0.3.0" }, consumer: { project_type: "automation", ai_enabled: false } };
const project = { project: { type: "automation", ai_enabled: false } };
const settings = { _foundry_version: "0.21.0", _constitution_version: "0.3.0" };
const constitution = "**Versão**: 0.3.0";

test("consumer contract rejects a copied canonical inventory and version drift", () => {
  assert.deepEqual(consumerContractErrors(manifest, project, settings, constitution), []);
  const canonical = { ...manifest, framework: { ...manifest.framework, canonical: true } };
  assert.match(consumerContractErrors(canonical, project, settings, constitution).join(" "), /canonical=false/);
  assert.match(consumerContractErrors(manifest, project, settings, "**Versão**: 0.4.0").join(" "), /Constitution version/);
});

test("AI scope must be explicit and coherent across both consumer documents", () => {
  assert.match(consumerContractErrors(manifest, { project: { type: "automation" } }, settings, constitution).join(" "), /explicit boolean/);
  assert.match(consumerContractErrors(manifest, { project: { type: "automation", ai_enabled: true } }, settings, constitution).join(" "), /consumer.ai_enabled/);
});

test("the real eval hook preserves false and restores LLM checks for true", async () => {
  const fixture = await mkdtemp(join(tmpdir(), "clickup-contract-"));
  const hook = resolve("hooks/stop/eval-suite-fresh.sh");
  try {
    await mkdir(join(fixture, "docs/foundry"), { recursive: true });
    await mkdir(join(fixture, "evals/synthetic/cases"), { recursive: true });
    await writeFile(join(fixture, "docs/foundry/project.json"), JSON.stringify(project));
    assert.equal(spawnSync("bash", [hook], { cwd: fixture, encoding: "utf8" }).status, 0);
    await writeFile(join(fixture, "docs/foundry/project.json"), JSON.stringify({ project: { ai_enabled: true } }));
    const required = spawnSync("bash", [hook], { cwd: fixture, encoding: "utf8" });
    assert.equal(required.status, 1);
    assert.match(required.stderr, /mínimo C4/);
  } finally { await rm(fixture, { recursive: true, force: true }); }
});
