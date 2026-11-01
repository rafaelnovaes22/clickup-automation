/** @param {unknown} value @returns {string} */
const escapeHtml = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ],
  );

/** @param {string} key @param {string} label @param {object} payload @param {string} type @returns {string} */
function field(key, label, payload, type = "text") {
  return `<label>${label}<input name="${key}" type="${type}" value="${escapeHtml(payload[key])}" required maxlength="200"></label>`;
}

/** @param {object[]} platforms @param {object} payload @returns {string} */
function platformOptions(platforms, payload) {
  const chosen = new Set(payload.technical_platforms ?? []);
  return platforms
    .map(
      (platform) =>
        `<label class="option"><input type="checkbox" name="technical_platforms" value="${escapeHtml(platform.key)}" ${chosen.has(platform.key) ? "checked" : ""}><span>${escapeHtml(platform.label)}<small>${platform.tasks.length} entregas</small></span></label>`,
    )
    .join("");
}

/** @param {object[]} tasks @param {object} payload @returns {string} */
function results(tasks, payload) {
  if (!tasks.length)
    return `<section class="result empty" aria-label="Prévia"><p class="eyebrow">02 / Seu plano</p><h2>Do briefing à execução.</h2><p>Selecione as frentes do projeto. Cada entrega terá um artefato esperado e um critério claro de conclusão.</p><ol><li>Defina o escopo</li><li>Revise o backlog</li><li>Aprove a solicitação no ClickUp</li></ol></section>`;
  const items = tasks
    .map(
      (task, index) =>
        `<li><span class="index">${String(index + 1).padStart(2, "0")}</span><div><h3>${escapeHtml(task.name)}</h3><p>${escapeHtml(task.doneWhen)}</p><small>Artefato: ${escapeHtml(task.artifact)}</small></div></li>`,
    )
    .join("");
  return `<section class="result" id="resultado"><p class="eyebrow">02 / Prévia gerada</p><h2><strong>${tasks.length}</strong> entregas definidas.</h2><p>Revise os critérios abaixo. Para gerar no workspace, preencha a solicitação no ClickUp e mova para <b>escopo pronto</b>.</p><ol class="tasks">${items}</ol><details><summary>Copiar briefing para a automação</summary><label class="sr-only" for="payload">Briefing em JSON</label><textarea id="payload" readonly rows="12">${escapeHtml(JSON.stringify(payload, null, 2))}</textarea></details></section>`;
}

/** @param {object[]} platforms @param {object} payload @param {object[]} tasks @param {string} error @returns {string} */
export function renderBriefing(platforms, payload, tasks, error = "") {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="description" content="Transforme o escopo de um projeto em um backlog verificável para o ClickUp."><title>ClickUp Automation | Planeje a próxima entrega</title><link rel="stylesheet" href="/briefing.css"></head><body>
  <header><a href="/" aria-label="ClickUp Automation, início">ClickUp <b>Automation</b></a><span>EScopo · Evidência · Aprovação</span></header>
  <main><div class="intro"><p class="eyebrow">Governança de projetos</p><h1>Clareza antes<br>da próxima entrega.</h1><p>Transforme seu briefing em tarefas concretas, com critérios de conclusão e revisão humana.</p></div>
  ${error ? `<p class="error" role="alert">${escapeHtml(error)} <a href="/">Recomeçar</a></p>` : ""}
  <div class="workspace"><form action="/preview#resultado" method="post"><p class="eyebrow">01 / Defina o projeto</p><div class="fields">${field("client_name", "Projeto ou cliente", payload)}${field("client_task_id", "ID da solicitação no ClickUp", payload)}${field("tech_owner", "Responsável técnico", payload)}${field("delivery_due_date", "Data de entrega", payload, "date")}</div>
  <label>Ambiente<select name="environment">${[
    ["dev", "Desenvolvimento"],
    ["staging", "Validação"],
    ["prod", "Produção"],
  ]
    .map(
      ([key, label]) =>
        `<option value="${key}" ${payload.environment === key ? "selected" : ""}>${label}</option>`,
    )
    .join("")}</select></label>
  <fieldset><legend>Quais frentes fazem parte do escopo?</legend><div class="platforms">${platformOptions(platforms, payload)}</div></fieldset><label>Contexto e resultado esperado<textarea name="notes" rows="3" maxlength="3000">${escapeHtml(payload.notes)}</textarea></label><button type="submit">Gerar prévia do backlog <span aria-hidden="true">↗</span></button><p class="hint">A prévia não cria tarefas nem altera seu workspace.</p></form>${results(tasks, payload)}</div></main><footer>ClickUp Automation · Entregas orientadas por evidências.</footer></body></html>`;
}
