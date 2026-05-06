export const DEFAULT_LIST_STATUSES = [
  { status: "to do", color: "#87909e", type: "open" },
  { status: "em desenvolvimento", color: "#4194f6", type: "custom" },
  { status: "em revisão", color: "#f9c513", type: "custom" },
  { status: "bloqueado", color: "#e50000", type: "custom" },
  { status: "complete", color: "#2ecd6f", type: "closed" }
];

async function findSpace(clickUp, teamId, spaceName) {
  const data = await clickUp.request("GET", `/team/${teamId}/space?archived=false`);
  const space = (data.spaces ?? []).find((s) => s.name === spaceName);
  if (!space) throw new Error(`Space not found: ${spaceName}`);
  return space;
}

async function findFolder(clickUp, spaceId, folderName) {
  const data = await clickUp.request("GET", `/space/${spaceId}/folder?archived=false`);
  return (data.folders ?? []).find((f) => f.name === folderName);
}

async function findListInFolder(clickUp, folderId, listName) {
  const data = await clickUp.request("GET", `/folder/${folderId}/list?archived=false`);
  return (data.lists ?? []).find((l) => l.name === listName);
}

export async function findOrCreatePlatformFolder(clickUp, teamId, spaceName, folderName, { dryRun = false } = {}) {
  const space = await findSpace(clickUp, teamId, spaceName);
  const existing = await findFolder(clickUp, space.id, folderName);
  if (existing) {
    return { folder: existing, created: false, spaceId: space.id };
  }
  if (dryRun) {
    return { folder: { id: "dry-folder", name: folderName }, created: true, spaceId: space.id, dryRun: true };
  }
  const created = await clickUp.request("POST", `/space/${space.id}/folder`, { name: folderName });
  return { folder: created, created: true, spaceId: space.id };
}

export async function findOrCreateModuleList(clickUp, folderId, listName, { dryRun = false, statuses = DEFAULT_LIST_STATUSES, content } = {}) {
  const existing = await findListInFolder(clickUp, folderId, listName);
  if (existing) {
    return { list: existing, created: false };
  }
  if (dryRun) {
    return { list: { id: "dry-list", name: listName }, created: true, dryRun: true };
  }
  const body = { name: listName };
  if (statuses) body.statuses = statuses;
  if (content) body.content = content;
  const created = await clickUp.request("POST", `/folder/${folderId}/list`, body);
  return { list: created, created: true };
}

export async function listAllTasks(clickUp, listId, { includeSubtasks = true, includeClosed = true } = {}) {
  const url = `/list/${listId}/task?archived=false&subtasks=${includeSubtasks}&include_closed=${includeClosed}`;
  const data = await clickUp.request("GET", url);
  return data.tasks ?? [];
}

export function indexParentsByModuleKey(tasks) {
  const map = new Map();
  for (const task of tasks) {
    if (task.parent) continue;
    const match = task.name.match(/^([a-z0-9_]+)\s+·/);
    if (match) map.set(match[1], task);
  }
  return map;
}

export function indexSubtasksByParent(tasks) {
  const map = new Map();
  for (const task of tasks) {
    if (!task.parent) continue;
    const list = map.get(task.parent) ?? [];
    list.push(task);
    map.set(task.parent, list);
  }
  return map;
}

export function rollupParentStatus(subtaskInfos) {
  if (!subtaskInfos.length) return null;

  const statuses = subtaskInfos.map((info) => info.status);

  // BLOCKER tem prioridade absoluta
  if (statuses.includes("bloqueado")) return "bloqueado";
  // Tudo concluido => parent complete
  if (statuses.every((s) => s === "complete")) return "complete";
  // Tudo pendente => to do
  if (statuses.every((s) => s === "to do" || s === "")) return "to do";
  // Algum em revisao e nada anterior progredindo => em revisão
  if (statuses.includes("em revisão")) return "em revisão";
  // Caso geral: alguma coisa em andamento
  return "em desenvolvimento";
}

export function currentStageFromSubtasks(subtaskInfos) {
  const blocked = subtaskInfos.find((info) => info.status === "bloqueado");
  if (blocked) return blocked.stageKey;
  const reviewing = subtaskInfos.find((info) => info.status === "em revisão");
  if (reviewing) return reviewing.stageKey;
  const inProgress = subtaskInfos.find((info) => info.status === "em desenvolvimento");
  if (inProgress) return inProgress.stageKey;
  const allDone = subtaskInfos.every((info) => info.status === "complete");
  if (allDone) return "complete";
  return null;
}
