/** @typedef {{framework?: {canonical?: boolean, version?: string, constitution_version?: string}, consumer?: {project_type?: string, ai_enabled?: boolean}}} ConsumerManifest */
/** @typedef {{project?: {type?: string, ai_enabled?: boolean}}} ConsumerProject */
/** @typedef {{_foundry_version?: string, _constitution_version?: string}} ConsumerSettings */

/** @param {ConsumerManifest | null} manifest @param {ConsumerProject | null} project @returns {string[]} */
function identityErrors(manifest, project) {
  const errors = [];
  if (manifest?.framework?.canonical !== false) errors.push("ClickUp must declare framework.canonical=false: this repository consumes Foundry");
  if (project?.project?.type !== "automation") errors.push(`Expected project.type=automation, received ${project?.project?.type}`);
  if (typeof project?.project?.ai_enabled !== "boolean") errors.push("project.ai_enabled must be an explicit boolean");
  if (manifest?.consumer?.project_type !== project?.project?.type) errors.push("consumer.project_type must match project.type");
  if (manifest?.consumer?.ai_enabled !== project?.project?.ai_enabled) errors.push("consumer.ai_enabled must match project.ai_enabled");
  return errors;
}

/** @param {ConsumerManifest | null} manifest @param {ConsumerProject | null} project @param {ConsumerSettings | null} settings @param {string} constitution @returns {string[]} */
export function consumerContractErrors(manifest, project, settings, constitution) {
  const errors = identityErrors(manifest, project);
  const version = constitution.match(/\*\*Versão\*\*: ([\d.]+)/)?.[1];
  if (!manifest?.framework?.version || manifest.framework.version !== settings?._foundry_version) errors.push("Foundry version must match manifest and settings");
  if (!version || manifest?.framework?.constitution_version !== version || settings?._constitution_version !== version) errors.push("Constitution version must match its file, manifest and settings");
  return errors;
}
