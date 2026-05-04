import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const envPath = resolve(root, ".env");

export async function loadLocalEnv(path = envPath) {
  let content;
  try {
    content = await readFile(path, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return;
    throw error;
  }

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) process.env[key] = value;
  }
}

export function clickUpCredentials(env = process.env) {
  return {
    token: env.CLICKUP_TOKEN ?? env.ACME_INTERNAL_CLICKUP_TOKEN,
    teamId: env.CLICKUP_TEAM_ID ?? env.ACME_INTERNAL_WORKSPACE_ID
  };
}

export function githubToken(env = process.env) {
  return env.GITHUB_TOKEN ?? env.GH_TOKEN;
}
