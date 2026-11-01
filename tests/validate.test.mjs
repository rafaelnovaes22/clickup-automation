import assert from "node:assert/strict";

const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

// ── helpers replicados do validate.mjs para teste unitario ──────────────────

const ALLOWED_DELIVERY_TYPES = new Set(["agentic_saas", "platform", "automation", "hybrid", "any"]);
const STRICT_DELIVERY_TYPES  = new Set(["agentic_saas", "platform", "automation", "hybrid"]);

function collectErrors(fn) {
  const errs = [];
  const fail = (msg) => errs.push(msg);
  fn(fail);
  return errs;
}

function assertDeliveryType(value, label, fail, { allowAny = true } = {}) {
  if (value === undefined || value === null) return;
  const set = allowAny ? ALLOWED_DELIVERY_TYPES : STRICT_DELIVERY_TYPES;
  if (typeof value === "string") {
    if (!set.has(value)) fail(`${label}: unknown delivery_type ${value}`);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      if (!set.has(item)) fail(`${label}: unknown delivery_type ${item}`);
    }
    return;
  }
  fail(`${label}: delivery_type must be string or array, got ${typeof value}`);
}

function validateTemplateAgainstBlueprint(template, listDeliveryTypes, fail) {
  const key = `${template.target?.space}/${template.target?.list}`;
  if (!listDeliveryTypes.has(key)) {
    fail(`clickup-task-templates ${template.key}: target list not found in blueprint: ${key}`);
    return;
  }
  assertDeliveryType(template.delivery_type, `clickup-task-templates ${template.key}.delivery_type`, fail);

  const tdt = template.delivery_type;
  if (tdt && tdt !== "any") {
    const allowed = listDeliveryTypes.get(key);
    if (allowed && !allowed.has(tdt)) {
      fail(`clickup-task-templates ${template.key}: delivery_type=${tdt} not allowed in list '${key}' (list deliveryTypes=[${[...allowed].join(", ")}])`);
    }
  }

  if (tdt === "platform") {
    const ds = String(template.target?.desiredStatus ?? "").toLowerCase();
    if (/(shadow|assisted|autonomous)/.test(ds)) {
      fail(`clickup-task-templates ${template.key}: delivery_type=platform must not require an agentic status (got '${ds}')`);
    }
  }
}

// ── fixture: lista de delivery types por lista do blueprint ─────────────────

const listDeliveryTypes = new Map([
  ["02 Implantacao/SHADOWs ativos",          new Set(["agentic_saas"])],
  ["02 Implantacao/ASSISTEDs ativos",         new Set(["agentic_saas"])],
  ["02 Implantacao/Rollouts em andamento",    new Set(["platform", "hybrid"])],
  ["02 Implantacao/Pilotos ativos",           new Set(["platform", "hybrid"])],
  ["04 Saude Operacional/Aceites operacionais", new Set(["platform", "automation", "hybrid"])],
  ["04 Saude Operacional/Promocoes de modo",  new Set(["platform", "hybrid"])],
  ["05 Institucional Novais Digital/Solicitacoes de agente",    new Set(["agentic_saas"])],
  ["05 Institucional Novais Digital/Solicitacoes de plataforma", new Set(["platform", "hybrid"])],
  ["05 Institucional Novais Digital/Backlog tecnico", new Set(["agentic_saas", "platform", "automation", "hybrid"])],
]);

// ── testes: assertDeliveryType ───────────────────────────────────────────────

test("assertDeliveryType aceita valores validos", () => {
  const errs = collectErrors((fail) => {
    assertDeliveryType("agentic_saas", "test", fail);
    assertDeliveryType("platform",     "test", fail);
    assertDeliveryType("automation",   "test", fail);
    assertDeliveryType("hybrid",       "test", fail);
    assertDeliveryType("any",          "test", fail);
    assertDeliveryType(["platform", "hybrid"], "test", fail);
  });
  assert.deepEqual(errs, []);
});

test("assertDeliveryType rejeita valor desconhecido", () => {
  const errs = collectErrors((fail) => {
    assertDeliveryType("autonomous", "label", fail);
  });
  assert.equal(errs.length, 1);
  assert.match(errs[0], /unknown delivery_type autonomous/);
});

test("assertDeliveryType com allowAny=false rejeita 'any'", () => {
  const errs = collectErrors((fail) => {
    assertDeliveryType("any", "label", fail, { allowAny: false });
  });
  assert.equal(errs.length, 1);
  assert.match(errs[0], /unknown delivery_type any/);
});

test("assertDeliveryType rejeita array com item invalido", () => {
  const errs = collectErrors((fail) => {
    assertDeliveryType(["platform", "shadow"], "label", fail);
  });
  assert.equal(errs.length, 1);
  assert.match(errs[0], /unknown delivery_type shadow/);
});

test("assertDeliveryType ignora undefined/null silenciosamente", () => {
  const errs = collectErrors((fail) => {
    assertDeliveryType(undefined, "label", fail);
    assertDeliveryType(null, "label", fail);
  });
  assert.deepEqual(errs, []);
});

// ── testes: template platform apontando para lista agentic ──────────────────

test("template platform em lista exclusiva agentic falha na validacao", () => {
  const template = {
    key: "bad_platform_template",
    delivery_type: "platform",
    target: { space: "02 Implantacao", list: "SHADOWs ativos", desiredStatus: "shadow" }
  };
  const errs = collectErrors((fail) => validateTemplateAgainstBlueprint(template, listDeliveryTypes, fail));
  assert.ok(errs.length > 0, "deveria ter gerado erro");
  assert.ok(errs.some((e) => e.includes("not allowed in list")), `erros: ${errs.join("; ")}`);
});

test("template agentic_saas em lista exclusiva platform falha na validacao", () => {
  const template = {
    key: "bad_agentic_template",
    delivery_type: "agentic_saas",
    target: { space: "02 Implantacao", list: "Rollouts em andamento", desiredStatus: "draft" }
  };
  const errs = collectErrors((fail) => validateTemplateAgainstBlueprint(template, listDeliveryTypes, fail));
  assert.ok(errs.some((e) => e.includes("not allowed in list")));
});

test("template platform com desiredStatus shadow falha com erro de status agentco", () => {
  const template = {
    key: "platform_bad_status",
    delivery_type: "platform",
    target: { space: "02 Implantacao", list: "Rollouts em andamento", desiredStatus: "shadow" }
  };
  const errs = collectErrors((fail) => validateTemplateAgainstBlueprint(template, listDeliveryTypes, fail));
  assert.ok(errs.some((e) => e.includes("must not require an agentic status")));
});

test("template platform com desiredStatus assisted falha", () => {
  const template = {
    key: "platform_assisted_status",
    delivery_type: "platform",
    target: { space: "02 Implantacao", list: "Rollouts em andamento", desiredStatus: "assisted" }
  };
  const errs = collectErrors((fail) => validateTemplateAgainstBlueprint(template, listDeliveryTypes, fail));
  assert.ok(errs.some((e) => e.includes("must not require an agentic status")));
});

test("template platform correto nao gera erros", () => {
  const template = {
    key: "platform_rollout",
    delivery_type: "platform",
    target: { space: "02 Implantacao", list: "Rollouts em andamento", desiredStatus: "draft" }
  };
  const errs = collectErrors((fail) => validateTemplateAgainstBlueprint(template, listDeliveryTypes, fail));
  assert.deepEqual(errs, []);
});

test("template agentic correto em lista agentic nao gera erros", () => {
  const template = {
    key: "agent_request",
    delivery_type: "agentic_saas",
    target: { space: "05 Institucional Novais Digital", list: "Solicitacoes de agente", desiredStatus: "rascunho" }
  };
  const errs = collectErrors((fail) => validateTemplateAgainstBlueprint(template, listDeliveryTypes, fail));
  assert.deepEqual(errs, []);
});

test("template platform_request correto em lista de plataforma nao gera erros", () => {
  const template = {
    key: "platform_request",
    delivery_type: "platform",
    target: { space: "05 Institucional Novais Digital", list: "Solicitacoes de plataforma", desiredStatus: "rascunho" }
  };
  const errs = collectErrors((fail) => validateTemplateAgainstBlueprint(template, listDeliveryTypes, fail));
  assert.deepEqual(errs, []);
});

test("template com lista nao existente no blueprint gera erro", () => {
  const template = {
    key: "orphan_template",
    delivery_type: "platform",
    target: { space: "99 Inexistente", list: "Lista Fantasma", desiredStatus: "draft" }
  };
  const errs = collectErrors((fail) => validateTemplateAgainstBlueprint(template, listDeliveryTypes, fail));
  assert.ok(errs.some((e) => e.includes("target list not found in blueprint")));
});

test("template any em qualquer lista nao gera erro de delivery_type", () => {
  const template = {
    key: "lead_new",
    delivery_type: "any",
    target: { space: "05 Institucional Novais Digital", list: "Backlog tecnico", desiredStatus: "a fazer" }
  };
  const errs = collectErrors((fail) => validateTemplateAgainstBlueprint(template, listDeliveryTypes, fail));
  assert.deepEqual(errs, []);
});

// ── runner ──────────────────────────────────────────────────────────────────

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

console.log(`${passed}/${tests.length} validate tests passed`);
