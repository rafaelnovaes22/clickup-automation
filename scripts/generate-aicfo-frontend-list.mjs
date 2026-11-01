#!/usr/bin/env node
// ============================================================================
// Aicfo-specific: cria List "Frontend" paralela à List "Modulos" na Folder
// "Plataforma Aicfo". 1 task por modulo com UI (27 dos 30 totais).
//
// Pre-requisitos:
//   1. `npm run aios:generate -- --payload-file=examples/aicfo-modules.payload.json`
//      ja foi executado (Folder + List Modulos existem)
//   2. AICFO_FRONTEND_REPO_URL preenchido no .env quando o dev frontend
//      enviar a URL. Ate la, este script cria as tasks com status "to do"
//      e a sync nao acontece automaticamente.
//
// Uso:
//   npm run aicfo:frontend:dry       (dry-run — imprime o que criaria)
//   npm run aicfo:frontend:generate  (cria as tasks; idempotente por nome)
//
// Status sync (quando AICFO_FRONTEND_REPO_URL estiver preenchido):
//   npm run aicfo:frontend:sync        (dry-run)
//   npm run aicfo:frontend:sync:live
// Ou, com URL ad-hoc:
//   npm run aios:sync -- --platform="Plataforma Aicfo" --list="Frontend" \
//                        --repository-url=$AICFO_FRONTEND_REPO_URL
// ============================================================================

import { createClickUpClient } from "./lib/clickup.mjs";
import { clickUpCredentials, loadLocalEnv } from "./lib/env.mjs";
import {
  DEFAULT_LIST_STATUSES,
  findOrCreatePlatformFolder,
  findOrCreateModuleList,
  indexParentsByModuleKey,
  listAllTasks
} from "./lib/aios-platform.mjs";

await loadLocalEnv();

const args = new Set(process.argv.slice(2));
const isLive = args.has("--live");
const isDry = !isLive;

const SPACE_NAME = "05 Institucional Novais Digital";
const FOLDER_NAME = "Plataforma Aicfo";
const LIST_NAME = "Frontend";
const MODULES_LIST_NAME = "Modulos";
const CLIENT_NAME = "Aicfo";

// Modulos com UI (27 de 30 — sem classification, decision-engine, anomaly-fraud-detection,
// alguns sub-agentes). Lista derivada do product-vision.md do Aicfo.
const FRONTEND_MODULES = [
  // Onda 0
  { key: "auth-tenant",                  wave: 0, ui: "Login + workspace setup" },
  { key: "workspace-setup",              wave: 0, ui: "Onboarding empresa + segmento + equipe" },
  { key: "billing",                      wave: 0, ui: "Pricing, checkout, gestao de plano" },
  { key: "tenant-config",                wave: 0, ui: "Settings + permissoes + tokens API" },

  // Onda 1
  { key: "ingest",                       wave: 1, ui: "4 entry points (planilha colada / PDF / Excel-CSV / manual)" },
  { key: "dre-narrative",                wave: 1, ui: "Tela DRE Facilitado com 3 cards de leitura" },
  { key: "action-plan",                  wave: 1, ui: "Tela Plano de Acao 3-horizontes" },
  { key: "hub",                          wave: 1, ui: "Tela home: lucro liquido + tags + analises anteriores" },
  { key: "export",                       wave: 1, ui: "Botao Exportar com 3 formatos (mensal/investidores/socios)" },

  // Onda 2
  { key: "cashflow",                     wave: 2, ui: "Dashboard fluxo de caixa em tempo real + projecao" },
  { key: "kpis",                         wave: 2, ui: "Cards de KPIs (CAC/LTV/payback/margem/burn/runway)" },
  { key: "score",                        wave: 2, ui: "Visualizacao do score financeiro 0-100" },
  { key: "alerts",                       wave: 2, ui: "Centro de alertas + notificacoes proativas" },
  { key: "dashboard-ceo",                wave: 2, ui: "Dashboard executivo simplificado" },

  // Onda 3
  { key: "scenarios",                    wave: 3, ui: "Simuladores dinamicos (contratacao/investimento/corte)" },
  { key: "benchmarking",                 wave: 3, ui: "Comparacao historica + setor" },
  { key: "conversational-agent",         wave: 3, ui: "Chat IA financeiro (NL)" },

  // Onda 4
  { key: "integrations-banks",           wave: 4, ui: "Tela de conexao OAuth com bancos" },
  { key: "integrations-erp-crm-payroll", wave: 4, ui: "Tela de conexao com ERP/CRM/Folha" },
  { key: "payment-execution",            wave: 4, ui: "Aprovacao multi-stage de pagamentos" },
  { key: "revenue-forecast",             wave: 4, ui: "Visualizacao de previsao de faturamento" },

  // Onda 5
  { key: "tax-suite",                    wave: 5, ui: "Painel tributario + simulador regime" },

  // Onda 6
  { key: "accounts-management",          wave: 6, ui: "Telas AP/AR + previsao inadimplencia" },
  { key: "bank-reconciliation",          wave: 6, ui: "Tela de conciliacao bancaria" },
  { key: "profitability",                wave: 6, ui: "Rentabilidade por cliente/produto/canal" },

  // Onda 7
  { key: "audit-governance",             wave: 7, ui: "Audit trail + relatorio compliance" },

  // Onda 8
  { key: "financial-planning",           wave: 8, ui: "Planejamento anual + orcamentario dinamico" },
];

const repositoryUrl = process.env.AICFO_FRONTEND_REPO_URL || null;

function taskName(module) {
  return `[FRONTEND] ${module.key} — ${module.ui}`;
}

function taskDescription(module) {
  const lines = [
    `**${module.ui}**`,
    "",
    `Frontend do modulo \`${module.key}\` da Plataforma Aicfo (onda ${module.wave}).`,
    `Contrato de API (quando existir): docs/contracts/${module.key}.openapi.yml no repo backend.`,
    `Backlog backend correspondente: task "${module.key} · ..." na List "${MODULES_LIST_NAME}" desta Folder.`,
    "",
    "Status sera atualizado automaticamente pelo `npm run aicfo:frontend:sync` (evidencia via PR/branch/CI do repo frontend no GitHub).",
    "",
    "Controle automatico:",
    `client_name=${CLIENT_NAME}`,
    `module_key=${module.key}`,
    "stage_key=frontend",
    `week=${module.wave}`,
    repositoryUrl ? `repository_url=${repositoryUrl}` : null,
    "evidence_source=github",
    `github_match_terms=${CLIENT_NAME},${module.key},frontend`,
    "module_role=stage"
  ];
  return lines.filter((line) => line !== null).join("\n");
}

function taskTags(module) {
  return ["frontend", "aicfo", `module:${module.key}`, `wave:${module.wave}`];
}

console.log(`[aicfo:frontend] Modo: ${isLive ? "LIVE" : "DRY-RUN"}`);
console.log(`[aicfo:frontend] Folder: ${FOLDER_NAME} / List: ${LIST_NAME}`);
console.log(`[aicfo:frontend] Total tasks a criar: ${FRONTEND_MODULES.length}`);
console.log("");

if (isDry) {
  console.log("Tasks que seriam criadas:");
  for (const m of FRONTEND_MODULES) {
    console.log(`  - ${taskName(m)}`);
  }
  console.log("");
  console.log("Para executar de fato: npm run aicfo:frontend:generate");
  if (!repositoryUrl) {
    console.log("");
    console.log("⚠️  NOTA: AICFO_FRONTEND_REPO_URL ainda nao foi configurado.");
    console.log("   As tasks criadas ficarao em 'to do' parado ate o repo do frontend ser conectado.");
    console.log("   Quando dev frontend enviar URL, adicionar em .env, rodar aicfo:frontend:generate");
    console.log("   de novo (atualiza descriptions) e entao: npm run aicfo:frontend:sync");
  }
  process.exit(0);
}

// ----------- LIVE MODE -----------
const { token, teamId } = clickUpCredentials();
if (!token || !teamId) {
  console.error("Faltam credenciais (CLICKUP_TOKEN, CLICKUP_TEAM_ID).");
  process.exit(1);
}
const clickUp = createClickUpClient({ token });

const folderResult = await findOrCreatePlatformFolder(clickUp, teamId, SPACE_NAME, FOLDER_NAME);
if (folderResult.created) {
  console.error(`Folder "${FOLDER_NAME}" nao existia - rode aicfo:generate primeiro.`);
  process.exit(1);
}

const listResult = await findOrCreateModuleList(clickUp, folderResult.folder.id, LIST_NAME, {
  statuses: DEFAULT_LIST_STATUSES,
  content: "Tasks de frontend da Plataforma Aicfo (1 por modulo com UI). Status via aicfo:frontend:sync."
});
console.log(`[aicfo:frontend] List "${LIST_NAME}": ${listResult.created ? "criada" : "ja existia"} (id ${listResult.list.id})`);

const existingTasks = await listAllTasks(clickUp, listResult.list.id);
const existingByName = new Set(existingTasks.map((t) => t.name));

// Parents da list Modulos para criar dependencias frontend -> backend
const modulesList = await clickUp.request("GET", `/folder/${folderResult.folder.id}/list?archived=false`)
  .then((data) => (data.lists ?? []).find((l) => l.name === MODULES_LIST_NAME));
const moduleParents = modulesList
  ? indexParentsByModuleKey(await listAllTasks(clickUp, modulesList.id))
  : new Map();
if (!modulesList) {
  console.warn(`[aicfo:frontend] List "${MODULES_LIST_NAME}" nao encontrada - dependencias nao serao criadas.`);
}

let created = 0;
let skipped = 0;
let dependencies = 0;

for (const module of FRONTEND_MODULES) {
  const name = taskName(module);
  if (existingByName.has(name)) {
    skipped += 1;
    console.log(`  = ja existe: ${name}`);
    continue;
  }

  const task = await clickUp.request("POST", `/list/${listResult.list.id}/task`, {
    name,
    description: taskDescription(module),
    status: "to do",
    tags: taskTags(module)
  });
  created += 1;
  console.log(`  + criada: ${name} (id ${task.id})`);

  const parent = moduleParents.get(module.key);
  if (parent) {
    try {
      await clickUp.request("POST", `/task/${task.id}/dependency`, { depends_on: parent.id });
      dependencies += 1;
    } catch (error) {
      console.warn(`     ! dependencia com "${parent.name}" falhou: ${error.message}`);
    }
  }
}

console.log("");
console.log(`[aicfo:frontend] Criadas: ${created} | Ja existiam: ${skipped} | Dependencias: ${dependencies}`);
console.log(`URL: https://app.clickup.com/${teamId}/v/li/${listResult.list.id}`);
