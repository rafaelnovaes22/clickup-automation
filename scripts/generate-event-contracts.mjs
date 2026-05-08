#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const templatesPath = resolve(root, "config/clickup-task-templates.json");
const outputPath = resolve(root, "docs/EVENT_CONTRACTS.md");

const config = JSON.parse(await readFile(templatesPath, "utf8"));

function fieldRow(field) {
  const options = field.options?.length ? field.options.join(", ") : "";
  const example = field.example === undefined ? "" : String(field.example);
  return `| \`${field.key}\` | ${field.label} | ${field.type} | ${field.required ? "sim" : "nao"} | ${options} | ${example} |`;
}

function renderTemplate(template) {
  return [
    `## ${template.name}`,
    "",
    `- Evento: \`${template.key}\``,
    `- Delivery type: \`${template.delivery_type ?? "any"}\``,
    `- Destino: \`${template.target.space} / ${template.target.list}\``,
    `- Status desejado: \`${template.target.desiredStatus}\``,
    "",
    "### Campos",
    "",
    "| Key | Label | Tipo | Obrigatorio | Opcoes | Exemplo |",
    "|---|---|---|---|---|---|",
    ...(template.fields ?? []).map(fieldRow),
    "",
    "### Atividades disparadas",
    "",
    ...((template.activities ?? []).map((activity) => `- Quando \`${activity.trigger}\`: ${activity.action}`)),
    "",
    "### Subtasks padrao",
    "",
    ...template.subtasks.map((subtask) => `- ${subtask}`),
    ""
  ].join("\n");
}

const content = [
  "# Contratos de eventos ClickUp Acme",
  "",
  "Este documento e gerado a partir de `config/clickup-task-templates.json`.",
  "Ele define os campos que o backend deve receber antes de criar tasks e disparar atividades correspondentes.",
  "",
  `Delivery types suportados: ${(config.deliveryTypes ?? []).map((dt) => `\`${dt}\``).join(", ") || "n/d"}.`,
  "",
  config.deliveryTypeNotes ? `> ${config.deliveryTypeNotes}` : "",
  "",
  ...config.templates.map(renderTemplate)
].filter((line) => line !== null && line !== undefined).join("\n");

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${content.trim()}\n`, "utf8");

console.log(`Generated ${outputPath}`);
