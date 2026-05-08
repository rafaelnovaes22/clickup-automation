#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repositoryPath = resolve(root, "config/tech-operational-repository.json");
const platformPath = resolve(root, "config/tech-platform-catalog.json");
const outputPath = resolve(root, "docs/TECH_OPERATING_MODEL.md");

const repository = JSON.parse(await readFile(repositoryPath, "utf8"));
const platforms = JSON.parse(await readFile(platformPath, "utf8"));

function roleSection(role) {
  return [
    `### ${role.label}`,
    "",
    ...role.responsibilities.map((item) => `- ${item}`),
    ""
  ].join("\n");
}

function activitySection(activity) {
  return [
    `### ${activity.name}`,
    "",
    `- ID: \`${activity.id}\``,
    `- Delivery type: \`${activity.delivery_type ?? "any"}\``,
    `- Tipo: \`${activity.type}\``,
    `- Papel: \`${activity.role}\``,
    `- Gatilho: \`${activity.trigger}\``,
    `- Onde: \`${activity.clickup.space} / ${activity.clickup.list}\``,
    `- Artefato: \`${activity.artifact}\``,
    "",
    "Entradas:",
    ...activity.inputs.map((item) => `- \`${item}\``),
    "",
    "Saidas:",
    ...activity.outputs.map((item) => `- \`${item}\``),
    "",
    `Automacao atual: ${activity.automation.current}`,
    `Proxima automacao: ${activity.automation.next}`,
    ""
  ].join("\n");
}

function platformSection(platform) {
  const dtList = (platform.delivery_types ?? []).map((dt) => `\`${dt}\``).join(", ") || "any";
  return [
    `### ${platform.label}`,
    "",
    `- Key: \`${platform.key}\``,
    `- Delivery types aplicaveis: ${dtList}`,
    `- Dono padrao: \`${platform.defaultOwnerRole}\``,
    platform.ai_enabled ? "- IA-enabled: sim (exige prompts/eval/observabilidade de IA)" : null,
    "",
    "| Task | Artefato | Done when |",
    "|---|---|---|",
    ...platform.tasks.map((task) => `| ${task.title} | \`${task.artifact}\` | ${task.doneWhen} |`),
    ""
  ].filter((line) => line !== null).join("\n");
}

const content = [
  "# Modelo operacional Tech",
  "",
  "Este documento e gerado a partir de `config/tech-operational-repository.json` e `config/tech-platform-catalog.json`.",
  "",
  "## Principios",
  "",
  ...repository.principles.map((item) => `- ${item}`),
  "",
  "## Fluxo de status",
  "",
  repository.statusFlow.map((item) => `\`${item}\``).join(" -> "),
  "",
  "## Papeis",
  "",
  ...repository.roles.map(roleSection),
  "## Atividades operacionais Tech",
  "",
  ...repository.activities.map(activitySection),
  "## Plataformas e tarefas automaticas",
  "",
  ...platforms.platforms.map(platformSection),
  "## Backlog de automacao",
  "",
  "| ID | Prioridade | Nome | Descricao |",
  "|---|---|---|---|",
  ...repository.automationBacklog.map((item) => `| \`${item.id}\` | ${item.priority} | ${item.name} | ${item.description} |`)
].join("\n");

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${content.trim()}\n`, "utf8");

console.log(`Generated ${outputPath}`);
