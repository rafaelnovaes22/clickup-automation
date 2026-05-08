#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { root } from "./lib/env.mjs";

const ALLOWED_DELIVERY_TYPES = new Set(["agentic_saas", "platform", "automation", "hybrid", "any"]);
const STRICT_DELIVERY_TYPES = new Set(["agentic_saas", "platform", "automation", "hybrid"]);

const jsonFiles = [
  "config/activity-catalog.json",
  "config/aios-module-catalog.json",
  "config/aios-module-functionalities.json",
  "config/aios-pipeline-contract.json",
  "config/clickup-custom-fields.json",
  "config/clickup-governance.blueprint.json",
  "config/clickup-task-templates.json",
  "config/diagnostic-output-contract.json",
  "config/tech-automation-contract.json",
  "config/tech-operational-repository.json",
  "config/tech-platform-catalog.json",
  "examples/clickup-tech-tasks.fixture.json",
  "examples/edix-modules.payload.json",
  "examples/aicfo-modules.payload.json",
  "examples/tech-scope.sample.json"
];

const errors = [];
const parsed = new Map();

function fail(message) {
  errors.push(message);
}

async function readJson(relativePath) {
  try {
    const content = await readFile(resolve(root, relativePath), "utf8");
    const data = JSON.parse(content);
    parsed.set(relativePath, data);
    return data;
  } catch (error) {
    fail(`${relativePath}: ${error.message}`);
    return null;
  }
}

function assertUnique(items, keyFn, label) {
  const seen = new Set();
  for (const item of items) {
    const key = keyFn(item);
    if (seen.has(key)) fail(`${label}: duplicate key ${key}`);
    seen.add(key);
  }
}

function assertDeliveryType(value, label, { allowAny = true } = {}) {
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

for (const file of jsonFiles) {
  await readJson(file);
}

const techContract = parsed.get("config/tech-automation-contract.json");
const blueprint = parsed.get("config/clickup-governance.blueprint.json");
const customFields = parsed.get("config/clickup-custom-fields.json");
const platformCatalog = parsed.get("config/tech-platform-catalog.json");
const techRepo = parsed.get("config/tech-operational-repository.json");
const samplePayload = parsed.get("examples/tech-scope.sample.json");
const activityCatalog = parsed.get("config/activity-catalog.json");
const taskTemplates = parsed.get("config/clickup-task-templates.json");
const diagnosticContract = parsed.get("config/diagnostic-output-contract.json");
const aiosModuleFunctionalities = parsed.get("config/aios-module-functionalities.json");

if (techContract) {
  const fields = techContract.fields ?? [];
  const fieldKeys = new Set(fields.map((field) => field.key));
  const requiredFromFields = fields.filter((field) => field.required).map((field) => field.key);
  const requiredFields = techContract.requiredFields ?? [];

  for (const field of requiredFields) {
    if (!fieldKeys.has(field)) fail(`tech-automation-contract: requiredFields contains unknown field ${field}`);
  }

  for (const field of requiredFromFields) {
    if (!requiredFields.includes(field)) {
      fail(`tech-automation-contract: field ${field} is required=true but missing from requiredFields`);
    }
  }

  assertDeliveryType(techContract.deliveryTypes, "tech-automation-contract.deliveryTypes", { allowAny: false });
}

if (platformCatalog) {
  assertUnique(platformCatalog.platforms ?? [], (platform) => platform.key, "tech-platform-catalog platforms");

  for (const platform of platformCatalog.platforms ?? []) {
    assertUnique(platform.tasks ?? [], (task) => task.key, `tech-platform-catalog ${platform.key} tasks`);
    assertDeliveryType(platform.delivery_types, `tech-platform-catalog ${platform.key}.delivery_types`, { allowAny: false });
  }

  assertDeliveryType(platformCatalog.deliveryTypes, "tech-platform-catalog.deliveryTypes", { allowAny: false });
}

if (platformCatalog && techRepo) {
  const artifactKeys = new Set((techRepo.artifacts ?? []).map((artifact) => artifact.key));
  const roleKeys = new Set((techRepo.roles ?? []).map((role) => role.key));

  for (const platform of platformCatalog.platforms ?? []) {
    if (!roleKeys.has(platform.defaultOwnerRole)) {
      fail(`tech-platform-catalog ${platform.key}: defaultOwnerRole ${platform.defaultOwnerRole} not found in tech-operational-repository roles`);
    }

    for (const task of platform.tasks ?? []) {
      if (!artifactKeys.has(task.artifact)) {
        fail(`tech-platform-catalog ${platform.key}/${task.key}: artifact ${task.artifact} not found in tech-operational-repository artifacts`);
      }
    }
  }

  for (const activity of techRepo.activities ?? []) {
    assertDeliveryType(activity.delivery_type, `tech-operational-repository activity ${activity.id}.delivery_type`);
  }
}

if (platformCatalog && samplePayload) {
  const platformKeys = new Set((platformCatalog.platforms ?? []).map((platform) => platform.key));
  for (const platform of samplePayload.technical_platforms ?? []) {
    if (!platformKeys.has(platform)) fail(`examples/tech-scope.sample.json: unknown platform ${platform}`);
  }
}

if (blueprint) {
  const listKeys = new Set();
  const listDeliveryTypes = new Map();
  for (const space of blueprint.spaces ?? []) {
    for (const list of space.lists ?? []) {
      const key = `${space.name}/${list.name}`;
      listKeys.add(key);
      listDeliveryTypes.set(key, new Set(list.deliveryTypes ?? ["agentic_saas", "platform", "automation", "hybrid"]));
      assertDeliveryType(list.deliveryTypes, `blueprint list ${key}.deliveryTypes`, { allowAny: false });
    }
  }
  assertDeliveryType(blueprint.deliveryTypes, "blueprint.deliveryTypes", { allowAny: false });

  if (customFields) {
    for (const fieldSet of customFields.fieldSets ?? []) {
      const key = `${fieldSet.target?.space}/${fieldSet.target?.list}`;
      if (!listKeys.has(key)) fail(`clickup-custom-fields ${fieldSet.key}: target list not found in blueprint: ${key}`);
      assertUnique(fieldSet.fields ?? [], (field) => field.key, `clickup-custom-fields ${fieldSet.key} fields`);
      assertUnique(fieldSet.fields ?? [], (field) => field.name, `clickup-custom-fields ${fieldSet.key} field names`);
    }
  }

  if (taskTemplates) {
    assertDeliveryType(taskTemplates.deliveryTypes, "clickup-task-templates.deliveryTypes", { allowAny: false });
    for (const template of taskTemplates.templates ?? []) {
      const key = `${template.target?.space}/${template.target?.list}`;
      if (!listKeys.has(key)) fail(`clickup-task-templates ${template.key}: target list not found in blueprint: ${key}`);
      assertDeliveryType(template.delivery_type, `clickup-task-templates ${template.key}.delivery_type`);

      const tdt = template.delivery_type;
      if (tdt && tdt !== "any") {
        const allowed = listDeliveryTypes.get(key);
        if (allowed && !allowed.has(tdt)) {
          fail(`clickup-task-templates ${template.key}: delivery_type=${tdt} not allowed in list '${key}' (list deliveryTypes=[${[...allowed].join(", ")}])`);
        }
      }

      // platform templates not allowed to require SHADOW/ASSISTED/AUTONOMOUS keywords as desiredStatus
      if (tdt === "platform") {
        const ds = String(template.target?.desiredStatus ?? "").toLowerCase();
        if (/(shadow|assisted|autonomous)/.test(ds)) {
          fail(`clickup-task-templates ${template.key}: delivery_type=platform must not require an agentic status (got '${ds}')`);
        }
      }
    }
  }

  if (activityCatalog) {
    for (const activity of activityCatalog.activities ?? []) {
      assertDeliveryType(activity.delivery_type, `activity-catalog id=${activity.id}.delivery_type`);
      const key = `${activity.space}/${activity.list}`;
      if (!listKeys.has(key)) {
        fail(`activity-catalog id=${activity.id}: target list not found in blueprint: ${key}`);
        continue;
      }
      const adt = activity.delivery_type;
      if (adt && adt !== "any") {
        const allowed = listDeliveryTypes.get(key);
        if (allowed && !allowed.has(adt)) {
          fail(`activity-catalog id=${activity.id}: delivery_type=${adt} not allowed in list '${key}' (list deliveryTypes=[${[...allowed].join(", ")}])`);
        }
      }
    }
  }
}

if (diagnosticContract) {
  assertDeliveryType(diagnosticContract.deliveryTypes, "diagnostic-output-contract.deliveryTypes", { allowAny: false });
  const requirements = diagnosticContract.candidateRequirementsByDeliveryType ?? {};
  const candidateFieldKeys = new Set((diagnosticContract.candidateFields ?? []).map((field) => field.key));
  for (const [dt, rule] of Object.entries(requirements)) {
    if (!STRICT_DELIVERY_TYPES.has(dt)) {
      fail(`diagnostic-output-contract: candidateRequirementsByDeliveryType has unknown delivery_type ${dt}`);
    }
    for (const field of rule.required ?? []) {
      if (!candidateFieldKeys.has(field)) {
        fail(`diagnostic-output-contract: required field ${field} for ${dt} not found in candidateFields`);
      }
    }
    for (const field of rule.forbidden ?? []) {
      if (!candidateFieldKeys.has(field)) {
        fail(`diagnostic-output-contract: forbidden field ${field} for ${dt} not found in candidateFields`);
      }
    }
  }
}

const aiosCatalog = parsed.get("config/aios-module-catalog.json");
const aiosContract = parsed.get("config/aios-pipeline-contract.json");
const aiosPayload = parsed.get("examples/edix-modules.payload.json");
const aicfoPayload = parsed.get("examples/aicfo-modules.payload.json");

if (aiosCatalog) {
  assertUnique(aiosCatalog.stages ?? [], (stage) => stage.key, "aios-module-catalog stages");

  const stageKeys = new Set((aiosCatalog.stages ?? []).map((stage) => stage.key));
  for (const stage of aiosCatalog.stages ?? []) {
    for (const dependency of stage.depends_on ?? []) {
      if (!stageKeys.has(dependency)) {
        fail(`aios-module-catalog ${stage.key}: depends_on ${dependency} not found in stages`);
      }
    }
  }

  const tierRules = aiosCatalog.tierRules ?? {};
  const manualKeys = new Set((aiosCatalog.manualStages ?? []).map((stage) => stage.key));
  for (const [tier, rules] of Object.entries(tierRules)) {
    for (const stageKey of rules.stages ?? []) {
      if (!stageKeys.has(stageKey) && !manualKeys.has(stageKey)) {
        fail(`aios-module-catalog tierRules ${tier}: unknown stage ${stageKey}`);
      }
    }
  }
}

if (aiosContract) {
  const fields = aiosContract.fields ?? [];
  const fieldKeys = new Set(fields.map((field) => field.key));
  const requiredFromFields = fields.filter((field) => field.required).map((field) => field.key);
  const requiredFields = aiosContract.requiredFields ?? [];

  for (const field of requiredFields) {
    if (!fieldKeys.has(field)) fail(`aios-pipeline-contract: requiredFields contains unknown field ${field}`);
  }

  for (const field of requiredFromFields) {
    if (!requiredFields.includes(field)) {
      fail(`aios-pipeline-contract: field ${field} is required=true but missing from requiredFields`);
    }
  }

  assertDeliveryType(aiosContract.delivery_type, "aios-pipeline-contract.delivery_type", { allowAny: false });
}

function validateAiosPayloadShape(payload, label, contract, catalog) {
  if (!payload) return;
  const tierKeys = new Set(Object.keys(catalog?.tierRules ?? {}));
  for (const module of payload.modules ?? []) {
    if (!module.key) fail(`${label}: module without key`);
    if (!tierKeys.has(module.tier)) {
      fail(`${label}: module ${module.key} has unknown tier ${module.tier}`);
    }
    if (typeof module.week !== "number") {
      fail(`${label}: module ${module.key} week must be a number`);
    }
    if (module.delivery_type !== undefined) {
      assertDeliveryType(module.delivery_type, `${label} module ${module.key}.delivery_type`, { allowAny: false });
    }
  }
  if (contract) {
    const requiredFields = contract.requiredFields ?? [];
    for (const field of requiredFields) {
      const value = payload[field];
      const empty = value === undefined || value === null || value === "" ||
        (Array.isArray(value) && value.length === 0);
      if (empty) fail(`${label}: missing required field ${field}`);
    }
  }
  if (payload.delivery_type !== undefined) {
    assertDeliveryType(payload.delivery_type, `${label}.delivery_type`, { allowAny: false });
  }
}

validateAiosPayloadShape(aiosPayload, "examples/edix-modules.payload.json", aiosContract, aiosCatalog);
validateAiosPayloadShape(aicfoPayload, "examples/aicfo-modules.payload.json", aiosContract, aiosCatalog);

if (aiosModuleFunctionalities && Array.isArray(aiosModuleFunctionalities.modules)) {
  assertUnique(aiosModuleFunctionalities.modules, (m) => m.key, "aios-module-functionalities modules");
} else if (aiosModuleFunctionalities && typeof aiosModuleFunctionalities === "object") {
  // Tolerate alternative shape: object keyed by module.
  const keys = Object.keys(aiosModuleFunctionalities).filter((k) => typeof aiosModuleFunctionalities[k] === "object");
  if (keys.length === 0) fail(`aios-module-functionalities.json: no modules detected`);
}

if (errors.length) {
  console.error("Validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Validation ok");
