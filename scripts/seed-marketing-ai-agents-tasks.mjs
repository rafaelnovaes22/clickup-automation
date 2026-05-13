#!/usr/bin/env node
// seed-marketing-ai-agents-tasks.mjs
// Cria/atualiza tasks dos 7 SKUs do Acme Social no ClickUp.
// Lê estado real de cada SKU em C:\Users\Rafael\Projetos\Acme_Social\docs\forge\sku\<sku>\
// e reflete progresso (Wave entregue, lifecycle stage, custo aprovado).
//
// Uso:
//   node scripts/seed-marketing-ai-agents-tasks.mjs --dry-run   # default
//   node scripts/seed-marketing-ai-agents-tasks.mjs --live      # cria/atualiza no ClickUp
//
// Onde:
//   Space: "05 Institucional Acme"
//   List:  "Solicitacoes de agente"
//   Tasks: 7 pais + 6 subtasks por agente (Waves 1-6)

import { readFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { existsSync } from "node:fs";
import { createClickUpClient, findListByTarget } from "./lib/clickup.mjs";
import { clickUpCredentials, loadLocalEnv } from "./lib/env.mjs";

await loadLocalEnv();
const { token, teamId } = clickUpCredentials();
const args = process.argv.slice(2);
const live = args.includes("--live");
const dryRun = !live || args.includes("--dry-run");

const ACME_SOCIAL_ROOT = "C:/Users/Rafael/Projetos/Acme_Social";
const TARGET = {
  space: "05 Institucional Acme",
  list: "Solicitacoes de agente"
};

// ─── Estado real dos 7 SKUs (D2 — 2026-05-13) ────────────────────────
// Calculado a partir de docs/forge/sku/<sku>/ + project.json + entregas reais.

const SKUS = [
  {
    id: "social-media-agent",
    name: "Social Media Agent",
    priority: "P0",
    price_brl: 12.0,
    sla_seconds: 480,
    outcome: "Carrossel publicado em 4 redes (LinkedIn, IG, FB, Twitter) tom the CEO em 8 min",
    margin_percent: 84.6,
    cost_brl: 1.85,
    current_stage: "draft",
    waves: {
      wave_1_foundation:   { status: "done",   note: "✅ 22 arquivos: domain (6 entities) + ports (5) + adapters (4) + brand YAML + system prompt + smoke test" },
      wave_2_use_cases:    { status: "done",   note: "✅ GenerateCarrosselUseCase + PublishMultiNetworkUseCase + 5 fakes + 7 integration tests" },
      wave_3_tdd_red:      { status: "done",   note: "✅ Gate G6 satisfeito — 16 RED tests para ImagenAdapter, IdeogramAdapter, TwitterAdapter" },
      wave_4_build_real:   { status: "pending", note: "⏳ Impl real Imagen 4 + Ideogram + Twitter API — requer credenciais Google Cloud / Ideogram / Twitter dev account" },
      wave_5_eval_suite:   { status: "pending", note: "⏳ Eval runner CLI + LLM-as-judge + 22 eval-cases curados + CI workflow forge-test" },
      wave_6_ship_shadow:  { status: "pending", note: "⏳ Zernio integration sandbox → produção SHADOW + promoção draft → SHADOW (5 gates)" }
    },
    progress_percent: 50, // 3 waves de 6 done
    adrs: ["ADR-001-DS", "ADR-002-DS", "ADR-003-DS", "ADR-004-DS"]
  },
  {
    id: "copywriter-agent",
    name: "Copywriter Agent",
    priority: "P0",
    price_brl: 80.0,
    price_upsell_brl: 110.0,
    sla_seconds: 900,
    outcome: "Landing OR email sequence OR 5 ad variations Meta em 15 min (5 frameworks canônicos)",
    margin_percent: 95.6,
    cost_brl: 3.55,
    current_stage: "draft",
    waves: {
      wave_1_foundation:   { status: "done",    note: "✅ 7 domain entities + use case polimórfico + 6 prompts (3 frameworks + 3 outputs) + 32 smoke tests + Prisma model CopywriterExecution" },
      wave_2_split_usecases:{ status: "pending", note: "⏳ Split GenerateCopywriterOutputUseCase → 3 use cases especializados (Landing/Email/AdSet) + BriefingIntake Zod + VoiceValidator LLM-judge" },
      wave_3_tdd_red:      { status: "pending", note: "⏳ RED phase tests para frameworks + Diversity check (cosine sim)" },
      wave_4_build_real:   { status: "pending", note: "⏳ Implementação real chamando ClaudeAdapter (Opus 4.6) com 5 frameworks + few-shot examples" },
      wave_5_eval_suite:   { status: "pending", note: "⏳ 24 eval-cases (10 landing + 7 email + 5 ads + 2 transversais) + 7 prompts juiz canônicos" },
      wave_6_ship_shadow:  { status: "pending", note: "⏳ Output JSON v1.0.0 versionado (ADR-003-CW) + handoff Designer/Webflow/Flodesk/Meta + SHADOW" }
    },
    progress_percent: 17, // 1 wave de 6 done
    adrs: ["ADR-001-CW", "ADR-002-CW", "ADR-003-CW", "ADR-004-CW"]
  },
  {
    id: "designer-agent",
    name: "Designer Agent",
    priority: "P0",
    price_brl: 20.0,
    sla_seconds: 1200,
    outcome: "Carrossel de 5-7 slides com brand Acme ≥ 99% em 20 min (gate hard individual por slide)",
    margin_percent: 89.9,
    cost_brl: 2.03,
    current_stage: "draft",
    waves: {
      wave_1_foundation:   { status: "done",    note: "✅ 3 domain entities (DesignBriefing, BrandComplianceReport, DesignCarrossel) + DesignCarrosselUseCase + brand-validator-judge prompt + 20 tests (15 domain + 5 integration) + Prisma model DesignerExecution. Reuso 85% (Slide, adapters, ports vindos do social-media)" },
      wave_2_curation:     { status: "pending", note: "⏳ Curadoria de 50 imagens humanas para calibrar BrandValidator (concordância ≥ 90% como gate inquebrantável)" },
      wave_3_tdd_red:      { status: "pending", note: "⏳ RED phase tests para retry policy + cross-provider fallback" },
      wave_4_build_real:   { status: "pending", note: "⏳ ImagenAdapter + IdeogramAdapter implementação real (compartilhado com social-media)" },
      wave_5_eval_suite:   { status: "pending", note: "⏳ 26 eval-cases (6 critical) + 3 adversariais (brand 'quase certo') + cross-judge Sonnet × Opus" },
      wave_6_ship_shadow:  { status: "pending", note: "⏳ Composability — pode ser chamado por outros agentes (ADR-004-DES) + SHADOW" }
    },
    progress_percent: 17,
    adrs: ["ADR-001-DES", "ADR-002-DES", "ADR-003-DES", "ADR-004-DES"]
  },
  {
    id: "trafego-agent",
    name: "Gestor de Tráfego Agent",
    priority: "P1",
    price_brl: 50.0,
    sla_seconds: 300,
    outcome: "Campanha Meta completa (1 Campaign + ≥1 AdSet + 3-5 Ads A/B) + bandit + tracking em 5 min de setup",
    margin_percent: 87.0,
    cost_brl: 6.5,
    current_stage: "draft",
    waves: {
      wave_1_foundation:   { status: "pending", note: "⏳ MetaAdsAdapter versionado v19/v20 + BanditStrategy port + EventBridge cron 4h + Mixpanel attribution" },
      wave_2_use_cases:    { status: "pending", note: "⏳ CreateCampaignUseCase + OptimizeBanditUseCase (epsilon-greedy) + AttributionTrackingUseCase" },
      wave_3_tdd_red:      { status: "pending", note: "⏳ RED phase tests" },
      wave_4_build_real:   { status: "pending", note: "⏳ Meta Marketing API integration + retry policy (ADR-002-TF)" },
      wave_5_eval_suite:   { status: "pending", note: "⏳ 24 eval-cases (5 objetivos Meta + 5 convergência bandit + 3 rejeição + targeting + edge cases)" },
      wave_6_ship_shadow:  { status: "pending", note: "⏳ Special Ad Categories OUT (ADR-005-TF) + separação contratual ad spend (ADR-004-TF) + SHADOW 30d" }
    },
    progress_percent: 5, // Apenas spec/diagnose/plan/tasks/eval-cases/decisions (pipeline forge done; code pending)
    adrs: ["ADR-001-TF", "ADR-002-TF", "ADR-003-TF", "ADR-004-TF", "ADR-005-TF"]
  },
  {
    id: "video-editor-agent",
    name: "Editor de Vídeo Agent",
    priority: "P1",
    price_brl: 30.0,
    sla_seconds: 600,
    outcome: "Vídeo curto (30-90s) em 3 aspect ratios + legendas 5 idiomas a partir de input longo (cortar, NÃO Veo 3) em 10 min",
    margin_percent: 84.0,
    cost_brl: 4.8,
    current_stage: "draft",
    waves: {
      wave_1_foundation:   { status: "pending", note: "⏳ ElevenLabs Scribe adapter + FFmpeg Lambda layer + lint rule no-veo3" },
      wave_2_use_cases:    { status: "pending", note: "⏳ VideoCutterUseCase + ScriptGeneratorUseCase + cap 60min default + surcharge 60-90min" },
      wave_3_tdd_red:      { status: "pending", note: "⏳ RED phase tests" },
      wave_4_build_real:   { status: "pending", note: "⏳ Implementação real Scribe v2 + Claude Sonnet decisão de cortes + FFmpeg" },
      wave_5_eval_suite:   { status: "pending", note: "⏳ 22 eval-cases + multi-aspect 9:16/1:1/16:9 + legendas SRT + hardcoded (ADR-003-VE)" },
      wave_6_ship_shadow:  { status: "pending", note: "⏳ Lint no-veo3 ativo no CI + SHADOW" }
    },
    progress_percent: 5,
    adrs: ["ADR-001-VE", "ADR-002-VE", "ADR-003-VE", "ADR-004-VE", "ADR-005-VE"],
    notes: "⚠️ Split aprovado (ADR-001-PROJ): este SKU = corte de input. video-editor-agent-premium R$ 150 (Veo 3) diferido para wave 2."
  },
  {
    id: "estrategista-agent",
    name: "Estrategista Agent",
    priority: "P2",
    price_brl: 100.0,
    sla_seconds: 120,
    outcome: "Relatório AARRR com 3 gargalos priorizados + 3 ações concretas em 2 min via Mixpanel + Opus",
    margin_percent: 87.0,
    cost_brl: 13.0,
    current_stage: "draft",
    waves: {
      wave_1_foundation:   { status: "pending", note: "⏳ MixpanelAdapter read-only + PostgresAnalytics adapter stub + cache Redis TTL 24h/1h" },
      wave_2_use_cases:    { status: "pending", note: "⏳ PreCheckDataQualityUseCase (gate constitucional) + AnalyzeFunnel + GenerateRecommendations + GenerateReport (Markdown) + CheckGroundedness" },
      wave_3_tdd_red:      { status: "pending", note: "⏳ RED phase tests" },
      wave_4_build_real:   { status: "pending", note: "⏳ Implementação real mixpanel-node + JQL custom + Claude Opus 4.6" },
      wave_5_eval_suite:   { status: "pending", note: "⏳ 22 eval-cases (5 data quality + 8 AARRR + 4 acionabilidade + 3 confidence + 2 edge) + 6 critical_path" },
      wave_6_ship_shadow:  { status: "pending", note: "⏳ Groundedness 100% gate + few-shots + actionability rubric + SHADOW" }
    },
    progress_percent: 5,
    adrs: ["ADR-001-EST", "ADR-002-EST", "ADR-003-EST", "ADR-004-EST"]
  },
  {
    id: "atendimento-dm-agent",
    name: "Atendimento DM Agent (24/7)",
    priority: "P2",
    price_brl: 5.0,
    sla_seconds: 10,
    outcome: "DM Instagram/FB/WhatsApp respondido em <10s + BANT score + handoff CRM ou escalonamento humano",
    margin_percent: 92.6,
    cost_brl: 0.37,
    current_stage: "draft_internal_only",
    waves: {
      wave_1_foundation:   { status: "pending", note: "⏳ MetaMessagingAdapter + WhatsAppCloudAdapter + CRMAdapter (HubSpot/RD) + state Redis" },
      wave_2_use_cases:    { status: "pending", note: "⏳ RespondDMUseCase + QualifyLeadBANTUseCase + HandoffCRM + EscalateToHumanUseCase" },
      wave_3_tdd_red:      { status: "pending", note: "⏳ RED phase tests adversariais (criticality A)" },
      wave_4_build_real:   { status: "pending", note: "⏳ Claude Haiku 4.5 + Meta APIs + CRM integrations" },
      wave_5_eval_suite:   { status: "pending", note: "⏳ 25+ eval-cases adversarial-heavy (jailbreak, off-topic, abuso, latência)" },
      wave_6_ship_shadow:  { status: "blocked", note: "🔴 BLOQUEADO: SHADOW interno-only (Acme própria) — externo exige DPO designado + DPA LGPD assinado (ADR-003-PROJ). Decisão founder até 2026-06-01." }
    },
    progress_percent: 5,
    adrs: ["ADR-001-DM", "ADR-002-DM", "ADR-003-DM", "ADR-004-DM"],
    notes: "⚠️ Criticality A — LGPD blocking. Wave 6 externa só após DPO. Plano de mitigação em docs/forge/sku/atendimento-dm-agent/lgpd-mitigation.md"
  }
];

// ─── Renderização da task pai e subtasks ─────────────────────────────

function statusEmoji(status) {
  switch (status) {
    case "done": return "✅";
    case "in_progress": return "🟡";
    case "blocked": return "🔴";
    case "pending":
    default: return "⏳";
  }
}

function waveLabel(key) {
  return key.replace(/_/g, " ").replace(/wave (\d)/i, "Wave $1");
}

function buildParentTaskName(sku) {
  return `[ACME-SOCIAL] ${sku.name} (${sku.priority})`;
}

function buildParentTaskDescription(sku) {
  const wavesText = Object.entries(sku.waves)
    .map(([key, wave]) => `${statusEmoji(wave.status)} **${waveLabel(key)}** — ${wave.note}`)
    .join("\n");

  return [
    `## Outcome contratual (C2)`,
    sku.outcome,
    ``,
    `## Pricing & SLA`,
    `- **Preço:** R$ ${sku.price_brl.toFixed(2)}${sku.price_upsell_brl ? ` (upsell R$ ${sku.price_upsell_brl.toFixed(2)})` : ""}`,
    `- **SLA:** ${sku.sla_seconds}s (${(sku.sla_seconds / 60).toFixed(1)} min)`,
    `- **Custo estimado:** R$ ${sku.cost_brl.toFixed(2)} (margem ${sku.margin_percent.toFixed(1)}%)`,
    ``,
    `## Lifecycle atual`,
    `- **Stage:** \`${sku.current_stage}\``,
    `- **Progresso geral:** ${sku.progress_percent}%`,
    ``,
    `## Waves (1-6)`,
    wavesText,
    ``,
    `## ADRs locais`,
    sku.adrs.map((adr) => `- ${adr}`).join("\n"),
    sku.notes ? `\n## Observações\n${sku.notes}` : "",
    ``,
    `---`,
    `🔗 **Repositório:** https://github.com/acme-startup/marketing-ai-agents`,
    `📂 **Artefatos forge:** \`docs/forge/sku/${sku.id}/\``,
    `📊 **Status global:** \`docs/forge/STATUS_D2.md\``
  ].filter(Boolean).join("\n");
}

function buildSubtaskName(waveKey, wave) {
  const emoji = statusEmoji(wave.status);
  return `${emoji} ${waveLabel(waveKey)}`;
}

function buildSubtaskDescription(wave) {
  return [`**Status:** \`${wave.status}\``, ``, wave.note].join("\n");
}

// Mapeia status interno → status ClickUp da lista "Solicitacoes de agente":
// Status disponíveis: "to do" | "em desenvolvimento" | "em revisão" | "bloqueado" | "complete"
function clickUpStatusForWave(waveStatus) {
  switch (waveStatus) {
    case "done": return "complete";
    case "in_progress": return "em desenvolvimento";
    case "blocked": return "bloqueado";
    case "pending":
    default: return "to do";
  }
}

function clickUpStatusForParent(sku) {
  const allDone = Object.values(sku.waves).every((w) => w.status === "done");
  if (allDone) return "complete";

  const anyBlocked = Object.values(sku.waves).some((w) => w.status === "blocked");
  if (anyBlocked) return "bloqueado";

  const anyDone = Object.values(sku.waves).some((w) => w.status === "done");
  if (anyDone) return "em desenvolvimento";

  return "to do";
}

// ─── Main ────────────────────────────────────────────────────────────

async function run() {
  console.log(`\n🎯 Acme Social — Seed de tasks no ClickUp`);
  console.log(`   Mode:  ${live ? "🔴 LIVE (vai criar/atualizar)" : "🔵 DRY-RUN (só preview)"}`);
  console.log(`   Space: "${TARGET.space}"`);
  console.log(`   List:  "${TARGET.list}"`);
  console.log(`   SKUs:  ${SKUS.length}\n`);

  if (live && (!token || !teamId)) {
    console.error("❌ Missing ClickUp credentials (CLICKUP_TOKEN ou ACME_INTERNAL_CLICKUP_TOKEN).");
    process.exit(1);
  }

  // Renderiza preview
  for (const sku of SKUS) {
    const status = clickUpStatusForParent(sku);
    console.log(`\n────────────────────────────────────────────────────────────`);
    console.log(`📦 ${buildParentTaskName(sku)}`);
    console.log(`   Status ClickUp: ${status} | Progresso: ${sku.progress_percent}% | Stage: ${sku.current_stage}`);
    console.log(`   Outcome: ${sku.outcome.slice(0, 80)}...`);
    console.log(`   Preço: R$ ${sku.price_brl.toFixed(2)} | Custo: R$ ${sku.cost_brl.toFixed(2)} | Margem: ${sku.margin_percent.toFixed(1)}%`);
    console.log(`   Subtasks:`);
    for (const [key, wave] of Object.entries(sku.waves)) {
      console.log(`     ${buildSubtaskName(key, wave)} → ${clickUpStatusForWave(wave.status)}`);
    }
  }

  if (dryRun) {
    console.log(`\n\n✅ DRY-RUN completo. Sem chamadas à API.`);
    console.log(`   Para criar/atualizar no ClickUp, rode: node scripts/seed-marketing-ai-agents-tasks.mjs --live\n`);
    return;
  }

  // LIVE mode — cria/atualiza no ClickUp
  console.log(`\n\n🔴 LIVE — chamando API ClickUp...\n`);

  const clickUp = createClickUpClient({ token });
  let list;
  try {
    list = await findListByTarget(clickUp, teamId, TARGET);
    console.log(`✅ List encontrada: ${list.name} (id=${list.id})`);
  } catch (err) {
    console.error(`❌ Erro ao localizar list: ${err.message}`);
    console.error(`   Crie a list "${TARGET.list}" no space "${TARGET.space}" primeiro (rode npm run bootstrap).`);
    process.exit(1);
  }

  // Buscar tasks existentes na list para idempotência
  const existingTasks = await listAllTasksWithSubtasks(clickUp, list.id);
  console.log(`   Tasks existentes na list: ${existingTasks.length}\n`);

  for (const sku of SKUS) {
    const parentName = buildParentTaskName(sku);
    const existingParent = existingTasks.find((t) => t.name === parentName);

    const parentPayload = {
      name: parentName,
      description: buildParentTaskDescription(sku),
      status: clickUpStatusForParent(sku),
      tags: ["marketing-ai-agents", "agentic_saas", `priority-${sku.priority.toLowerCase()}`, sku.current_stage]
    };

    let parentTask;
    if (existingParent) {
      console.log(`   🔄 Atualizando: ${parentName}`);
      parentTask = await clickUp.request("PUT", `/task/${existingParent.id}`, parentPayload);
    } else {
      console.log(`   ➕ Criando: ${parentName}`);
      parentTask = await clickUp.request("POST", `/list/${list.id}/task`, parentPayload);
    }

    // Criar/atualizar subtasks (Waves 1-6)
    for (const [key, wave] of Object.entries(sku.waves)) {
      const subtaskName = buildSubtaskName(key, wave);
      const subtaskPayload = {
        name: subtaskName,
        description: buildSubtaskDescription(wave),
        status: clickUpStatusForWave(wave.status),
        parent: parentTask.id,
        tags: ["wave", `wave-${key.match(/wave_(\d)/)?.[1] || "x"}`]
      };

      const existingSubtask = (existingParent?.subtasks || []).find((s) =>
        s.name.replace(/^[^\s]+\s+/, "") === subtaskName.replace(/^[^\s]+\s+/, "")
      );

      if (existingSubtask) {
        console.log(`      🔄 Subtask: ${subtaskName}`);
        await clickUp.request("PUT", `/task/${existingSubtask.id}`, subtaskPayload);
      } else {
        console.log(`      ➕ Subtask: ${subtaskName}`);
        await clickUp.request("POST", `/list/${list.id}/task`, subtaskPayload);
      }
    }
  }

  console.log(`\n\n✅ Seed concluído. 7 tasks pai + 42 subtasks criadas/atualizadas no ClickUp.`);
}

async function listAllTasksWithSubtasks(clickUp, listId) {
  const params = new URLSearchParams({
    archived: "false",
    subtasks: "true",
    include_closed: "true",
    page: "0"
  });
  const data = await clickUp.request("GET", `/list/${listId}/task?${params.toString()}`);
  return data.tasks ?? [];
}

run().catch((err) => {
  console.error(`\n❌ Erro fatal: ${err.message}`);
  console.error(err.stack);
  process.exit(1);
});
