const API_BASE = "https://api.clickup.com/api/v2";
const DEFAULT_PAGE_SIZE = 100;

function tryParseJson(text) {
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function snippet(text, max = 200) {
  if (!text) return "";
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max)}…`;
}

export function createClickUpClient({ token, apiBase = API_BASE, fetchImpl = fetch }) {
  const headers = {
    Authorization: token,
    "Content-Type": "application/json"
  };

  return {
    async request(method, path, body) {
      const response = await fetchImpl(`${apiBase}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined
      });
      const text = await response.text();
      const contentType = response.headers?.get?.("content-type") ?? "";

      const data = tryParseJson(text);

      if (!response.ok) {
        const detail = data && typeof data === "object" && (data.err || data.message)
          ? (data.err ?? data.message)
          : snippet(text);
        throw new Error(`${method} ${path} failed (${response.status}): ${detail}`);
      }

      if (data === null) {
        // 2xx mas resposta nao-JSON (ex: HTML de manutencao, gateway error)
        throw new Error(
          `${method} ${path} returned non-JSON response (status ${response.status}, content-type ${contentType || "unknown"}): ${snippet(text)}`
        );
      }

      return data;
    }
  };
}

export async function findListByTarget(client, teamId, target) {
  const spaces = (await client.request("GET", `/team/${teamId}/space?archived=false`)).spaces ?? [];
  const space = spaces.find((item) => item.name === target.space);
  if (!space) throw new Error(`Space not found: ${target.space}`);

  const lists = (await client.request("GET", `/space/${space.id}/list?archived=false`)).lists ?? [];
  const list = lists.find((item) => item.name === target.list);
  if (!list) throw new Error(`List not found: ${target.space} / ${target.list}`);

  return list;
}

export async function listTasks(client, listId, { includeSubtasks = false, includeClosed = true, pageSize = DEFAULT_PAGE_SIZE, maxPages = 50 } = {}) {
  const all = [];
  for (let page = 0; page < maxPages; page += 1) {
    const params = new URLSearchParams({
      archived: "false",
      subtasks: String(includeSubtasks),
      include_closed: String(includeClosed),
      page: String(page)
    });
    const data = await client.request("GET", `/list/${listId}/task?${params.toString()}`);
    const batch = data.tasks ?? [];
    all.push(...batch);
    if (batch.length < pageSize) break;
  }
  return all;
}
