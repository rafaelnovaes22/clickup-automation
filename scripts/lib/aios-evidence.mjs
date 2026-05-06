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
  ["", "pendente"],
  ["to do", "pendente"],
  ["a fazer", "pendente"],
  ["pendente", "pendente"],
  ["open", "pendente"],
  ["new", "pendente"],
  ["in progress", "em andamento"],
  ["em andamento", "em andamento"],
  ["em desenvolvimento", "em andamento"],
  ["em revisao", "em andamento"],
  ["em revisão", "em andamento"],
  ["review", "em andamento"],
  ["in review", "em andamento"],
  ["bloqueado", "em andamento"],
  ["blocked", "em andamento"],
  ["complete", "concluido"],
  ["completed", "concluido"],
  ["closed", "concluido"],
  ["done", "concluido"],
  ["concluido", "concluido"],
  ["concluído", "concluido"]
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
  const ciPassing = githubEvidence?.ci?.state === "passing" || githubEvidence?.ci == null;
  const hasBranchOrPr = Boolean(githubEvidence?.branches?.length || githubEvidence?.prs?.length);

  // concluido: review aprovado + merge + CI ok (ou stage merge com merge confirmado)
  if (evidence.stage === "merge") {
    return merged && ciPassing ? "concluido" : (hasBranchOrPr || merged) ? "em andamento" : "pendente";
  }

  if (evidence.reviewApproved && merged && ciPassing) return "concluido";

  // em andamento: qualquer sinal de trabalho em curso (artefato existe, PR aberto/mergeado, branch, ou BLOCKER)
  if (evidence.found || evidence.reviewBlocked || hasBranchOrPr || merged) return "em andamento";

  // pendente: nada comecou
  return "pendente";
}

export function decideStatusForManualTask(githubEvidence) {
  const pr = latestPr(githubEvidence);
  const merged = Boolean(pr?.merged_at);
  const ciPassing = githubEvidence?.ci?.state === "passing" || githubEvidence?.ci == null;
  const hasBranchOrPr = Boolean(githubEvidence?.branches?.length || githubEvidence?.prs?.length);

  if (merged && ciPassing) return "concluido";
  if (hasBranchOrPr || merged) return "em andamento";
  return "pendente";
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
    blocked ? `- ATENCAO: revisar imediatamente - sync nao avanca status enquanto bloqueador estiver presente` : null,
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
