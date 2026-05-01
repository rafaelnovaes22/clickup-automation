#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const catalogPath = resolve(root, "config/activity-catalog.json");
const diagnosticPath = resolve(root, "config/diagnostic-output-contract.json");
const outputPath = resolve(root, "docs/OPERATING_MODEL.md");

const catalog = JSON.parse(await readFile(catalogPath, "utf8"));
const diagnostic = JSON.parse(await readFile(diagnosticPath, "utf8"));

function activityRow(item) {
  return `| ${item.id} | ${item.phase} | ${item.activity} | ${item.owner} | ${item.space} / ${item.list} | ${item.status} | ${item.artifact ?? ""} |`;
}

const bySpace = new Map();
for (const item of catalog.activities) {
  if (!bySpace.has(item.space)) bySpace.set(item.space, []);
  bySpace.get(item.space).push(item);
}
const sections = [...bySpace.entries()].map(([space, activities]) => [
  `## ${space}`,
  "",
  "| # | Fase | Atividade | Dono | Onde | Status | Artefato |",
  "|---|---|---|---|---|---|---|",
  ...activities.map(activityRow),
  ""
].join("\n"));

const diagnosticRules = diagnostic.decisionRules.map((rule) => [
  `### ${rule.when}`,
  "",
  "Criar:",
  ...rule.create.map((item) => `- ${item}`),
  "",
  "Artefatos:",
  ...rule.artifacts.map((item) => `- ${item}`),
  ""
].join("\n"));

const content = [
  "# Modelo operacional - ClickUp Acme",
  "",
  "Este documento e gerado a partir de `config/activity-catalog.json` e `config/diagnostic-output-contract.json`.",
  "",
  "## Regras operacionais aplicadas",
  "",
  ...catalog.rules.map((rule) => `- ${rule}`),
  "",
  "## Atividades por Space",
  "",
  ...sections,
  "## Contrato de saida do Diagnostico Fase 0",
  "",
  `Evento: \`${diagnostic.event}\``,
  "",
  "Campos obrigatorios:",
  ...diagnostic.requiredFields.map((field) => `- \`${field}\``),
  "",
  "## Regras de geracao pos-diagnostico",
  "",
  ...diagnosticRules
].join("\n");

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${content.trim()}\n`, "utf8");

console.log(`Generated ${outputPath}`);
