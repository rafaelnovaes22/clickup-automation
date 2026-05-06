import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { readFile } from "node:fs/promises";
import {
  moduleParentName,
  moduleParentDescription,
  moduleParentTags,
  parseAiosTask,
  planTasksForModule,
  stageSubtaskName,
  stageSubtaskDescription,
  stageSubtaskTags,
  validateAiosPayload
} from "../scripts/lib/aios-modules.mjs";
import {
  canonicalAiosStatus,
  collectAiosEvidence,
  decideStatusForManualTask,
  decideStatusFromAiosEvidence,
  isBlockedSignal
} from "../scripts/lib/aios-evidence.mjs";
import { rollupParentStatus, currentStageFromSubtasks } from "../scripts/lib/aios-platform.mjs";
import { root } from "../scripts/lib/env.mjs";

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

const catalog = JSON.parse(await readFile(resolve(root, "config/aios-module-catalog.json"), "utf8"));
const contract = JSON.parse(await readFile(resolve(root, "config/aios-pipeline-contract.json"), "utf8"));
const edixPayload = JSON.parse(await readFile(resolve(root, "examples/edix-modules.payload.json"), "utf8"));

const validPayload = {
  client_name: "SchoolPlatform",
  platform_name: "Plataforma SchoolPlatform",
  list_name: "Modulos",
  client_task_id: "86abc",
  modules: [{ key: "cadastros", tier: "A", week: 3 }],
  tech_owner: "Rafael",
  delivery_due_date: "2026-07-15",
  project_root: "c:/Users/Rafael/Projetos/SchoolPlatform",
  environment: "dev"
};

const cadastrosInfo = {
  title: "Cadastros gerais",
  summary: "Tabelas mestre",
  features: ["Cadastro de equipes"]
};

test("validateAiosPayload accepts a complete payload", () => {
  assert.doesNotThrow(() => validateAiosPayload(validPayload, contract));
});

test("validateAiosPayload rejects module without tier", () => {
  const broken = {
    ...validPayload,
    modules: [{ key: "cadastros", week: 3 }]
  };
  assert.throws(() => validateAiosPayload(broken, contract), /tier/);
});

test("validateAiosPayload rejects module without numeric week", () => {
  const broken = {
    ...validPayload,
    modules: [{ key: "cadastros", tier: "A", week: "3" }]
  };
  assert.throws(() => validateAiosPayload(broken, contract), /week/);
});

test("validateAiosPayload rejects missing required field project_root", () => {
  const broken = { ...validPayload, project_root: "" };
  assert.throws(() => validateAiosPayload(broken, contract), /project_root/);
});

test("validateAiosPayload rejects missing required field platform_name", () => {
  const broken = { ...validPayload, platform_name: "" };
  assert.throws(() => validateAiosPayload(broken, contract), /platform_name/);
});

test("planTasksForModule returns 6 stages for tier A", () => {
  const plans = planTasksForModule({ key: "cadastros", tier: "A", week: 3 }, catalog);
  assert.equal(plans.length, 6);
  assert.deepEqual(
    plans.map((p) => p.stage.key),
    ["spec", "backend", "frontend", "tests", "review", "merge"]
  );
});

test("planTasksForModule returns 6 stages for tier B", () => {
  const plans = planTasksForModule({ key: "jovens", tier: "B", week: 3 }, catalog);
  assert.equal(plans.length, 6);
});

test("planTasksForModule returns 1 manual task for tier C", () => {
  const plans = planTasksForModule({ key: "schema", tier: "C", week: 1 }, catalog);
  assert.equal(plans.length, 1);
  assert.equal(plans[0].manual, true);
  assert.equal(plans[0].stage.key, "manual_implementation");
});

test("planTasksForModule treats cnab as manual even though tier is C", () => {
  const plans = planTasksForModule({ key: "cnab", tier: "C", week: 9 }, catalog);
  assert.equal(plans.length, 1);
  assert.equal(plans[0].manual, true);
});

test("EDIX payload generates exactly 70 tasks", () => {
  const total = edixPayload.modules.reduce((acc, module) => {
    return acc + planTasksForModule(module, catalog).length;
  }, 0);
  assert.equal(total, 70);
});

test("moduleParentName combines key with feature title", () => {
  const module = { key: "cadastros", tier: "A", week: 3 };
  assert.equal(moduleParentName(module, cadastrosInfo), "cadastros · Cadastros gerais");
});

test("moduleParentTags includes tier, week and projeto:edix", () => {
  const tags = moduleParentTags({ key: "cadastros", tier: "A", week: 3 });
  assert.ok(tags.includes("projeto:edix"));
  assert.ok(tags.includes("tier:A"));
  assert.ok(tags.includes("semana:3"));
});

test("moduleParentTags adds rafael-implementa and bloqueador-cnab for cnab", () => {
  const tags = moduleParentTags({ key: "cnab", tier: "C", week: 9 });
  assert.ok(tags.includes("rafael-implementa"));
  assert.ok(tags.includes("bloqueador-cnab"));
});

test("moduleParentDescription includes key features and parser fields", () => {
  const module = { key: "cadastros", tier: "A", week: 3 };
  const description = moduleParentDescription(validPayload, module, cadastrosInfo);
  assert.match(description, /Cadastros gerais/);
  assert.match(description, /Cadastro de equipes/);
  assert.match(description, /module_key=cadastros/);
  assert.match(description, /module_role=parent/);
});

test("stageSubtaskName uses descriptive labels", () => {
  assert.equal(stageSubtaskName({ key: "spec" }), "Spec - Definicao executavel");
  assert.equal(stageSubtaskName({ key: "manual_implementation" }), "Implementacao manual (Rafael)");
});

test("stageSubtaskDescription embeds module/stage/parent for parsing", () => {
  const plan = planTasksForModule({ key: "cadastros", tier: "A", week: 3 }, catalog)[0];
  const description = stageSubtaskDescription(validPayload, plan, "86parent", cadastrosInfo);
  assert.match(description, /module_key=cadastros/);
  assert.match(description, /stage_key=spec/);
  assert.match(description, /parent_task_id=86parent/);
  assert.match(description, /module_role=stage/);
  assert.match(description, /artifact_path=docs\/specs\/cadastros\.md/);
});

test("stageSubtaskTags adds rafael-implementa and bloqueador-cnab for cnab", () => {
  const plan = planTasksForModule({ key: "cnab", tier: "C", week: 9 }, catalog)[0];
  const tags = stageSubtaskTags(plan);
  assert.ok(tags.includes("rafael-implementa"));
  assert.ok(tags.includes("bloqueador-cnab"));
  assert.ok(tags.includes("stage:manual_implementation"));
});

test("parseAiosTask reads role/module/stage from description", () => {
  const plan = planTasksForModule({ key: "cadastros", tier: "A", week: 3 }, catalog)[1];
  const task = {
    id: "86xyz",
    name: stageSubtaskName({ key: plan.stage.key }),
    description: stageSubtaskDescription(validPayload, plan, "86parent", cadastrosInfo),
    parent: "86parent",
    status: { status: "to do" }
  };
  const parsed = parseAiosTask(task);
  assert.equal(parsed.clientName, "SchoolPlatform");
  assert.equal(parsed.moduleKey, "cadastros");
  assert.equal(parsed.moduleTier, "A");
  assert.equal(parsed.stageKey, "backend");
  assert.equal(parsed.projectRoot, "c:/Users/Rafael/Projetos/SchoolPlatform");
  assert.equal(parsed.isStage, true);
  assert.equal(parsed.isModuleParent, false);
  assert.equal(parsed.isManual, false);
  assert.equal(parsed.parentTaskId, "86parent");
});

test("parseAiosTask flags manual_implementation as manual", () => {
  const plan = planTasksForModule({ key: "cnab", tier: "C", week: 9 }, catalog)[0];
  const task = {
    id: "86manual",
    name: stageSubtaskName({ key: "manual_implementation" }),
    description: stageSubtaskDescription(validPayload, plan, "86parent", null),
    parent: "86parent",
    status: { status: "to do" }
  };
  const parsed = parseAiosTask(task);
  assert.equal(parsed.isManual, true);
  assert.equal(parsed.moduleKey, "cnab");
});

test("collectAiosEvidence returns found:false when artefato ausente", () => {
  const evidence = collectAiosEvidence({
    module: "cadastros",
    stage: "spec",
    projectRoot: "c:/path/that/does/not/exist"
  });
  assert.equal(evidence.found, false);
  assert.match(evidence.reason, /arquivo ausente|project_root/);
});

test("collectAiosEvidence returns found:true when artefato existe", () => {
  const tmp = mkdtempSync(join(tmpdir(), "aios-test-"));
  try {
    mkdirSync(join(tmp, "docs/specs"), { recursive: true });
    writeFileSync(join(tmp, "docs/specs/cadastros.md"), "# Spec cadastros");
    const evidence = collectAiosEvidence({ module: "cadastros", stage: "spec", projectRoot: tmp });
    assert.equal(evidence.found, true);
    assert.equal(evidence.stage, "spec");
    assert.ok(evidence.sizeBytes > 0);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("collectAiosEvidence detects review approval and blocker", () => {
  const tmp = mkdtempSync(join(tmpdir(), "aios-test-"));
  try {
    mkdirSync(join(tmp, "docs/specs"), { recursive: true });
    writeFileSync(join(tmp, "docs/specs/_review_crm.md"), "Review do crm.\nAPROVADO PARA MERGE: Sim");
    const approved = collectAiosEvidence({ module: "crm", stage: "review", projectRoot: tmp });
    assert.equal(approved.reviewApproved, true);
    assert.equal(approved.reviewBlocked, false);

    writeFileSync(join(tmp, "docs/specs/_review_jovens.md"), "Review.\nBLOCKER: schema invalido");
    const blocked = collectAiosEvidence({ module: "jovens", stage: "review", projectRoot: tmp });
    assert.equal(blocked.reviewBlocked, true);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("decideStatusFromAiosEvidence returns complete on review approved + merged PR + CI passing", () => {
  const evidence = { found: true, stage: "review", reviewApproved: true, reviewBlocked: false };
  const githubEvidence = {
    prs: [{ state: "closed", merged_at: "2026-05-01T00:00:00Z", updated_at: "2026-05-01T00:00:00Z" }],
    branches: [],
    ci: { state: "passing" }
  };
  assert.equal(decideStatusFromAiosEvidence(evidence, githubEvidence), "complete");
});

test("decideStatusFromAiosEvidence returns bloqueado on BLOCKER review", () => {
  const evidence = { found: true, stage: "review", reviewApproved: false, reviewBlocked: true };
  assert.equal(decideStatusFromAiosEvidence(evidence, { prs: [], branches: [], ci: null }), "bloqueado");
});

test("decideStatusFromAiosEvidence returns bloqueado when CI is failing", () => {
  const evidence = { found: true, stage: "tests", reviewApproved: false, reviewBlocked: false };
  assert.equal(
    decideStatusFromAiosEvidence(evidence, { prs: [{ state: "open", updated_at: "2026-05-01T00:00:00Z" }], branches: [], ci: { state: "failing" } }),
    "bloqueado"
  );
});

test("decideStatusFromAiosEvidence returns em revisão on review stage with artefato sem aprovacao", () => {
  const evidence = { found: true, stage: "review", reviewApproved: false, reviewBlocked: false };
  assert.equal(decideStatusFromAiosEvidence(evidence, { prs: [], branches: [], ci: null }), "em revisão");
});

test("decideStatusFromAiosEvidence returns em desenvolvimento when artefato exists para stage de codigo", () => {
  const evidence = { found: true, stage: "spec", reviewApproved: false, reviewBlocked: false };
  assert.equal(decideStatusFromAiosEvidence(evidence, { prs: [], branches: [], ci: null }), "em desenvolvimento");
});

test("decideStatusFromAiosEvidence returns to do when nothing exists", () => {
  const evidence = { found: false, stage: "spec", reason: "ausente" };
  assert.equal(decideStatusFromAiosEvidence(evidence, { prs: [], branches: [], ci: null }), "to do");
});

test("decideStatusForManualTask uses GitHub-only signals (5 estados)", () => {
  assert.equal(decideStatusForManualTask({ prs: [], branches: [], ci: null }), "to do");
  assert.equal(
    decideStatusForManualTask({
      prs: [{ state: "closed", merged_at: "2026-05-01T00:00:00Z", updated_at: "2026-05-01T00:00:00Z" }],
      branches: [],
      ci: { state: "passing" }
    }),
    "complete"
  );
  assert.equal(
    decideStatusForManualTask({
      prs: [{ state: "open", updated_at: "2026-05-01T00:00:00Z" }],
      branches: [],
      ci: { state: "passing" }
    }),
    "em revisão"
  );
  assert.equal(
    decideStatusForManualTask({
      prs: [{ state: "open", updated_at: "2026-05-01T00:00:00Z" }],
      branches: [],
      ci: { state: "failing" }
    }),
    "bloqueado"
  );
});

test("isBlockedSignal flags BLOCKER review or failing CI", () => {
  assert.equal(isBlockedSignal({ reviewBlocked: true }, {}), true);
  assert.equal(isBlockedSignal({}, { ci: { state: "failing" } }), true);
  assert.equal(isBlockedSignal({}, { ci: { state: "passing" } }), false);
});

test("canonicalAiosStatus maps aliases to 5 estados (alinhado com a list do ClickUp)", () => {
  assert.equal(canonicalAiosStatus("to do"), "to do");
  assert.equal(canonicalAiosStatus("a fazer"), "to do");
  assert.equal(canonicalAiosStatus("pendente"), "to do");
  assert.equal(canonicalAiosStatus("em desenvolvimento"), "em desenvolvimento");
  assert.equal(canonicalAiosStatus("in progress"), "em desenvolvimento");
  assert.equal(canonicalAiosStatus("em revisao"), "em revisão");
  assert.equal(canonicalAiosStatus("em revisão"), "em revisão");
  assert.equal(canonicalAiosStatus("bloqueado"), "bloqueado");
  assert.equal(canonicalAiosStatus("blocked"), "bloqueado");
  assert.equal(canonicalAiosStatus("complete"), "complete");
  assert.equal(canonicalAiosStatus("concluido"), "complete");
  assert.equal(canonicalAiosStatus("CONCLUÍDO"), "complete");
});

test("rollupParentStatus prioritizes bloqueado then completion then progress", () => {
  assert.equal(rollupParentStatus([{ status: "complete" }, { status: "complete" }]), "complete");
  assert.equal(rollupParentStatus([{ status: "to do" }, { status: "to do" }]), "to do");
  assert.equal(rollupParentStatus([{ status: "to do" }, { status: "bloqueado" }]), "bloqueado");
  assert.equal(rollupParentStatus([{ status: "complete" }, { status: "em revisão" }]), "em revisão");
  assert.equal(rollupParentStatus([{ status: "to do" }, { status: "em desenvolvimento" }]), "em desenvolvimento");
});

test("currentStageFromSubtasks prioritizes blocked, then review, then development", () => {
  assert.equal(
    currentStageFromSubtasks([
      { stageKey: "spec", status: "complete" },
      { stageKey: "backend", status: "em desenvolvimento" },
      { stageKey: "frontend", status: "to do" }
    ]),
    "backend"
  );
  assert.equal(
    currentStageFromSubtasks([
      { stageKey: "spec", status: "complete" },
      { stageKey: "review", status: "em revisão" }
    ]),
    "review"
  );
  assert.equal(
    currentStageFromSubtasks([
      { stageKey: "spec", status: "complete" },
      { stageKey: "tests", status: "bloqueado" }
    ]),
    "tests"
  );
  assert.equal(
    currentStageFromSubtasks([
      { stageKey: "spec", status: "complete" },
      { stageKey: "merge", status: "complete" }
    ]),
    "complete"
  );
});

let passed = 0;

for (const { name, fn } of tests) {
  try {
    await fn();
    passed += 1;
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}

console.log(`${passed}/${tests.length} aios unit tests passed`);
