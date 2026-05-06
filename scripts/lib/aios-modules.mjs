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

function resolveArtifactPath(stage, module) {
  return (stage.artifactPath ?? "").replaceAll("{module}", module.key);
}

export function aiosTaskName(input, plan) {
  const { module, stage, manual } = plan;
  if (manual) {
    return `[MANUAL] ${input.client_name} / ${module.key} / Implementacao Rafael`;
  }
  return `[AIOS] ${input.client_name} / ${module.key} / ${stage.title}`;
}

export function aiosTaskDescription(input, plan) {
  const { module, stage, manual } = plan;
  const artifactPath = resolveArtifactPath(stage, module);
  const stageKey = manual ? "manual_implementation" : stage.key;

  const lines = [
    `Cliente: ${input.client_name}`,
    `Modulo: ${module.key}`,
    `Tier: ${module.tier}`,
    `Semana: ${module.week}`,
    `Stage: ${stageKey}`,
    `Responsavel tecnico: ${input.tech_owner}`,
    `Ambiente: ${input.environment}`,
    `Cliente task: ${input.client_task_id}`,
    input.diagnostic_task_id ? `Diagnostico task: ${input.diagnostic_task_id}` : null,
    input.repository_url ? `Repositorio: ${input.repository_url}` : null,
    artifactPath ? `Artefato esperado: ${artifactPath}` : null,
    stage.doneEvidence ? `Done when: ${stage.doneEvidence}` : null,
    "",
    "Controle automatico:",
    `client_name=${input.client_name}`,
    `client_task_id=${input.client_task_id}`,
    `module_key=${module.key}`,
    `module_tier=${module.tier}`,
    `stage_key=${stageKey}`,
    `week=${module.week}`,
    `project_root=${input.project_root}`,
    `evidence_source=${manual ? "github" : "aios+github"}`,
    artifactPath ? `artifact_path=${artifactPath}` : null,
    input.repository_url ? `github_match_terms=${input.client_name},${module.key},${stageKey}` : null,
    input.notes ? `Notas: ${input.notes}` : null
  ];

  return lines.filter((line) => line !== null).join("\n");
}

export function aiosTaskTags(plan) {
  const tags = ["ia-gerado", "revisao-humana", "projeto:edix", `tier:${plan.module.tier}`];
  if (plan.manual) tags.push("rafael-implementa");
  if (plan.module.key === "cnab") tags.push("bloqueador-cnab");
  return tags;
}

export function parseAiosTask(task) {
  const aiosMatch = task.name.match(/^\[AIOS\]\s+(.+?)\s+\/\s+(.+?)\s+\/\s+(.+)$/);
  const manualMatch = task.name.match(/^\[MANUAL\]\s+(.+?)\s+\/\s+(.+?)\s+\/\s+(.+)$/);
  const match = aiosMatch ?? manualMatch;
  const description = task.description ?? "";
  const fields = new Map();

  for (const line of description.split(/\r?\n/)) {
    const keyValueMatch = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*)=(.*)$/);
    if (keyValueMatch) fields.set(keyValueMatch[1], keyValueMatch[2].trim());

    const repoMatch = line.match(/^Repositorio:\s*(.+)$/i);
    if (repoMatch) fields.set("repository_url", repoMatch[1].trim());
  }

  const week = fields.get("week");

  return {
    id: task.id,
    name: task.name,
    status: String(task.status?.status ?? "").toLowerCase(),
    isManual: Boolean(manualMatch),
    clientName: match?.[1] ?? fields.get("client_name") ?? "Sem cliente",
    moduleKey: match?.[2] ?? fields.get("module_key"),
    title: match?.[3] ?? task.name,
    moduleTier: fields.get("module_tier"),
    stageKey: fields.get("stage_key"),
    clientTaskId: fields.get("client_task_id"),
    projectRoot: fields.get("project_root"),
    artifactPath: fields.get("artifact_path"),
    repositoryUrl: fields.get("repository_url"),
    week: week ? Number(week) : undefined
  };
}
