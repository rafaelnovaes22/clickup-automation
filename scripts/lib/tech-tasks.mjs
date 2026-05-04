export function validatePayload(input, contract) {
  const missing = contract.requiredFields.filter((field) => {
    const value = input[field];
    return value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0);
  });

  if (missing.length) {
    throw new Error(`Missing required fields: ${missing.join(", ")}`);
  }
}

export function selectedPlatforms(input, platformCatalog) {
  const keys = new Set(input.technical_platforms);
  const platforms = platformCatalog.platforms.filter((platform) => keys.has(platform.key));
  const unknown = [...keys].filter((key) => !platforms.some((platform) => platform.key === key));
  if (unknown.length) throw new Error(`Unknown technical platforms: ${unknown.join(", ")}`);
  return platforms;
}

export function taskName(input, platform, task) {
  return `[TECH] ${input.client_name} / ${platform.label} / ${task.title}`;
}

export function taskDescription(input, platform, task) {
  return [
    `Cliente: ${input.client_name}`,
    `Plataforma: ${platform.label}`,
    `Responsavel tecnico: ${input.tech_owner}`,
    `Ambiente: ${input.environment}`,
    `Cliente task: ${input.client_task_id}`,
    input.diagnostic_task_id ? `Diagnostico task: ${input.diagnostic_task_id}` : null,
    input.setup_task_id ? `Setup task: ${input.setup_task_id}` : null,
    input.repository_url ? `Repositorio: ${input.repository_url}` : null,
    "",
    `Entrega tecnica: ${task.title}`,
    `Artefato esperado: ${task.artifact}`,
    `Done when: ${task.doneWhen}`,
    "",
    "Controle automatico:",
    `platform_key=${platform.key}`,
    `task_key=${task.key}`,
    `client_task_id=${input.client_task_id}`,
    input.repository_url ? "evidence_source=github" : null,
    input.repository_url ? `github_match_terms=${input.client_name},${platform.key},${task.key},${input.client_task_id}` : null,
    input.notes ? `Notas: ${input.notes}` : null
  ].filter(Boolean).join("\n");
}

export function parseTechTask(task) {
  const nameMatch = task.name.match(/^\[TECH\]\s+(.+?)\s+\/\s+(.+?)\s+\/\s+(.+)$/);
  const description = task.description ?? "";
  const fields = new Map();

  for (const line of description.split(/\r?\n/)) {
    const keyValueMatch = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*)=(.*)$/);
    if (keyValueMatch) fields.set(keyValueMatch[1], keyValueMatch[2].trim());

    const repoMatch = line.match(/^Repositorio:\s*(.+)$/i);
    if (repoMatch) fields.set("repository_url", repoMatch[1].trim());
  }

  return {
    id: task.id,
    name: task.name,
    status: String(task.status?.status ?? "").toLowerCase(),
    clientName: nameMatch?.[1] ?? fields.get("client_name") ?? "Sem cliente",
    platformLabel: nameMatch?.[2] ?? "Sem plataforma",
    title: nameMatch?.[3] ?? task.name,
    platformKey: fields.get("platform_key"),
    taskKey: fields.get("task_key"),
    clientTaskId: fields.get("client_task_id"),
    repositoryUrl: fields.get("repository_url")
  };
}

export function clientNameFromTask(task) {
  return parseTechTask(task).clientName;
}

export function canonicalStatus(status) {
  const normalized = String(status ?? "").toLowerCase();
  const aliases = new Map([
    ["to do", "a fazer"],
    ["open", "a fazer"],
    ["in progress", "em desenvolvimento"],
    ["review", "em revisao"],
    ["in review", "em revisao"],
    ["blocked", "bloqueado"],
    ["complete", "concluido"],
    ["closed", "concluido"],
    ["done", "concluido"]
  ]);

  return aliases.get(normalized) ?? normalized;
}

export function statusWeight(status, contract) {
  const normalized = canonicalStatus(status);
  const rule = contract.progressRules.find((item) => item.status === normalized);
  if (rule) return rule.weight;
  return 0;
}
