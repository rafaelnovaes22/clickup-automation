#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { root } from "./lib/env.mjs";

const jsonFiles = [
  "config/activity-catalog.json",
  "config/clickup-custom-fields.json",
  "config/clickup-governance.blueprint.json",
  "config/clickup-task-templates.json",
  "config/diagnostic-output-contract.json",
  "config/tech-automation-contract.json",
  "config/tech-operational-repository.json",
  "config/tech-platform-catalog.json",
  "examples/clickup-tech-tasks.fixture.json",
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

for (const file of jsonFiles) {
  await readJson(file);
}

const techContract = parsed.get("config/tech-automation-contract.json");
const blueprint = parsed.get("config/clickup-governance.blueprint.json");
const customFields = parsed.get("config/clickup-custom-fields.json");
const platformCatalog = parsed.get("config/tech-platform-catalog.json");
const techRepo = parsed.get("config/tech-operational-repository.json");
const samplePayload = parsed.get("examples/tech-scope.sample.json");

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
}

if (platformCatalog) {
  assertUnique(platformCatalog.platforms ?? [], (platform) => platform.key, "tech-platform-catalog platforms");

  for (const platform of platformCatalog.platforms ?? []) {
    assertUnique(platform.tasks ?? [], (task) => task.key, `tech-platform-catalog ${platform.key} tasks`);
  }
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
}

if (platformCatalog && samplePayload) {
  const platformKeys = new Set((platformCatalog.platforms ?? []).map((platform) => platform.key));
  for (const platform of samplePayload.technical_platforms ?? []) {
    if (!platformKeys.has(platform)) fail(`examples/tech-scope.sample.json: unknown platform ${platform}`);
  }
}

if (blueprint) {
  const listKeys = new Set();
  for (const space of blueprint.spaces ?? []) {
    for (const list of space.lists ?? []) {
      listKeys.add(`${space.name}/${list.name}`);
    }
  }

  if (customFields) {
    for (const fieldSet of customFields.fieldSets ?? []) {
      const key = `${fieldSet.target?.space}/${fieldSet.target?.list}`;
      if (!listKeys.has(key)) fail(`clickup-custom-fields ${fieldSet.key}: target list not found in blueprint: ${key}`);
      assertUnique(fieldSet.fields ?? [], (field) => field.key, `clickup-custom-fields ${fieldSet.key} fields`);
      assertUnique(fieldSet.fields ?? [], (field) => field.name, `clickup-custom-fields ${fieldSet.key} field names`);
    }
  }

  const taskTemplates = parsed.get("config/clickup-task-templates.json");
  if (taskTemplates) {
    for (const template of taskTemplates.templates ?? []) {
      const key = `${template.target?.space}/${template.target?.list}`;
      if (!listKeys.has(key)) fail(`clickup-task-templates ${template.key}: target list not found in blueprint: ${key}`);
    }
  }
}

if (errors.length) {
  console.error("Validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Validation ok");
