#!/usr/bin/env node
// ============================================================================
// Aicfo-specific: cria List "Frontend" paralela à List "Modulos" na Folder
// "Plataforma Aicfo". 1 task por modulo com UI (24 dos 30 totais).
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
//   npm run aicfo:frontend:generate  (cria as tasks)
//
// Status sync: quando AICFO_FRONTEND_REPO_URL estiver preenchido, rodar:
//   npm run aios:sync -- --platform="Plataforma Aicfo" --list="Frontend" \
//                        --repository-url=$AICFO_FRONTEND_REPO_URL
// ============================================================================

import { createClickUpClient } from "./lib/clickup.mjs";
import { clickUpCredentials, loadLocalEnv } from "./lib/env.mjs";

await loadLocalEnv();

const args = new Set(process.argv.slice(2));
const isLive = args.has("--live");
const isDry = !isLive;

const FOLDER_NAME = "Plataforma Aicfo";
const LIST_NAME = "Frontend";

// Modulos com UI (24 de 30 — sem classification, decision-engine, anomaly-fraud-detection,
// alguns sub-agentes). Lista derivada do product-vision.md do Aicfo.
const FRONTEND_MODULES = [
  // Onda 0
  { key: "auth-tenant",                  ui: "Login + workspace setup" },
  { key: "workspace-setup",              ui: "Onboarding empresa + segmento + equipe" },
  { key: "billing",                      ui: "Pricing, checkout, gestao de plano" },
  { key: "tenant-config",                ui: "Settings + permissoes + tokens API" },

  // Onda 1
  { key: "ingest",                       ui: "4 entry points (planilha colada / PDF / Excel-CSV / manual)" },
  { key: "dre-narrative",                ui: "Tela DRE Facilitado com 3 cards de leitura" },
  { key: "action-plan",                  ui: "Tela Plano de Acao 3-horizontes" },
  { key: "hub",                          ui: "Tela home: lucro liquido + tags + analises anteriores" },
  { key: "export",                       ui: "Botao Exportar com 3 formatos (mensal/investidores/socios)" },

  // Onda 2
  { key: "cashflow",                     ui: "Dashboard fluxo de caixa em tempo real + projecao" },
  { key: "kpis",                         ui: "Cards de KPIs (CAC/LTV/payback/margem/burn/runway)" },
  { key: "score",                        ui: "Visualizacao do score financeiro 0-100" },
  { key: "alerts",                       ui: "Centro de alertas + notificacoes proativas" },
  { key: "dashboard-ceo",                ui: "Dashboard executivo simplificado" },

  // Onda 3
  { key: "scenarios",                    ui: "Simuladores dinamicos (contratacao/investimento/corte)" },
  { key: "benchmarking",                 ui: "Comparacao historica + setor" },
  { key: "conversational-agent",         ui: "Chat IA financeiro (NL)" },

  // Onda 4
  { key: "integrations-banks",           ui: "Tela de conexao OAuth com bancos" },
  { key: "integrations-erp-crm-payroll", ui: "Tela de conexao com ERP/CRM/Folha" },
  { key: "payment-execution",            ui: "Aprovacao multi-stage de pagamentos" },
  { key: "revenue-forecast",             ui: "Visualizacao de previsao de faturamento" },

  // Onda 5
  { key: "tax-suite",                    ui: "Painel tributario + simulador regime" },

  // Onda 6
  { key: "accounts-management",          ui: "Telas AP/AR + previsao inadimplencia" },
  { key: "bank-reconciliation",          ui: "Tela de conciliacao bancaria" },
  { key: "profitability",                ui: "Rentabilidade por cliente/produto/canal" },

  // Onda 7
  { key: "audit-governance",             ui: "Audit trail + relatorio compliance" },

  // Onda 8
  { key: "financial-planning",           ui: "Planejamento anual + orcamentario dinamico" },
];

console.log(`[aicfo:frontend] Modo: ${isLive ? "LIVE" : "DRY-RUN"}`);
console.log(`[aicfo:frontend] Folder: ${FOLDER_NAME} / List: ${LIST_NAME}`);
console.log(`[aicfo:frontend] Total tasks a criar: ${FRONTEND_MODULES.length}`);
console.log("");

if (isDry) {
  console.log("Tasks que seriam criadas:");
  for (const m of FRONTEND_MODULES) {
    console.log(`  - [${m.key}] ${m.ui}`);
  }
  console.log("");
  console.log("Para executar de fato: npm run aicfo:frontend:generate");
  console.log("");
  console.log("⚠️  NOTA: AICFO_FRONTEND_REPO_URL ainda nao foi configurado.");
  console.log("   As tasks criadas ficarao em 'to do' parado ate o repo do frontend ser conectado.");
  console.log("   Quando dev frontend enviar URL, adicionar em .env e rodar:");
  console.log("     npm run aios:sync -- --platform='Plataforma Aicfo' --list='Frontend'");
  process.exit(0);
}

// ----------- LIVE MODE -----------
const { token, teamId } = clickUpCredentials();
if (!token || !teamId) {
  console.error("Faltam credenciais (CLICKUP_TOKEN, CLICKUP_TEAM_ID).");
  process.exit(1);
}
const clickUp = createClickUpClient({ token });

console.log("[aicfo:frontend] LIVE mode — implementacao pendente.");
console.log("Esta funcao sera completada quando:");
console.log("  1. `npm run aios:generate -- --payload-file=examples/aicfo-modules.payload.json` ja tiver rodado");
console.log("  2. URL do repo frontend Aicfo for fornecida pelo dev frontend interno");
console.log("");
console.log("Implementacao prevista:");
console.log("  a. Localizar Folder 'Plataforma Aicfo' (criada por aios:generate)");
console.log("  b. Criar List 'Frontend' dentro da Folder (com 5 status: to do | em desenvolvimento | em revisao | bloqueado | complete)");
console.log("  c. Criar 1 task por modulo do array FRONTEND_MODULES, com:");
console.log("     - title: '[FRONTEND] {key} — {ui}'");
console.log("     - description: contendo link pro contrato gerado em docs/contracts/{key}.openapi.yml");
console.log("     - tags: ['frontend', 'aicfo', `module:${key}`, `wave:${wave}`]");
console.log("  d. Criar dependencia entre cada task da Frontend e a task correspondente em Modulos");
console.log("");
console.log("Por enquanto, voce pode criar manualmente no ClickUp seguindo o array acima.");
process.exit(0);
