import assert from "node:assert/strict";
import { test } from "node:test";
import {
  authenticatedGitEnvironment,
  canRefreshMarketingCheckout,
  MARKETING_REPOSITORY,
} from "../scripts/lib/repository-bootstrap.mjs";

test("worker authentication is ephemeral and does not change the clone URL", () => {
  const input = {
    GITHUB_TOKEN: "synthetic-test-token",
    GIT_CONFIG_COUNT: "1",
    GIT_CONFIG_KEY_0: "color.ui",
    GIT_CONFIG_VALUE_0: "false",
  };
  const child = authenticatedGitEnvironment(input);
  assert.equal(child.GIT_CONFIG_COUNT, "2");
  assert.equal(child.GIT_CONFIG_KEY_1, "http.https://github.com/.extraheader");
  assert.equal(child.GIT_CONFIG_KEY_0, "color.ui");
  assert.equal(input.GIT_CONFIG_COUNT, "1");
  assert.doesNotMatch(MARKETING_REPOSITORY, /synthetic-test-token|@/);
});

test("worker refuses to overwrite dirty checkouts or update another repository", () => {
  assert.equal(
    canRefreshMarketingCheckout(MARKETING_REPOSITORY, "main", ""),
    true,
  );
  assert.equal(
    canRefreshMarketingCheckout(MARKETING_REPOSITORY, "main", " M project.md"),
    false,
  );
  assert.equal(
    canRefreshMarketingCheckout(MARKETING_REPOSITORY, "codex/work", ""),
    false,
  );
  assert.equal(
    canRefreshMarketingCheckout(
      "https://github.com/another/project.git",
      "main",
      "",
    ),
    false,
  );
});
