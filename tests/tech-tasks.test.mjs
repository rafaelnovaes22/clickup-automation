import assert from "node:assert/strict";
import { agentRequestToPayload } from "../scripts/lib/agent-request.mjs";
import { decideStatus } from "../scripts/lib/github-evidence.mjs";
import { canonicalStatus, parseTechTask, selectedPlatforms, taskDescription, taskName, validatePayload } from "../scripts/lib/tech-tasks.mjs";

const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

const contract = {
  requiredFields: ["client_name", "client_task_id", "technical_platforms", "tech_owner", "delivery_due_date", "environment"]
};

const catalog = {
  platforms: [
    {
      key: "ai_agent",
      label: "Agente de IA",
      tasks: [
        {
          key: "agent_evaluation_suite",
          title: "Criar suite de avaliacao do agente",
          artifact: "agent_eval_suite",
          doneWhen: "Suite passa."
        }
      ]
    }
  ]
};

const payload = {
  client_name: "Novais Digital",
  client_task_id: "86abc",
  technical_platforms: ["ai_agent"],
  tech_owner: "AI Engineer",
  delivery_due_date: "2026-05-15",
  repository_url: "https://github.com/novais-digital/novais-digital",
  environment: "dev"
};

test("validatePayload accepts complete payload and rejects missing environment", () => {
  assert.doesNotThrow(() => validatePayload(payload, contract));
  assert.throws(() => validatePayload({ ...payload, environment: "" }, contract), /environment/);
});

test("selectedPlatforms rejects unknown platform keys", () => {
  assert.equal(selectedPlatforms(payload, catalog)[0].key, "ai_agent");
  assert.throws(() => selectedPlatforms({ ...payload, technical_platforms: ["unknown"] }, catalog), /Unknown technical platforms/);
});

test("taskName and taskDescription include matching metadata", () => {
  const platform = catalog.platforms[0];
  const task = platform.tasks[0];

  assert.equal(taskName(payload, platform, task), "[TECH] Novais Digital / Agente de IA / Criar suite de avaliacao do agente");

  const description = taskDescription(payload, platform, task);
  assert.match(description, /platform_key=ai_agent/);
  assert.match(description, /task_key=agent_evaluation_suite/);
  assert.match(description, /evidence_source=github/);
});

test("parseTechTask extracts client, platform, task key and repository", () => {
  const platform = catalog.platforms[0];
  const task = platform.tasks[0];
  const parsed = parseTechTask({
    id: "task-1",
    name: taskName(payload, platform, task),
    description: taskDescription(payload, platform, task),
    status: { status: "to do" }
  });

  assert.equal(parsed.clientName, "Novais Digital");
  assert.equal(parsed.platformKey, "ai_agent");
  assert.equal(parsed.taskKey, "agent_evaluation_suite");
  assert.equal(parsed.repositoryUrl, "https://github.com/novais-digital/novais-digital");
  assert.equal(canonicalStatus(parsed.status), "a fazer");
});

test("decideStatus maps evidence to operational status", () => {
  assert.equal(decideStatus({ prs: [], branches: [], ci: null }), "a fazer");
  assert.equal(decideStatus({ prs: [], branches: [{ name: "novais-digital-ai-agent" }], ci: null }), "em desenvolvimento");
  assert.equal(decideStatus({ prs: [{ state: "open", updated_at: "2026-05-01T00:00:00Z" }], branches: [], ci: null }), "em revisao");
  assert.equal(decideStatus({ prs: [{ state: "open", updated_at: "2026-05-01T00:00:00Z" }], branches: [], ci: { state: "failing" } }), "bloqueado");
  assert.equal(decideStatus({ prs: [{ state: "closed", merged_at: "2026-05-01T00:00:00Z", updated_at: "2026-05-01T00:00:00Z" }], branches: [], ci: { state: "passing" } }), "concluido");
});

test("agentRequestToPayload converts ClickUp custom fields into tech payload", () => {
  const date = Date.parse("2026-05-15T00:00:00.000Z");
  const payloadFromTask = agentRequestToPayload({
    id: "86request",
    name: "Criar agente SDR",
    custom_fields: [
      { name: "Cliente", type: "text", value: "Novais Digital" },
      { name: "Plataformas tecnicas", type: "text", value: "ai_agent,whatsapp,node_backend" },
      { name: "Responsavel tecnico", type: "text", value: "AI Engineer" },
      { name: "Prazo desejado", type: "date", value: String(date) },
      { name: "Ambiente", type: "drop_down", value: 0, type_config: { options: [{ name: "dev", orderindex: 0 }] } },
      { name: "Outcome esperado", type: "text", value: "Lead qualificado" }
    ]
  });

  assert.equal(payloadFromTask.client_name, "Novais Digital");
  assert.deepEqual(payloadFromTask.technical_platforms, ["ai_agent", "whatsapp", "node_backend"]);
  assert.equal(payloadFromTask.client_task_id, "86request");
  assert.equal(payloadFromTask.delivery_due_date, "2026-05-15");
  assert.equal(payloadFromTask.environment, "dev");
  assert.match(payloadFromTask.notes, /Lead qualificado/);
});

let passed = 0;

for (const { name, fn } of tests) {
  try {
    await fn();
    passed += 1;
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}

console.log(`${passed}/${tests.length} unit tests passed`);
