export const MARKETING_REPOSITORY =
  "https://github.com/rafaelnovaes22/marketing-ai-agents.git";

/** @param {Record<string,string|undefined>} environment @returns {Record<string,string|undefined>} */
export function authenticatedGitEnvironment(environment) {
  const token = environment.GITHUB_TOKEN || environment.GH_TOKEN;
  const childEnvironment = { ...environment, GIT_TERMINAL_PROMPT: "0" };
  if (!token) return childEnvironment;
  const count = Number(environment.GIT_CONFIG_COUNT ?? "0");
  if (!Number.isSafeInteger(count) || count < 0)
    throw new Error("Invalid Git configuration count");
  // Ephemeral configuration avoids writing tokens into origin URLs or command arguments.
  // https://git-scm.com/docs/git-config#Documentation/git-config.txt-GITCONFIGCOUNT
  childEnvironment.GIT_CONFIG_COUNT = String(count + 1);
  childEnvironment[`GIT_CONFIG_KEY_${count}`] =
    "http.https://github.com/.extraheader";
  childEnvironment[`GIT_CONFIG_VALUE_${count}`] =
    `AUTHORIZATION: basic ${Buffer.from(`x-access-token:${token}`).toString("base64")}`;
  return childEnvironment;
}

/** @param {string} origin @param {string} branch @param {string} changes @returns {boolean} */
export function canRefreshMarketingCheckout(origin, branch, changes) {
  const allowedOrigins = new Set([
    MARKETING_REPOSITORY,
    MARKETING_REPOSITORY.replace(/\.git$/, ""),
    "git@github.com:rafaelnovaes22/marketing-ai-agents.git",
  ]);
  return (
    allowedOrigins.has(origin.trim()) &&
    branch.trim() === "main" &&
    !changes.trim()
  );
}
