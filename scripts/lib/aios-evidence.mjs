import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const STAGE_TO_PATH = {
  spec: (m) => `docs/specs/${m}.md`,
  backend: (m) => `docs/specs/_backend_${m}.md`,
  frontend: (m) => `docs/specs/_frontend_${m}.md`,
  tests: (m) => `docs/specs/_tests_${m}.md`,
  review: (m) => `docs/specs/_review_${m}.md`
};

const AIOS_STATUS_ALIASES = new Map([
  // pendente / to do
  ["", "to do"],
  ["to do", "to do"],
  ["a fazer", "to do"],
  ["pendente", "to do"],
  ["open", "to do"],
  ["new", "to do"],
  // em desenvolvimento
  ["em desenvolvimento", "em desenvolvimento"],
  ["em andamento", "em desenvolvimento"],
  ["in progress", "em desenvolvimento"],
  // em revisao (com e sem acento)
  ["em revisao", "em revisão"],
  ["em revisão", "em revisão"],
  ["review", "em revisão"],
  ["in review", "em revisão"],
  // bloqueado
  ["bloqueado", "bloqueado"],
  ["blocked", "bloqueado"],
  // complete / concluido
  ["complete", "complete"],
  ["completed", "complete"],
  ["closed", "complete"],
  ["done", "complete"],
  ["concluido", "complete"],
  ["concluído", "complete"]
]);

export function canonicalAiosStatus(status) {
  const normalized = String(status ?? "").toLowerCase().trim();
  return AIOS_STATUS_ALIASES.get(normalized) ?? normalized;
}

export function collectAiosEvidence({ module, stage, projectRoot }) {
  if (!STAGE_TO_PATH[stage]) {
    return {
      found: false,
      stage,
      module,
      reason: `stage ${stage} nao tem artefato AIOS (provavelmente merge ou manual)`
    };
  }

  if (!projectRoot) {
    return {
      found: false,
      stage,
      module,
      reason: "project_root ausente na descricao da task"
    };
  }

  const fullPath = resolve(projectRoot, STAGE_TO_PATH[stage](module));

  if (!existsSync(fullPath)) {
    return {
      found: false,
      stage,
      module,
      path: fullPath,
      reason: `arquivo ausente: ${fullPath}`
    };
  }

  const content = readFileSync(fullPath, "utf8");
  const isReview = stage === "review";
  const reviewApproved = isReview && content.includes("APROVADO PARA MERGE: Sim");
  const reviewBlocked = isReview && /BLOCKER|BLOQUEADOR/i.test(content);

  return {
    found: true,
    stage,
    module,
    path: fullPath,
    reviewApproved,
    reviewBlocked,
    sizeBytes: content.length
  };
}

function latestPr(githubEvidence) {
  const prs = githubEvidence?.prs ?? [];
  if (!prs.length) return null;
  return [...prs].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))[0];
}

export function decideStatusFromAiosEvidence(evidence, githubEvidence) {
  const pr = latestPr(githubEvidence);
  const merged = Boolean(pr?.merged_at);
  const prOpen = pr?.state === "open";
  const ciFailing = githubEvidence?.ci?.state === "failing";
  const ciPassing = githubEvidence?.ci?.state === "passing" || githubEvidence?.ci == null;
  const hasBranchOrPr = Boolean(githubEvidence?.branches?.length || githubEvidence?.prs?.length);

  // BLOCKER tem prioridade absoluta
  if (evidence.reviewBlocked || ciFailing) return "bloqueado";

  // stage merge: depende quase so de PR/CI
  if (evidence.stage === "merge") {
    if (merged && ciPassing) return "complete";
    if (prOpen) return "em revisão";
    if (hasBranchOrPr || merged) return "em desenvolvimento";
    return "to do";
  }

  // stage review: terminado quando aprovado + merge + CI ok; senao em revisao se artefato existe
  if (evidence.stage === "review") {
    if (evidence.reviewApproved && merged && ciPassing) return "complete";
    if (evidence.found || prOpen) return "em revisão";
    if (hasBranchOrPr) return "em desenvolvimento";
    return "to do";
  }

  // demais stages
  if (evidence.reviewApproved && merged && ciPassing) return "complete";
  if (prOpen) return "em revisão";
  if (evidence.found || hasBranchOrPr || merged) return "em desenvolvimento";
  return "to do";
}

export function decideStatusForManualTask(githubEvidence) {
  const pr = latestPr(githubEvidence);
  const merged = Boolean(pr?.merged_at);
  const prOpen = pr?.state === "open";
  const ciFailing = githubEvidence?.ci?.state === "failing";
  const ciPassing = githubEvidence?.ci?.state === "passing" || githubEvidence?.ci == null;
  const hasBranchOrPr = Boolean(githubEvidence?.branches?.length || githubEvidence?.prs?.length);

  if (ciFailing) return "bloqueado";
  if (merged && ciPassing) return "complete";
  if (prOpen) return "em revisão";
  if (hasBranchOrPr) return "em desenvolvimento";
  return "to do";
}

export function isBlockedSignal(evidence, githubEvidence) {
  if (evidence?.reviewBlocked) return true;
  if (githubEvidence?.ci?.state === "failing") return true;
  return false;
}

export function formatAiosEvidenceComment(info, evidence, githubEvidence, nextStatus, { blocked = false } = {}) {
  const pr = latestPr(githubEvidence);

  const lines = [
    blocked ? "BLOCKER detectado pelo sync AIOS:" : "Atualizacao automatica AIOS:",
    `- Status calculado: ${nextStatus}`,
    blocked ? `- ATENCAO: revisar imediatamente - sync mantem status bloqueado ate evidencia ser limpa` : null,
    `- Cliente: ${info.clientName}`,
    `- Modulo: ${info.moduleKey}${info.moduleTier ? ` (tier ${info.moduleTier})` : ""}`,
    `- Stage: ${info.stageKey ?? "(desconhecido)"}`,
    evidence.found
      ? `- Artefato AIOS: ${evidence.path} (${evidence.sizeBytes ?? "?"} bytes)`
      : `- Artefato AIOS: ${evidence.reason ?? "nao encontrado"}`,
    evidence.reviewApproved ? "- Review: APROVADO PARA MERGE" : null,
    evidence.reviewBlocked ? "- Review: BLOCKER detectado no _review_*.md" : null,
    githubEvidence?.repo
      ? `- Repositorio: ${githubEvidence.repo.owner}/${githubEvidence.repo.repo}`
      : "- Repositorio: nao identificado",
    pr ? `- PR: #${pr.number} ${pr.state}${pr.merged_at ? " / merged" : ""}` : "- PR: nao encontrado",
    `- Branches encontradas: ${githubEvidence?.branches?.length ?? 0}`,
    githubEvidence?.ci ? `- CI: ${githubEvidence.ci.state}${githubEvidence.ci.state === "failing" ? " (BLOCKER)" : ""}` : "- CI: nao avaliado",
    githubEvidence?.errors?.length ? `- Observacoes: ${githubEvidence.errors.join(" | ")}` : null
  ];

  return lines.filter((line) => line !== null).join("\n");
}
