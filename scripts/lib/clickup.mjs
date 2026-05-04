const API_BASE = "https://api.clickup.com/api/v2";

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
      const data = text ? JSON.parse(text) : {};

      if (!response.ok) {
        throw new Error(`${method} ${path} failed (${response.status}): ${text}`);
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

export async function listTasks(client, listId) {
  const data = await client.request("GET", `/list/${listId}/task?archived=false&subtasks=false&include_closed=true`);
  return data.tasks ?? [];
}
