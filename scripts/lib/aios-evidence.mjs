import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const STAGE_TO_PATH = {
  spec: (m) => `docs/specs/${m}.md`,
  backend: (m) => `docs/specs/_backend_${m}.md`,
  frontend: (m) => `docs/specs/_frontend_${m}.md`,
  tests: (m) => `docs/specs/_tests_${m}.md`,
  review: (m) => `docs/specs/_review_${m}.md`
};

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

export function decideStatusFromAiosEvidence(evidence, githubEvidence) {
  const ciFailing = githubEvidence?.ci?.state === "failing";
  const latestPr = githubEvidence?.prs && githubEvidence.prs.length
    ? [...githubEvidence.prs].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))[0]
    : null;
  const merged = Boolean(latestPr?.merged_at);
  const prOpen = latestPr?.state === "open";
  const hasBranchOrPr = Boolean(githubEvidence?.branches?.length || githubEvidence?.prs?.length);

  if (evidence.reviewBlocked || ciFailing) return "bloqueado";

  if (evidence.stage === "merge") {
    return merged ? "concluido" : prOpen ? "em revisao" : hasBranchOrPr ? "em desenvolvimento" : "a fazer";
  }

  if (evidence.reviewApproved && merged) return "concluido";
  if (evidence.reviewApproved) return "em revisao";

  if (evidence.found) {
    if (evidence.stage === "review") return "em revisao";
    return "em desenvolvimento";
  }

  if (prOpen) return "em revisao";
  if (hasBranchOrPr) return "em desenvolvimento";
  return "a fazer";
}

export function decideStatusForManualTask(githubEvidence) {
  const latestPr = githubEvidence?.prs && githubEvidence.prs.length
    ? [...githubEvidence.prs].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))[0]
    : null;

  if (githubEvidence?.ci?.state === "failing") return "bloqueado";
  if (latestPr?.merged_at) return "concluido";
  if (latestPr?.state === "open") return "em revisao";
  if (githubEvidence?.branches?.length || githubEvidence?.prs?.length) return "em desenvolvimento";
  return "a fazer";
}

export function formatAiosEvidenceComment(info, evidence, githubEvidence, nextStatus) {
  const latestPr = githubEvidence?.prs && githubEvidence.prs.length
    ? [...githubEvidence.prs].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))[0]
    : null;

  return [
    "Atualizacao automatica AIOS:",
    `- Status calculado: ${nextStatus}`,
    `- Cliente: ${info.clientName}`,
    `- Modulo: ${info.moduleKey}${info.moduleTier ? ` (tier ${info.moduleTier})` : ""}`,
    `- Stage: ${info.stageKey ?? "(desconhecido)"}`,
    evidence.found
      ? `- Artefato AIOS: ${evidence.path} (${evidence.sizeBytes ?? "?"} bytes)`
      : `- Artefato AIOS: ${evidence.reason ?? "nao encontrado"}`,
    evidence.reviewApproved ? "- Review: APROVADO PARA MERGE" : null,
    evidence.reviewBlocked ? "- Review: BLOCKER detectado" : null,
    githubEvidence?.repo
      ? `- Repositorio: ${githubEvidence.repo.owner}/${githubEvidence.repo.repo}`
      : "- Repositorio: nao identificado",
    latestPr ? `- PR: #${latestPr.number} ${latestPr.state}${latestPr.merged_at ? " / merged" : ""}` : "- PR: nao encontrado",
    `- Branches encontradas: ${githubEvidence?.branches?.length ?? 0}`,
    githubEvidence?.ci ? `- CI: ${githubEvidence.ci.state}` : "- CI: nao avaliado",
    githubEvidence?.errors?.length ? `- Observacoes: ${githubEvidence.errors.join(" | ")}` : null
  ].filter((line) => line !== null).join("\n");
}
