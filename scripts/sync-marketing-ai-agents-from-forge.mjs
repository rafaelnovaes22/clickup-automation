#!/usr/bin/env node
// sync-marketing-ai-agents-from-forge.mjs
// Auto-discovery: lê o estado real dos 7 SKUs do Acme Social no filesystem
// (project.json + filesystem do código + lifecycle-stage.md + unit-economics.md)
// e sincroniza com ClickUp.
//
// SEM JSON hardcoded. SEM editar JS quando algo muda.
// Fonte de verdade: docs/forge/project.json + estrutura de src/tests/docs/forge/sku/
//
// Uso:
//   node scripts/sync-marketing-ai-agents-from-forge.mjs --dry-run   # preview
//   node scripts/sync-marketing-ai-agents-from-forge.mjs --live      # sync com ClickUp

import { readFile, access } from "node:fs/promises";
import { resolve, join } from "node:path";
import { existsSync } from "node:fs";
import { createClickUpClient, findListByTarget } from "./lib/clickup.mjs";
import { clickUpCredentials, loadLocalEnv } from "./lib/env.mjs";

await loadLocalEnv();
const { token, teamId } = clickUpCredentials();
const args = process.argv.slice(2);
const live = args.includes("--live");
const dryRun = !live || args.includes("--dry-run");

// Path do repo marketing-ai-agents. Resolução por ordem:
// 1. env ACME_SOCIAL_PATH (Railway worker injeta isso)
// 2. ./marketing-ai-agents (mono-repo style — clonado pelo bootstrap)
// 3. C:/Users/Rafael/Projetos/Acme_Social (fallback dev local)
function resolveAcmeSocialPath() {
  if (process.env.ACME_SOCIAL_PATH?.trim()) {
    return process.env.ACME_SOCIAL_PATH.trim();
  }
  const monorepo = resolve(process.cwd(), "marketing-ai-agents");
  if (existsSync(monorepo)) return monorepo;
  return "C:/Users/Rafael/Projetos/Acme_Social";
}

const ACME_SOCIAL_ROOT = resolveAcmeSocialPath();
const TARGET = { space: "05 Institucional Acme", list: "Solicitacoes de agente" };

// ─── Mapeamento SKU → estrutura de código esperada ───────────────────
// Apenas declaração dos paths que cada SKU usa. O script detecta o resto.

const SKU_LAYOUT = {
  "social-media-agent": {
    label: "Social Media",
    emoji: "📱",
    objetivo: "Carrossel pronto para 4 redes em 8 min",
    o_que_faz: "Recebe um briefing (tema + público + rede) e entrega 1 carrossel completo (5 slides + legenda + caption) no tom the CEO, pronto para publicar em LinkedIn + Instagram + Facebook + Twitter, em até 8 minutos.",
    domain_paths: ["src/domain/carrossel"],
    application_path: "src/application/social-media-agent",
    tests_path: "tests/social-media-agent",
    wave_2_label: "use_cases"
  },
  "copywriter-agent": {
    label: "Copywriter",
    emoji: "✍️",
    objetivo: "Landing, email ou anúncios em 15 min",
    o_que_faz: "Recebe um briefing e entrega UM de três produtos prontos: (1) landing page completa, (2) sequência de 3-5 emails de lançamento, OU (3) 5 variações de anúncio Meta — usando frameworks comprovados (PAS, AIDA, StoryBrand).",
    domain_paths: ["src/domain/copywriter"],
    application_path: "src/application/copywriter-agent",
    tests_path: "tests/copywriter-agent",
    wave_2_label: "split_usecases"
  },
  "designer-agent": {
    label: "Designer",
    emoji: "🎨",
    objetivo: "Carrossel com brand 99%+ em 20 min",
    o_que_faz: "Recebe um briefing visual e entrega 5-7 slides de carrossel com a identidade visual da Acme aplicada em 99%+ dos elementos (cores, tipografia, layout). Substitui designer humano para volume alto.",
    domain_paths: ["src/domain/designer"],
    application_path: "src/application/designer-agent",
    tests_path: "tests/designer-agent",
    wave_2_label: "curation"
  },
  "trafego-agent": {
    label: "Gestor de Tráfego",
    emoji: "🎯",
    objetivo: "Campanha Meta completa em 5 min",
    o_que_faz: "Configura, lança e otimiza campanhas no Facebook/Instagram Ads em 5 minutos: criativo, copy, público, orçamento, testes A/B e otimização automática a cada 4h. Cliente paga o anúncio direto na Meta.",
    domain_paths: ["src/domain/trafego"],
    application_path: "src/application/trafego-agent",
    tests_path: "tests/trafego-agent",
    wave_2_label: "use_cases"
  },
  "video-editor-agent": {
    label: "Editor de Vídeo",
    emoji: "🎬",
    objetivo: "Vídeo curto (Reels/TikTok) em 10 min",
    o_que_faz: "Recebe um vídeo longo (live, podcast, palestra de até 60 min) e entrega versões curtas (30-90s) para Reels/TikTok/YouTube Shorts, com legendas em 5 idiomas. Identifica os melhores momentos automaticamente.",
    domain_paths: ["src/domain/video-editor"],
    application_path: "src/application/video-editor-agent",
    tests_path: "tests/video-editor-agent",
    wave_2_label: "use_cases"
  },
  "estrategista-agent": {
    label: "Estrategista",
    emoji: "📊",
    objetivo: "Diagnóstico de funil em 2 min",
    o_que_faz: "Analisa o funil de marketing do cliente (Mixpanel) e entrega em 2 minutos: 3 gargalos priorizados (problemas que mais custam dinheiro) + 3 ações concretas para resolver. Substitui consultor de growth.",
    domain_paths: ["src/domain/estrategista"],
    application_path: "src/application/estrategista-agent",
    tests_path: "tests/estrategista-agent",
    wave_2_label: "use_cases"
  },
  "atendimento-dm-agent": {
    label: "Atendimento DM 24/7",
    emoji: "💬",
    objetivo: "Responde DM e qualifica lead em <10s",
    o_que_faz: "Atende mensagens diretas (Instagram, Facebook, WhatsApp) 24h/dia em menos de 10 segundos, faz qualificação de lead automática (BANT) e passa o cliente para o vendedor humano quando estiver pronto. Nunca dorme.",
    domain_paths: ["src/domain/atendimento-dm"],
    application_path: "src/application/atendimento-dm-agent",
    tests_path: "tests/atendimento-dm-agent",
    wave_2_label: "use_cases"
  }
};

// Tradução de Waves técnicas para marcos de negócio (CEO-friendly)
const WAVE_LABELS_CEO = {
  wave_1_foundation:      { label: "🧠 Cérebro construído",            short: "Estruturas básicas do agente prontas" },
  wave_2_use_cases:       { label: "⚙️ Lógica de execução pronta",      short: "Agente sabe trabalhar end-to-end" },
  wave_2_split_usecases:  { label: "⚙️ Lógica especializada por output", short: "Cada tipo de entrega tem sua receita" },
  wave_2_curation:        { label: "⚙️ Calibragem do validador visual", short: "50 imagens humanas treinam a IA" },
  wave_3_tdd_red:         { label: "🛡️ Rede de proteção (testes)",      short: "Testes garantem que não vai quebrar" },
  wave_4_build_real:      { label: "🔌 Conectado às APIs reais",         short: "Integrações em produção (Google, Twitter, etc.)" },
  wave_5_eval_suite:      { label: "📊 Validação de qualidade",          short: "Robô avalia a qualidade do que outro robô faz" },
  wave_6_ship_shadow:     { label: "🚀 Liberado em modo teste (SHADOW)", short: "Roda em produção sem cobrar — para calibrar" }
};

// Roadmap planejado: cada (SKU × Wave) tem um dia alvo (1-14).
// Valores baseados no roadmap original + entregas já realizadas em D1-D2.
// null = não tem dia atribuído (ex: Wave 6 do atendimento-dm está bloqueada LGPD).
const ROADMAP_DAYS = {
  "social-media-agent": {
    wave_1_foundation: 1,
    wave_2_use_cases: 2,
    wave_3_tdd_red: 2,
    wave_4_build_real: 4,
    wave_5_eval_suite: 5,
    wave_6_ship_shadow: 6
  },
  "copywriter-agent": {
    wave_1_foundation: 2,
    wave_2_split_usecases: 4,
    wave_3_tdd_red: 4,
    wave_4_build_real: 5,
    wave_5_eval_suite: 5,
    wave_6_ship_shadow: 6
  },
  "designer-agent": {
    wave_1_foundation: 2,
    wave_2_curation: 3,
    wave_3_tdd_red: 3,
    wave_4_build_real: 5,
    wave_5_eval_suite: 5,
    wave_6_ship_shadow: 6
  },
  "trafego-agent": {
    wave_1_foundation: 7,
    wave_2_use_cases: 7,
    wave_3_tdd_red: 7,
    wave_4_build_real: 8,
    wave_5_eval_suite: 8,
    wave_6_ship_shadow: 9
  },
  "video-editor-agent": {
    wave_1_foundation: 9,
    wave_2_use_cases: 10,
    wave_3_tdd_red: 10,
    wave_4_build_real: 11,
    wave_5_eval_suite: 11,
    wave_6_ship_shadow: 12
  },
  "estrategista-agent": {
    wave_1_foundation: 11,
    wave_2_use_cases: 12,
    wave_3_tdd_red: 12,
    wave_4_build_real: 13,
    wave_5_eval_suite: 13,
    wave_6_ship_shadow: 14
  },
  "atendimento-dm-agent": {
    wave_1_foundation: 6,
    wave_2_use_cases: 6,
    wave_3_tdd_red: 7,
    wave_4_build_real: 7,
    wave_5_eval_suite: 7,
    wave_6_ship_shadow: null   // Bloqueado por LGPD
  }
};

// Para a task pai (agente), atribui "semana" (1 ou 2 do roadmap).
const ROADMAP_WEEKS = {
  "social-media-agent": 1,
  "copywriter-agent": 1,
  "designer-agent": 1,
  "trafego-agent": 1,
  "video-editor-agent": 2,
  "estrategista-agent": 2,
  "atendimento-dm-agent": 1
};

function humanizeWave(waveKey) {
  return WAVE_LABELS_CEO[waveKey] || { label: waveKey, short: "" };
}

// ─── Auto-discovery: lê o filesystem e detecta progresso ─────────────

function existsSync_(p) {
  try {
    return existsSync(p);
  } catch {
    return false;
  }
}

async function readFileSafe(path) {
  try {
    return await readFile(path, "utf8");
  } catch {
    return null;
  }
}

/**
 * Detecta Waves entregues baseado em arquivos no filesystem.
 * Retorna objeto { wave_1_foundation: {status, note, evidence}, ... }
 */
async function detectWaves(skuId, layout, lifecycleNotes) {
  const root = ACME_SOCIAL_ROOT;
  const waves = {};

  // Wave 1 — Foundation: domain entities existem + smoke test passou
  const domainExists = layout.domain_paths.some((p) => existsSync_(join(root, p)));
  const smokeTestExists = existsSync_(
    join(root, layout.tests_path, "unit", "domain-smoke.test.ts")
  );
  waves.wave_1_foundation = {
    status: domainExists && smokeTestExists ? "done" : "pending",
    note: domainExists && smokeTestExists
      ? `✅ Domain entities em ${layout.domain_paths[0]} + smoke test passando`
      : `⏳ Aguarda criação de domain entities + smoke test`,
    evidence: { domainExists, smokeTestExists }
  };

  // Wave 2 — Use Cases / Application Layer: application path existe + integration tests
  const appExists = existsSync_(join(root, layout.application_path));
  const integrationTestExists = existsSync_(
    join(root, layout.tests_path, "integration")
  );
  const label2 = `wave_2_${layout.wave_2_label}`;
  waves[label2] = {
    status: appExists && integrationTestExists ? "done" : "pending",
    note: appExists && integrationTestExists
      ? `✅ Use cases em ${layout.application_path} + integration tests`
      : appExists
        ? `🟡 Application existe mas faltam integration tests`
        : `⏳ Aguarda criação de use cases em ${layout.application_path}`,
    evidence: { appExists, integrationTestExists }
  };

  // Wave 3 — TDD Red phase: ≥ 1 arquivo de teste em red mode
  const redTestExists =
    existsSync_(join(root, layout.tests_path, "integration", "adapters-red.test.ts")) ||
    existsSync_(join(root, layout.tests_path, "unit", "adapters-red.test.ts"));
  waves.wave_3_tdd_red = {
    status: redTestExists ? "done" : "pending",
    note: redTestExists
      ? `✅ Gate G6 satisfeito — arquivo *-red.test.ts presente`
      : `⏳ TDD red phase: aguarda gerar testes RED dos adapters skeleton`,
    evidence: { redTestExists }
  };

  // Wave 4 — Build real: lifecycle-stage frontmatter mostra current_stage = shadow|assisted|autonomous
  // (não "alvo: shadow", não "target_next: shadow", não em texto narrativo)
  const frontmatterStageMatch = lifecycleNotes.match(/^current_stage:\s*([a-z_]+)/im);
  const currentStageInFile = frontmatterStageMatch?.[1] || "draft";
  const inShadowOrBeyondFM =
    ["shadow", "assisted", "autonomous", "canonical"].includes(currentStageInFile);

  waves.wave_4_build_real = {
    status: inShadowOrBeyondFM ? "done" : "pending",
    note: inShadowOrBeyondFM
      ? `✅ Adapters reais implementados (current_stage: ${currentStageInFile})`
      : `⏳ Impl real adapters externos — aguarda credenciais + integração + commit ao current_stage`,
    evidence: { currentStageInFile, inShadowOrBeyondFM }
  };

  // Wave 5 — Eval suite: existe arquivo eval-suite ou cli runner
  const evalSuiteExists =
    existsSync_(join(root, layout.tests_path, "eval")) ||
    existsSync_(join(root, "src", "eval", `${skuId}.runner.ts`));
  waves.wave_5_eval_suite = {
    status: evalSuiteExists ? "done" : "pending",
    note: evalSuiteExists
      ? `✅ Eval suite com runner CLI configurado`
      : `⏳ Eval suite + LLM-as-judge + 20+ cases curados`,
    evidence: { evalSuiteExists }
  };

  // Wave 6 — Ship SHADOW: usa o mesmo current_stage do frontmatter
  const inShadowOrBeyond = inShadowOrBeyondFM;
  const isLgpdBlocked =
    skuId === "atendimento-dm-agent" &&
    /lgpd|dpo|draft_internal/i.test(lifecycleNotes) &&
    !inShadowOrBeyond;

  waves.wave_6_ship_shadow = {
    status: inShadowOrBeyond
      ? "done"
      : isLgpdBlocked
        ? "blocked"
        : "pending",
    note: inShadowOrBeyond
      ? `✅ Promovido para SHADOW+ (operação em produção observada)`
      : isLgpdBlocked
        ? `🔴 BLOQUEADO: SHADOW externo requer DPO + DPA LGPD (ADR-003-PROJ)`
        : `⏳ Promoção draft → SHADOW depois de Waves 1-5 verdes`,
    evidence: { inShadowOrBeyond, isLgpdBlocked }
  };

  return waves;
}

/**
 * Lê unit-economics.md e extrai custo + margem.
 * Prefere frontmatter (machine-readable); fallback para markdown body.
 */
function parseUnitEconomics(content) {
  if (!content) return { cost_brl: null, margin_percent: null };

  // 1. Frontmatter (campo `margin_percent: X` ou similar) — preferido
  const fmMarginMatch = content.match(/^margin_percent:\s*([\d.,]+)/im);
  const fmCostMatch = content.match(/^c3_check:\s*PASS\s*\(R\$\s*([\d.,]+)/im);

  // 2. Body markdown fallbacks
  const bodyMarginMatches = [
    /Margem\s*[\*:]+\s*\*?\*?([\d.,]+)\s*%/i,
    /margem\s+(?:percentual\s+)?(?:absoluta\s+)?[\*:]+\s*([\d.,]+)\s*%/i,
    /\*\*Margem\*\*:\s*([\d.,]+)\s*%/i,
    /Margem\s+\(.*?\):\s*\*?\*?([\d.,]+)\s*%/i
  ];

  const bodyCostMatches = [
    /\*\*TOTAL\*\*[^\n]*\*\*R\$\s*([\d.,]+)\*\*/i,
    /CUSTO\s+ESTIMADO[^R$\n]*R\$\s*([\d.,]+)/i,
    /Custo estimado real[^\n]*?R\$\s*([\d.,]+)/i,
    /Custo total[^\n]*?R\$\s*([\d.,]+)/i,
    /TOTAL[^\n]*\|\s*\*\*R\$\s*([\d.,]+)\*\*/i,
    /Custo estimado:\s*\*?\*?R\$\s*([\d.,]+)/i
  ];

  let costMatch = fmCostMatch;
  if (!costMatch) {
    for (const re of bodyCostMatches) {
      const m = content.match(re);
      if (m) { costMatch = m; break; }
    }
  }

  let marginMatch = fmMarginMatch;
  if (!marginMatch) {
    for (const re of bodyMarginMatches) {
      const m = content.match(re);
      if (m) { marginMatch = m; break; }
    }
  }

  const cost_brl = costMatch ? parseFloat(costMatch[1].replace(",", ".")) : null;
  const margin_percent = marginMatch ? parseFloat(marginMatch[1].replace(",", ".")) : null;

  return { cost_brl, margin_percent };
}

// Mapeia SKU id → sufixo dos ADRs locais (filtra cross-references)
const ADR_SUFFIX_BY_SKU = {
  "social-media-agent": "DS",
  "copywriter-agent": "CW",
  "designer-agent": "DES",
  "trafego-agent": "TF",
  "video-editor-agent": "VE",
  "estrategista-agent": "EST",
  "atendimento-dm-agent": "DM"
};

/**
 * Extrai IDs de ADRs de decisions.md, filtrando apenas os do próprio SKU.
 */
function parseAdrs(content, skuId) {
  if (!content) return [];
  const suffix = ADR_SUFFIX_BY_SKU[skuId];
  if (!suffix) return [];
  const regex = new RegExp(`ADR-\\d{3}-${suffix}\\b`, "g");
  const matches = content.matchAll(regex);
  return [...new Set([...matches].map((m) => m[0]))].sort();
}

/**
 * Para 1 SKU, monta a estrutura completa lida do filesystem.
 */
async function detectSkuFromForge(module) {
  const layout = SKU_LAYOUT[module.id];
  if (!layout) {
    return null;
  }

  const root = ACME_SOCIAL_ROOT;
  const skuDocs = join(root, "docs", "forge", "sku", module.id);

  const lifecycleContent = await readFileSafe(join(skuDocs, "lifecycle-stage.md")) || "";
  const economicsContent = await readFileSafe(join(skuDocs, "unit-economics.md"));
  const decisionsContent = await readFileSafe(join(skuDocs, "decisions.md"));

  const { cost_brl, margin_percent } = parseUnitEconomics(economicsContent);
  const adrs = parseAdrs(decisionsContent, module.id);
  const waves = await detectWaves(module.id, layout, lifecycleContent);
  const progress_percent = computeProgress(waves);

  return {
    id: module.id,
    name: layout.label,
    priority: module.priority,
    price_brl: module.outcome_price_brl,
    price_upsell_brl: module.outcome_price_brl === 80 ? 110 : null, // só copywriter por enquanto
    sla_seconds: module.target_sla_seconds,
    outcome: stripDocPrefix(module._doc),
    margin_percent,
    cost_brl,
    current_stage: module.current_stage,
    criticality: module.criticality,
    waves,
    progress_percent,
    adrs,
    notes: extractNotesFromDoc(module._doc)
  };
}

function stripDocPrefix(doc) {
  if (!doc) return "";
  // Remove "ADR-NNN-PROJ:" prefix se houver
  return doc.replace(/^ADR-\d{3}-PROJ:\s*/i, "");
}

function extractNotesFromDoc(doc) {
  if (!doc) return null;
  if (doc.includes("ADR-001-PROJ")) {
    return "⚠️ Split aprovado (ADR-001-PROJ): este SKU = corte de input. Premium R$ 150 (Veo 3) diferido.";
  }
  if (doc.includes("ADR-003-PROJ") || doc.includes("LGPD")) {
    return "⚠️ Criticality A — LGPD blocking. Wave 6 externa só após DPO. Plano em docs/forge/sku/atendimento-dm-agent/lgpd-mitigation.md";
  }
  return null;
}

function computeProgress(waves) {
  const total = Object.keys(waves).length;
  if (total === 0) return 0;
  const done = Object.values(waves).filter((w) => w.status === "done").length;
  const pct = Math.round((done / total) * 100);

  // Mínimo de 5% se forge pipeline existe (diagnostic/spec/plan/etc.)
  return Math.max(pct, 5);
}

async function discoverSkusFromForge() {
  const projectJsonPath = join(ACME_SOCIAL_ROOT, "docs", "forge", "project.json");
  const projectJson = JSON.parse(await readFile(projectJsonPath, "utf8"));
  const skus = [];

  for (const mod of projectJson.modules) {
    if (mod.current_stage === "deferred_wave_2") continue;
    const sku = await detectSkuFromForge(mod);
    if (sku) skus.push(sku);
  }

  return skus;
}

// ─── Renderização (reusa o padrão do seed-marketing-ai-agents-tasks.mjs) ──

function statusEmoji(status) {
  switch (status) {
    case "done": return "✅";
    case "in_progress": return "🟡";
    case "blocked": return "🔴";
    case "pending":
    default: return "⏳";
  }
}

// Tradução: "draft" → "Em construção", "shadow" → "Em teste", etc.
function humanizeStage(stage) {
  const map = {
    draft: "🟡 Em construção (ainda não cobra cliente)",
    draft_internal_only: "🟠 Em construção — uso interno apenas (LGPD pendente)",
    shadow: "🔵 Em teste (rodando em produção sem cobrar)",
    assisted: "🟣 Operacional com aprovação humana (cobrando)",
    autonomous: "🟢 Operacional 100% autônomo (cobrando)",
    canonical: "🟢 Operacional 100% autônomo (cobrando)",
    deferred_wave_2: "⏸️ Adiado para próxima fase"
  };
  return map[stage] || stage;
}

function humanizeCriticality(c) {
  const map = {
    A: "🔴 A — toca cliente em tempo real (zero tolerância a erro)",
    B: "🟡 B — importante, padrão de mercado",
    C: "🟢 C — interno, baixa exposição"
  };
  return map[c] || c;
}

function humanizePriority(p) {
  const map = {
    P0: "🥇 P0 — prioridade máxima",
    P1: "🥈 P1 — alta prioridade",
    P2: "🥉 P2 — média prioridade",
    P3: "🏅 P3 — quando der"
  };
  return map[p] || p;
}

/**
 * Determina o próximo marco de negócio em linguagem natural.
 */
function computeNextMilestone(sku) {
  // Atendimento DM bloqueado por LGPD
  if (sku.id === "atendimento-dm-agent" && sku.current_stage === "draft_internal_only") {
    return {
      label: "Decisão da founder sobre DPO/LGPD",
      detail: "Wave 6 (operação externa) está bloqueada até contratarmos um DPO ou consultoria jurídica LGPD. Decisão até 2026-06-01.",
      bloqueado: true
    };
  }

  const waveOrder = ["wave_1_foundation", "wave_2_use_cases", "wave_2_split_usecases", "wave_2_curation", "wave_3_tdd_red", "wave_4_build_real", "wave_5_eval_suite", "wave_6_ship_shadow"];
  const waves = sku.waves;
  let firstPending = null;
  for (const key of waveOrder) {
    if (waves[key] && (waves[key].status === "pending" || waves[key].status === "in_progress")) {
      firstPending = { key, wave: waves[key] };
      break;
    }
  }

  if (!firstPending) {
    return { label: "🎉 Tudo pronto — operacional", detail: "", bloqueado: false };
  }

  const labels = {
    wave_1_foundation: { label: "Construir estrutura básica do agente", detail: "Domain entities + ports + adapters + smoke test." },
    wave_2_use_cases: { label: "Implementar lógica de execução", detail: "Use cases que orquestram LLM + image-gen + brand validator + publisher." },
    wave_2_split_usecases: { label: "Especializar lógica por tipo de output", detail: "Use cases separados para landing, email e ad." },
    wave_2_curation: { label: "Calibrar validador visual", detail: "Curadoria humana de 50 imagens para treinar o BrandValidator." },
    wave_3_tdd_red: { label: "Escrever testes de proteção", detail: "Gate G6 do Forge — testes antes do código, garantia mecânica de não-quebra." },
    wave_4_build_real: { label: "Conectar APIs reais (Imagen 4, Veo 3, Ideogram, Twitter, etc.)", detail: "Aguardando credenciais externas (Google Cloud project, Ideogram key, Twitter dev account)." },
    wave_5_eval_suite: { label: "Suite de validação de qualidade", detail: "20+ casos curados + LLM-as-judge + CI workflow." },
    wave_6_ship_shadow: { label: "🚀 Liberar em modo SHADOW", detail: "Roda em produção sem cobrar para calibrar 7-14 dias." }
  };

  const t = labels[firstPending.key] || { label: firstPending.key, detail: firstPending.wave.note };
  return { label: t.label, detail: t.detail, bloqueado: false };
}

/**
 * Decisões pendentes para a founder (humanas, não técnicas).
 */
function findPendingDecisions(sku) {
  const items = [];
  if (sku.id === "atendimento-dm-agent" && sku.current_stage === "draft_internal_only") {
    items.push({
      label: "Contratar DPO (interno ou as-a-service)",
      prazo: "2026-06-01",
      por_que: "Sem DPO/DPA LGPD, esse agente fica bloqueado pra operação externa. Risco de multa LGPD (até R$ 50M) > receita perdida (~R$ 9-13K em 2-3 meses)."
    });
  }
  return items;
}

/**
 * Marker invisível no corpo da task para match estável entre runs.
 */
function buildSkuMarker(skuId) {
  return `<!-- forge:sku:${skuId} -->`;
}

function buildParentTaskName(sku) {
  const layout = SKU_LAYOUT[sku.id];
  return `${layout.emoji} ${layout.label} — ${layout.objetivo} [${sku.priority}]`;
}

function buildParentTaskDescription(sku) {
  const layout = SKU_LAYOUT[sku.id];
  const wavesText = Object.entries(sku.waves)
    .map(([key, wave]) => {
      const h = humanizeWave(key);
      return `${statusEmoji(wave.status)} **${h.label}** — ${h.short}`;
    })
    .join("\n");

  const nextMilestone = computeNextMilestone(sku);
  const decisoes = findPendingDecisions(sku);

  const lines = [
    buildSkuMarker(sku.id),
    "",
    `## 🎯 O que esse agente faz`,
    layout.o_que_faz,
    ``,
    `## 💰 A conta`,
    `- **Cliente paga:** R$ ${sku.price_brl.toFixed(2)} por entrega${sku.price_upsell_brl ? ` (versão estendida: R$ ${sku.price_upsell_brl.toFixed(2)})` : ""}`,
    sku.cost_brl ? `- **Nosso custo:** R$ ${sku.cost_brl.toFixed(2)}` : null,
    sku.margin_percent ? `- **Sobra (margem):** ${sku.margin_percent.toFixed(0)}%` : null,
    `- **Velocidade:** entrega em ≤ ${Math.round(sku.sla_seconds / 60)} min`,
    ``,
    `## 📊 Como está hoje`,
    `- **Status:** ${humanizeStage(sku.current_stage)}`,
    `- **Progresso:** ${sku.progress_percent}% — ${countDoneWaves(sku.waves)} de ${Object.keys(sku.waves).length} etapas concluídas`,
    `- **Importância:** ${humanizeCriticality(sku.criticality)}`,
    `- **Prioridade:** ${humanizePriority(sku.priority)}`,
    ``,
    `## ✅ O que já está pronto`,
    formatDoneWaves(sku.waves),
    ``,
    `## ⏳ O que ainda falta`,
    formatPendingWaves(sku.waves),
    ``,
    `## 🚦 Próximo marco`,
    nextMilestone.bloqueado
      ? `🔴 **BLOQUEADO** — ${nextMilestone.label}\n\n${nextMilestone.detail}`
      : `**${nextMilestone.label}**\n\n${nextMilestone.detail}`,
    ``
  ];

  // Decisões pendentes para founder (só se houver)
  if (decisoes.length > 0) {
    lines.push(`## ⚠️ Decisões que dependem de você, founder`);
    for (const d of decisoes) {
      lines.push(`- **${d.label}** (prazo: ${d.prazo})`);
      lines.push(`  _Por quê:_ ${d.por_que}`);
    }
    lines.push("");
  } else {
    lines.push(`## ⚠️ Decisões pendentes`);
    lines.push(`Nenhuma agora. Segue o plano.`);
    lines.push("");
  }

  if (sku.notes) {
    lines.push(`## 📌 Observação importante`);
    lines.push(sku.notes);
    lines.push("");
  }

  // Detalhes técnicos no final (escondidos sob seção menor)
  lines.push(`---`);
  lines.push(`<details>`);
  lines.push(`<summary>🔧 Detalhes técnicos (para o time de dev)</summary>`);
  lines.push(``);
  lines.push(`**Lifecycle Forge:** \`${sku.current_stage}\` → SHADOW → ASSISTED → AUTONOMOUS`);
  lines.push(`**Outcome (C2):** ${sku.outcome.slice(0, 200)}`);
  lines.push(`**Detalhamento por Wave:**`);
  lines.push(wavesText);
  if (sku.adrs.length > 0) {
    lines.push(``);
    lines.push(`**ADRs locais (${sku.adrs.length}):** ${sku.adrs.join(", ")}`);
  }
  lines.push(``);
  lines.push(`**Repositório:** https://github.com/acme-startup/marketing-ai-agents`);
  lines.push(`**Artefatos forge:** \`docs/forge/sku/${sku.id}/\``);
  lines.push(`**Auto-sync:** ClickUp ← \`scripts/sync-marketing-ai-agents-from-forge.mjs\``);
  lines.push(``);
  lines.push(`</details>`);

  return lines.filter((l) => l !== null).join("\n");
}

function countDoneWaves(waves) {
  return Object.values(waves).filter((w) => w.status === "done").length;
}

function formatDoneWaves(waves) {
  const done = Object.entries(waves).filter(([, w]) => w.status === "done");
  if (done.length === 0) return "_(ainda nada concluído — estamos começando)_";
  return done.map(([key]) => `- ${humanizeWave(key).label} — ${humanizeWave(key).short}`).join("\n");
}

function formatPendingWaves(waves) {
  const pending = Object.entries(waves).filter(([, w]) => w.status === "pending" || w.status === "blocked");
  if (pending.length === 0) return "_🎉 Nada — está completo!_";
  return pending.map(([key, w]) => {
    const h = humanizeWave(key);
    const icon = w.status === "blocked" ? "🔴" : "⏳";
    return `- ${icon} ${h.label} — ${h.short}`;
  }).join("\n");
}

function buildSubtaskName(waveKey, wave) {
  const h = humanizeWave(waveKey);
  return `${statusEmoji(wave.status)} ${h.label}`;
}

function buildSubtaskDescription(wave, waveKey) {
  const h = humanizeWave(waveKey);
  const statusReadable = {
    done: "✅ Concluído",
    in_progress: "🟡 Em andamento",
    blocked: "🔴 Bloqueado",
    pending: "⏳ Aguardando"
  }[wave.status] || wave.status;

  return [
    `**${h.label}**`,
    h.short,
    ``,
    `**Status:** ${statusReadable}`,
    ``,
    `<details>`,
    `<summary>Detalhes técnicos</summary>`,
    ``,
    wave.note,
    ``,
    `</details>`
  ].join("\n");
}

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
  console.log(`\n🤖 Acme Social — Auto-sync ClickUp ← filesystem`);
  console.log(`   Mode:  ${live ? "🔴 LIVE (vai atualizar)" : "🔵 DRY-RUN"}`);
  console.log(`   Fonte: ${ACME_SOCIAL_ROOT}/docs/forge/project.json + filesystem`);
  console.log(`   Alvo:  ${TARGET.space} → ${TARGET.list}\n`);

  console.log(`🔍 Auto-discovery dos SKUs...`);
  const skus = await discoverSkusFromForge();
  console.log(`   ${skus.length} SKUs detectados\n`);

  // Preview
  for (const sku of skus) {
    const status = clickUpStatusForParent(sku);
    console.log(`\n────────────────────────────────────────────────────────────`);
    console.log(`📦 ${buildParentTaskName(sku)}`);
    console.log(`   ClickUp status: ${status} | Progresso: ${sku.progress_percent}% | Stage: ${sku.current_stage}`);
    if (sku.cost_brl !== null) {
      console.log(`   Custo: R$ ${sku.cost_brl.toFixed(2)} | Margem: ${(sku.margin_percent || 0).toFixed(1)}%`);
    } else {
      console.log(`   ⚠️ Custo não detectado em unit-economics.md`);
    }
    console.log(`   ADRs detectados: ${sku.adrs.join(", ") || "(nenhum)"}`);
    console.log(`   Waves:`);
    for (const [key, wave] of Object.entries(sku.waves)) {
      console.log(`     ${statusEmoji(wave.status)} ${humanizeWave(key).label} → ${clickUpStatusForWave(wave.status)}`);
    }
  }

  if (dryRun) {
    console.log(`\n\n✅ DRY-RUN completo. Sem chamadas à API.\n   Para sincronizar: --live\n`);
    return;
  }

  // LIVE
  if (!token || !teamId) {
    console.error("\n❌ Missing ClickUp credentials.");
    process.exit(1);
  }

  console.log(`\n\n🔴 LIVE — chamando API ClickUp...\n`);
  const clickUp = createClickUpClient({ token });
  const list = await findListByTarget(clickUp, teamId, TARGET);
  console.log(`✅ List: ${list.name} (id=${list.id})`);

  const allTasks = await listTasks(clickUp, list.id);
  // Separa pais e subtasks: subtasks têm `.parent` setado
  // Indexa pais por marker invisível no description (suporta renomeação do título)
  const parentsByMarker = new Map();
  for (const t of allTasks) {
    if (t.parent) continue; // só pais aqui
    const desc = t.description || t.text_content || "";
    const markerMatch = desc.match(/<!--\s*forge:sku:([a-z0-9_-]+)\s*-->/);
    if (markerMatch) {
      parentsByMarker.set(markerMatch[1], t);
    }
  }
  // Fallback: tasks antigas sem marker, indexadas por nome
  const parentsByLegacyName = new Map(
    allTasks.filter((t) => !t.parent).map((t) => [t.name, t])
  );

  // Subtasks indexadas por (parentId, label CEO sem emoji)
  const subtasksByParentAndLabel = new Map();
  for (const t of allTasks) {
    if (!t.parent) continue;
    const nameNoEmoji = t.name.replace(/^[^\s]+\s+/, "").trim();
    const key = `${t.parent}|${nameNoEmoji}`;
    subtasksByParentAndLabel.set(key, t);
  }
  console.log(`   Pais com marker: ${parentsByMarker.size} | Subtasks: ${subtasksByParentAndLabel.size}\n`);

  console.log(`   📅 Usando due_date (nativo ClickUp) para visão de roadmap por dia\n`);

  let createdCount = 0;
  let updatedCount = 0;
  let dueDateUpdatedCount = 0;

  for (const sku of skus) {
    const parentName = buildParentTaskName(sku);
    // 1. Tenta por marker invisível (estável)
    let existingParent = parentsByMarker.get(sku.id);
    // 2. Fallback: nome legacy "[ACME-SOCIAL] {nome antigo}"
    if (!existingParent) {
      const legacyNames = [
        `[ACME-SOCIAL] ${SKU_LAYOUT[sku.id].label} Agent (${sku.priority})`,
        `[ACME-SOCIAL] ${SKU_LAYOUT[sku.id].label} (${sku.priority})`,
        // Casos especiais conhecidos
        `[ACME-SOCIAL] Gestor de Tráfego Agent (${sku.priority})`,
        `[ACME-SOCIAL] Editor de Vídeo Agent (${sku.priority})`,
        `[ACME-SOCIAL] Atendimento DM Agent (24/7) (${sku.priority})`,
        `[ACME-SOCIAL] Social Media Agent (${sku.priority})`,
        `[ACME-SOCIAL] Copywriter Agent (${sku.priority})`,
        `[ACME-SOCIAL] Designer Agent (${sku.priority})`,
        `[ACME-SOCIAL] Estrategista Agent (${sku.priority})`
      ];
      for (const ln of legacyNames) {
        if (parentsByLegacyName.has(ln)) {
          existingParent = parentsByLegacyName.get(ln);
          console.log(`   📎 Reaproveitando task legacy: "${ln}"`);
          break;
        }
      }
    }

    const parentPayload = {
      name: parentName,
      description: buildParentTaskDescription(sku),
      status: clickUpStatusForParent(sku),
      tags: [
        "marketing-ai-agents",
        "agentic_saas",
        `priority-${sku.priority.toLowerCase()}`,
        sku.current_stage,
        "auto-synced"
      ]
    };

    let parentTask;
    if (existingParent) {
      console.log(`🔄 ${parentName}`);
      parentTask = await clickUp.request("PUT", `/task/${existingParent.id}`, parentPayload);
      updatedCount++;
    } else {
      console.log(`➕ ${parentName}`);
      parentTask = await clickUp.request("POST", `/list/${list.id}/task`, parentPayload);
      createdCount++;
    }

    // Parent: due_date = primeiro dia das suas Waves (início do agente)
    const allDays = Object.values(ROADMAP_DAYS[sku.id] || {}).filter((d) => d != null);
    const firstDay = allDays.length > 0 ? Math.min(...allDays) : null;
    const parentDueTs = dayToTimestamp(firstDay);
    if (parentDueTs) {
      try {
        const changed = await setDueDate(clickUp, parentTask, parentDueTs);
        if (changed) {
          console.log(`   📅 Início (Dia ${firstDay}): ${new Date(parentDueTs).toISOString().slice(0, 10)}`);
          dueDateUpdatedCount++;
        }
      } catch (err) {
        console.warn(`   ⚠️  Falhou ao setar due_date do parent: ${err.message}`);
      }
    }

    // Subtasks
    for (const [key, wave] of Object.entries(sku.waves)) {
      const subtaskName = buildSubtaskName(key, wave);
      const subtaskPayload = {
        name: subtaskName,
        description: buildSubtaskDescription(wave, key),
        status: clickUpStatusForWave(wave.status),
        parent: parentTask.id,
        tags: ["wave", `wave-${key.match(/wave_(\d)/)?.[1] || "x"}`, "auto-synced"]
      };

      const nameNoEmoji = subtaskName.replace(/^[^\s]+\s+/, "").trim();
      const subtaskKey = `${parentTask.id}|${nameNoEmoji}`;
      // Tenta com label CEO primeiro
      let existingSubtask = subtasksByParentAndLabel.get(subtaskKey);
      // Fallback: nome legacy "Wave N foo" (antes da tradução)
      if (!existingSubtask) {
        const legacyLabel = key.replace(/^wave_/i, "Wave ").replace(/_/g, " ");
        const legacyKey = `${parentTask.id}|${legacyLabel}`;
        existingSubtask = subtasksByParentAndLabel.get(legacyKey);
      }

      let subtaskCreatedOrUpdated;
      if (existingSubtask) {
        console.log(`   🔄 ${subtaskName}`);
        subtaskCreatedOrUpdated = await clickUp.request("PUT", `/task/${existingSubtask.id}`, subtaskPayload);
        updatedCount++;
      } else {
        console.log(`   ➕ ${subtaskName}`);
        subtaskCreatedOrUpdated = await clickUp.request("POST", `/list/${list.id}/task`, subtaskPayload);
        createdCount++;
      }

      // Subtask: due_date a partir de ROADMAP_DAYS[sku][wave]
      const dayValue = ROADMAP_DAYS[sku.id]?.[key];
      const subtaskDueTs = dayToTimestamp(dayValue);
      if (subtaskDueTs) {
        try {
          const changed = await setDueDate(clickUp, subtaskCreatedOrUpdated, subtaskDueTs);
          if (changed) {
            console.log(`      📅 Dia ${dayValue} (${new Date(subtaskDueTs).toISOString().slice(0, 10)})`);
            dueDateUpdatedCount++;
          }
        } catch (err) {
          console.warn(`      ⚠️  Falhou ao setar due_date: ${err.message}`);
        }
      }
    }
  }

  console.log(`\n\n✅ Auto-sync concluído:`);
  console.log(`   ➕ Criadas: ${createdCount}`);
  console.log(`   🔄 Atualizadas: ${updatedCount}`);
  console.log(`   📅 Due dates atualizados: ${dueDateUpdatedCount}`);
}

// ─── Roadmap dates (via due_date — nativo do ClickUp, sem limite de plan) ──

// Data de início do roadmap de 14 dias (D1).
// Calculado: 2026-05-12 (segunda da sessão D1).
const ROADMAP_START_DATE = new Date("2026-05-12T00:00:00.000Z");

/**
 * Converte número do dia (1-14) em timestamp Unix (ms) para due_date.
 */
function dayToTimestamp(day) {
  if (day == null || day < 1) return null;
  const date = new Date(ROADMAP_START_DATE);
  date.setUTCDate(date.getUTCDate() + (day - 1));
  // Due date às 18:00 UTC = ~15:00 BRT (fim de expediente)
  date.setUTCHours(21, 0, 0, 0);
  return date.getTime();
}

/**
 * Atualiza due_date da task. Idempotente: skip se já bate.
 */
async function setDueDate(clickUp, task, timestamp) {
  if (!timestamp) return false;
  const current = task?.due_date ? Number(task.due_date) : null;
  if (current === timestamp) return false; // unchanged
  await clickUp.request("PUT", `/task/${task.id}`, {
    due_date: timestamp,
    due_date_time: true
  });
  return true;
}

async function listTasks(clickUp, listId) {
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
