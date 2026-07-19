const GITHUB_API_BASE = "https://api.github.com";

export function createGitHubClient({ token, apiBase = GITHUB_API_BASE, fetchImpl = fetch } = {}) {
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "clickup-novais-digital-tech-sync"
  };

  if (token) headers.Authorization = `Bearer ${token}`;

  return {
    async request(path) {
      const response = await fetchImpl(`${apiBase}${path}`, {
        method: "GET",
        headers
      });
      const text = await response.text();
      const data = text ? JSON.parse(text) : {};

      if (!response.ok) {
        throw new Error(`GET ${path} failed (${response.status}): ${text}`);
      }

      return data;
    }
  };
}

export function parseGitHubRepository(url) {
  if (!url) return null;

  const match = url.match(/github\.com[:/](?<owner>[^/\s]+)\/(?<repo>[^/\s#?.]+)(?:\.git)?/i);
  if (!match?.groups) return null;

  return {
    owner: match.groups.owner,
    repo: match.groups.repo.replace(/\.git$/i, "")
  };
}

export function searchTerms(info) {
  return [
    info.clientName,
    info.platformKey,
    info.taskKey,
    info.clientTaskId
  ]
    .filter(Boolean)
    .map((term) => String(term).toLowerCase());
}

function textMatchesTerms(text, terms) {
  const normalized = String(text ?? "").toLowerCase();
  return terms.some((term) => term && normalized.includes(term));
}

export async function getMatchingPullRequests(client, repo, info) {
  const pulls = await client.request(`/repos/${repo.owner}/${repo.repo}/pulls?state=all&per_page=100`);
  const terms = searchTerms(info);

  return pulls.filter((pull) => textMatchesTerms([
    pull.title,
    pull.body,
    pull.head?.ref,
    pull.head?.label
  ].filter(Boolean).join(" "), terms));
}

export async function getMatchingBranches(client, repo, info) {
  const branches = await client.request(`/repos/${repo.owner}/${repo.repo}/branches?per_page=100`);
  const terms = searchTerms(info);
  return branches.filter((branch) => textMatchesTerms(branch.name, terms));
}

export async function getCiState(client, repo, sha) {
  const [checks, statuses] = await Promise.all([
    client.request(`/repos/${repo.owner}/${repo.repo}/commits/${sha}/check-runs?per_page=100`).catch((error) => ({
      error: error.message,
      check_runs: []
    })),
    client.request(`/repos/${repo.owner}/${repo.repo}/commits/${sha}/status`).catch((error) => ({
      error: error.message,
      statuses: []
    }))
  ]);

  const checkRuns = checks.check_runs ?? [];
  const commitStatuses = statuses.statuses ?? [];
  const failures = [
    ...checkRuns.filter((check) => ["failure", "timed_out", "cancelled", "action_required"].includes(check.conclusion)),
    ...commitStatuses.filter((status) => ["failure", "error"].includes(status.state))
  ];
  const pending = [
    ...checkRuns.filter((check) => check.status !== "completed"),
    ...commitStatuses.filter((status) => ["pending"].includes(status.state))
  ];
  const successes = [
    ...checkRuns.filter((check) => ["success", "neutral", "skipped"].includes(check.conclusion)),
    ...commitStatuses.filter((status) => status.state === "success")
  ];

  if (failures.length) return { state: "failing", failures, pending, successes };
  if (pending.length) return { state: "pending", failures, pending, successes };
  if (successes.length) return { state: "passing", failures, pending, successes };
  return { state: "unknown", failures, pending, successes };
}

export async function collectEvidence(info, { githubClient, offline = false } = {}) {
  const repo = parseGitHubRepository(info.repositoryUrl);
  const evidence = {
    repo,
    prs: [],
    branches: [],
    ci: null,
    errors: []
  };

  if (!repo) {
    evidence.errors.push("repository_url ausente ou nao-GitHub");
    return evidence;
  }

  if (offline) {
    evidence.errors.push("modo offline: GitHub nao consultado");
    return evidence;
  }

  try {
    evidence.prs = await getMatchingPullRequests(githubClient, repo, info);
    evidence.branches = await getMatchingBranches(githubClient, repo, info);

    const latestPr = latestPullRequest(evidence.prs);
    if (latestPr?.head?.sha) {
      evidence.ci = await getCiState(githubClient, repo, latestPr.head.sha);
    }
  } catch (error) {
    evidence.errors.push(error.message);
  }

  return evidence;
}

export function latestPullRequest(prs) {
  return prs.slice().sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))[0];
}

export function decideStatus(evidence) {
  const latestPr = latestPullRequest(evidence.prs);

  if (evidence.ci?.state === "failing") return "bloqueado";
  if (latestPr?.merged_at && ["passing", "unknown", null, undefined].includes(evidence.ci?.state)) return "concluido";
  if (latestPr?.state === "open") return "em revisao";
  if (evidence.branches.length || evidence.prs.length) return "em desenvolvimento";
  return "a fazer";
}

export function formatEvidenceComment(info, evidence, nextStatus) {
  const latestPr = latestPullRequest(evidence.prs);

  return [
    "Atualizacao automatica tech:",
    `- Status calculado: ${nextStatus}`,
    `- Cliente: ${info.clientName}`,
    `- Tarefa: ${info.platformLabel} / ${info.title}`,
    evidence.repo ? `- Repositorio: ${evidence.repo.owner}/${evidence.repo.repo}` : "- Repositorio: nao identificado",
    latestPr ? `- PR: #${latestPr.number} ${latestPr.state}${latestPr.merged_at ? " / merged" : ""}` : "- PR: nao encontrado",
    `- Branches encontradas: ${evidence.branches.length}`,
    evidence.ci ? `- CI: ${evidence.ci.state}` : "- CI: nao avaliado",
    evidence.errors.length ? `- Observacoes: ${evidence.errors.join(" | ")}` : null
  ].filter(Boolean).join("\n");
}
