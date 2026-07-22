export function validateAiosPayload(input, contract) {
  const required = contract.requiredFields ?? [];
  const missing = required.filter((field) => {
    const value = input[field];
    return value === undefined || value === null || value === "" ||
      (Array.isArray(value) && value.length === 0);
  });

  if (missing.length) {
    throw new Error(`Missing required fields: ${missing.join(", ")}`);
  }

  if (!Array.isArray(input.modules)) {
    throw new Error("modules must be an array");
  }

  const validTiers = new Set(["A", "B", "C"]);
  input.modules.forEach((module, index) => {
    if (!module || typeof module !== "object") {
      throw new Error(`modules[${index}] must be an object`);
    }
    if (!module.key) throw new Error(`modules[${index}] missing key`);
    if (!validTiers.has(module.tier)) {
      throw new Error(`modules[${index}] (${module.key}) tier must be A, B or C - got ${module.tier}`);
    }
    if (typeof module.week !== "number") {
      throw new Error(`modules[${index}] (${module.key}) week must be a number`);
    }
  });
}

export function isManualModule(module) {
  return module.tier === "C" || module.key === "cnab";
}

export function planTasksForModule(module, catalog) {
  if (isManualModule(module)) {
    const manual = (catalog.manualStages ?? []).find((stage) => stage.key === "manual_implementation");
    if (!manual) {
      throw new Error("aios-module-catalog: manual_implementation stage missing");
    }
    return [
      {
        module,
        stage: manual,
        manual: true
      }
    ];
  }

  const tierRule = catalog.tierRules?.[module.tier];
  if (!tierRule) throw new Error(`Tier ${module.tier} not configured in tierRules`);

  return tierRule.stages.map((stageKey) => {
    const stage = (catalog.stages ?? []).find((item) => item.key === stageKey);
    if (!stage) throw new Error(`Stage ${stageKey} not found in catalog stages`);
    return { module, stage, manual: false };
  });
}

export function planAllTasks(payload, catalog) {
  return payload.modules.flatMap((module) => planTasksForModule(module, catalog));
}

export function resolveArtifactPath(stage, module) {
  return (stage.artifactPath ?? "").replaceAll("{module}", module.key);
}

const STAGE_SHORT_NAMES = {
  spec: "Spec - Definicao executavel",
  backend: "Backend - API + service + queries",
  frontend: "Frontend - Telas + integracao",
  tests: "Tests - Vitest + Playwright",
  review: "Review - Auditoria do review_agent",
  merge: "Merge - PR final em main",
  manual_implementation: "Implementacao manual (Rafael)"
};

const STAGE_DELIVERABLES = {
  spec: "Spec executavel: escopo detalhado, casos de uso, fluxos de tela, regras de negocio, modelos de dados e dependencias entre modulos. Saida: docs/specs/{module}.md (revisado por Rafael).",
  backend: "API REST + service layer + queries Prisma. Endpoints documentados, validacao de payload e isolamento multi-tenant aplicado. Saida: src/{module}/api/ + docs/specs/_backend_{module}.md + PR aberto.",
  frontend: "Telas React + componentes + integracao com API. Estados de loading/erro/sucesso, validacao de formularios, responsividade. Saida: src/{module}/pages/ + docs/specs/_frontend_{module}.md + PR aberto.",
  tests: "Suite Vitest (unit) + Playwright (E2E). Cobertura de fluxos felizes, bordas e regressao. Saida: src/{module}/__tests__/ + docs/specs/_tests_{module}.md + CI verde.",
  review: "Auditoria pelo review_agent: aderencia a spec, cobertura de testes, regras de negocio, padroes de codigo. Saida: docs/specs/_review_{module}.md com decisao 'APROVADO PARA MERGE: Sim' ou 'BLOCKER: ...'.",
  merge: "Manual (Rafael): revisao final e merge dos PRs (backend + frontend + tests) na branch main. Codigo final em src/{module}/. CI verde no main.",
  manual_implementation: "Implementacao 100% manual por Rafael (sem agentes AIOS). Inclui spec, codigo, testes e merge no mesmo trabalho continuo."
};

export function moduleParentName(module, info) {
  const title = info?.title ?? module.key;
  return `${module.key} · ${title}`;
}

export function moduleParentDescription(input, module, info) {
  const stagesNote = isManualModule(module)
    ? "Tier C - Implementacao manual por Rafael (sem pipeline AIOS)."
    : `Tier ${module.tier} - Pipeline AIOS: spec_agent -> backend_agent -> frontend_agent -> test_agent -> review_agent -> merge.`;

  const lines = [
    `**${info?.title ?? module.key}**`,
    "",
    info?.summary ?? "",
    info ? "" : null,
    "### Funcionalidades cobertas",
    ...(info?.features ?? []).map((feature) => `- ${feature}`),
    "",
    "### Pipeline",
    stagesNote,
    "",
    "### Contexto",
    `- Cliente: ${input.client_name}`,
    `- Modulo: \`${module.key}\``,
    `- Tier: ${module.tier}`,
    `- Semana planejada: ${module.week}`,
    input.repository_url ? `- Repositorio: ${input.repository_url}` : null,
    input.project_root ? `- Project root local: ${input.project_root}` : null,
    "",
    "### Referencias",
    input.project_root ? `- Spec gerada (quando existir): \`${input.project_root}/docs/specs/${module.key}.md\`` : null,
    input.project_root ? `- Codigo final (quando existir): \`${input.project_root}/src/${module.key}/\`` : null,
    "",
    "---",
    "Subtasks abaixo refletem o estado de cada stage AIOS. Status atualizado automaticamente pelo `npm run aios:sync` (le filesystem do projeto consumidor + GitHub).",
    "",
    "Controle automatico:",
    `client_name=${input.client_name}`,
    `module_key=${module.key}`,
    `module_tier=${module.tier}`,
    `week=${module.week}`,
    input.project_root ? `project_root=${input.project_root}` : null,
    input.repository_url ? `repository_url=${input.repository_url}` : null,
    input.client_task_id ? `client_task_id=${input.client_task_id}` : null,
    `module_role=parent`
  ];

  return lines.filter((line) => line !== null).join("\n");
}

export function moduleParentTags(module) {
  const tags = ["projeto:school-platform", `tier:${module.tier}`, `semana:${module.week}`];
  if (isManualModule(module)) tags.push("rafael-implementa");
  if (module.key === "cnab") tags.push("bloqueador-cnab");
  return tags;
}

export function stageSubtaskName(stage) {
  const key = stage.key ?? stage;
  return STAGE_SHORT_NAMES[key] ?? key;
}

export function stageSubtaskDescription(input, plan, parentTaskId, info) {
  const { module, stage, manual } = plan;
  const stageKey = manual ? "manual_implementation" : stage.key;
  const artifactPath = manual ? null : resolveArtifactPath(stage, module);

  const lines = [
    `**${stageSubtaskName({ key: stageKey })}**`,
    "",
    info ? `Modulo: ${module.key} - ${info.title}` : `Modulo: ${module.key}`,
    info?.summary ? `Resumo: ${info.summary}` : null,
    "",
    "### O que esta etapa entrega",
    STAGE_DELIVERABLES[stageKey] ?? "",
    "",
    "### Contexto",
    `- Cliente: ${input.client_name}`,
    `- Tier: ${module.tier}`,
    `- Semana: ${module.week}`,
    manual ? "- Sem pipeline AIOS - implementacao manual" : `- Agente: ${stage.agent}`,
    artifactPath ? `- Artefato esperado: ${artifactPath}` : null,
    stage.doneEvidence ? `- Done when: ${stage.doneEvidence}` : null,
    input.repository_url ? `- Repositorio: ${input.repository_url}` : null,
    input.project_root ? `- Project root local: ${input.project_root}` : null,
    "",
    "Status sera atualizado automaticamente pelo `npm run aios:sync` (le artefato AIOS no filesystem + GitHub PR/CI).",
    "",
    "Controle automatico:",
    `client_name=${input.client_name}`,
    parentTaskId ? `parent_task_id=${parentTaskId}` : null,
    input.client_task_id ? `client_task_id=${input.client_task_id}` : null,
    `module_key=${module.key}`,
    `module_tier=${module.tier}`,
    `stage_key=${stageKey}`,
    `week=${module.week}`,
    input.project_root ? `project_root=${input.project_root}` : null,
    input.repository_url ? `repository_url=${input.repository_url}` : null,
    `evidence_source=${manual ? "github" : "aios+github"}`,
    artifactPath ? `artifact_path=${artifactPath}` : null,
    `github_match_terms=${input.client_name},${module.key},${stageKey}`,
    `module_role=stage`
  ];

  return lines.filter((line) => line !== null).join("\n");
}

export function stageSubtaskTags(plan) {
  const stageKey = plan.manual ? "manual_implementation" : plan.stage.key;
  const tags = ["projeto:school-platform", `tier:${plan.module.tier}`, `stage:${stageKey}`];
  if (plan.manual) tags.push("rafael-implementa");
  if (plan.module.key === "cnab") tags.push("bloqueador-cnab");
  return tags;
}

export function parseAiosTask(task) {
  const description = task.description ?? "";
  const fields = new Map();

  for (const line of description.split(/\r?\n/)) {
    const m = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*)=(.*)$/);
    if (m) fields.set(m[1], m[2].trim());

    const repoMatch = line.match(/^Repositorio:\s*(.+)$/i);
    if (repoMatch && !fields.has("repository_url")) fields.set("repository_url", repoMatch[1].trim());
  }

  const week = fields.get("week");

  return {
    id: task.id,
    name: task.name,
    parentId: task.parent ?? null,
    status: String(task.status?.status ?? "").toLowerCase(),
    role: fields.get("module_role"),
    isModuleParent: fields.get("module_role") === "parent",
    isStage: fields.get("module_role") === "stage",
    isManual: fields.get("stage_key") === "manual_implementation",
    clientName: fields.get("client_name") ?? "Sem cliente",
    moduleKey: fields.get("module_key"),
    moduleTier: fields.get("module_tier"),
    stageKey: fields.get("stage_key"),
    clientTaskId: fields.get("client_task_id"),
    parentTaskId: fields.get("parent_task_id") ?? task.parent ?? null,
    projectRoot: fields.get("project_root"),
    artifactPath: fields.get("artifact_path"),
    repositoryUrl: fields.get("repository_url"),
    week: week ? Number(week) : undefined
  };
}
