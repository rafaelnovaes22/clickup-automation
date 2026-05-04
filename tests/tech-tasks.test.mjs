import assert from "node:assert/strict";
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
  client_name: "Acme",
  client_task_id: "86abc",
  technical_platforms: ["ai_agent"],
  tech_owner: "AI Engineer",
  delivery_due_date: "2026-05-15",
  repository_url: "https://github.com/acme/acme",
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

  assert.equal(taskName(payload, platform, task), "[TECH] Acme / Agente de IA / Criar suite de avaliacao do agente");

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

  assert.equal(parsed.clientName, "Acme");
  assert.equal(parsed.platformKey, "ai_agent");
  assert.equal(parsed.taskKey, "agent_evaluation_suite");
  assert.equal(parsed.repositoryUrl, "https://github.com/acme/acme");
  assert.equal(canonicalStatus(parsed.status), "a fazer");
});

test("decideStatus maps evidence to operational status", () => {
  assert.equal(decideStatus({ prs: [], branches: [], ci: null }), "a fazer");
  assert.equal(decideStatus({ prs: [], branches: [{ name: "acme-ai-agent" }], ci: null }), "em desenvolvimento");
  assert.equal(decideStatus({ prs: [{ state: "open", updated_at: "2026-05-01T00:00:00Z" }], branches: [], ci: null }), "em revisao");
  assert.equal(decideStatus({ prs: [{ state: "open", updated_at: "2026-05-01T00:00:00Z" }], branches: [], ci: { state: "failing" } }), "bloqueado");
  assert.equal(decideStatus({ prs: [{ state: "closed", merged_at: "2026-05-01T00:00:00Z", updated_at: "2026-05-01T00:00:00Z" }], branches: [], ci: { state: "passing" } }), "concluido");
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
