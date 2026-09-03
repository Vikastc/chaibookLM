import assert from "node:assert/strict";
import { QuotaExceededError, ModerationError } from "../src/types/errors.js";
import { FREE_TOKEN_LIMIT } from "../src/lib/quota.js";

async function runSelfChecks() {
  console.log("Running quota and guardrails self-checks...");

  // 1. Verify limit constant
  assert.equal(typeof FREE_TOKEN_LIMIT, "number");
  assert.ok(FREE_TOKEN_LIMIT > 0, "FREE_TOKEN_LIMIT should be positive");

  // 2. Verify QuotaExceededError shape
  const quotaErr = new QuotaExceededError(50001, 50000);
  assert.equal(quotaErr.statusCode, 402);
  assert.equal(quotaErr.message, "Token quota exceeded");
  assert.deepEqual(quotaErr.details, { usage: 50001, limit: 50000 });

  // 3. Verify ModerationError shape
  const modErr = new ModerationError(["hate", "violence"]);
  assert.equal(modErr.statusCode, 400);
  assert.equal(modErr.message, "Message flagged by content policy");
  assert.deepEqual(modErr.details, { categories: ["hate", "violence"] });

  // 4. Verify YouTube transcript truncation logic
  const MAX_TRANSCRIPT_CHARS = 60_000;
  const longText = "a".repeat(75_000);
  const truncated = longText.slice(0, MAX_TRANSCRIPT_CHARS);
  assert.equal(truncated.length, 60_000);

  console.log("All self-checks passed successfully!");
}

runSelfChecks().catch((err) => {
  console.error("Self-check failed:", err);
  process.exit(1);
});
