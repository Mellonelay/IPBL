import assert from "node:assert/strict";
import { classifyBackfillSourceFailure } from "../lib/server/supabase-backfill-handler.ts";

for (const code of ["division_identity_unresolved", "division_mismatch", "source_day_mismatch"]) {
  const failure = classifyBackfillSourceFailure(new Error(code));
  assert.equal(failure.code, code);
  assert.equal(failure.retryable, false, "identity conflicts must be quarantined, not silently retried");
  assert.doesNotMatch(failure.message, /private|secret|token/i);
}
const malformed = classifyBackfillSourceFailure(new Error("invalid_calendar_response"));
assert.equal(malformed.retryable, true, "malformed source response remains retryable");
console.log("Official calendar identity failure classification tests passed");
