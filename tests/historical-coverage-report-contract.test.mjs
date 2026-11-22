import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const report = readFileSync(new URL("../scripts/ipbl-historical-coverage.sql", import.meta.url), "utf8");
assert.match(report,/\^\[0-9\]\{4\}-\[0-9\]\{2\}-\[0-9\]\{2\}\$/,"source-local date filter must match actual YYYY-MM-DD observations");
assert.doesNotMatch(report,/\\\\d\{4\}/,"SQL must not contain doubly escaped regex digits");
assert.match(report,/legacy_empty_unverified/,"legacy confirmed-empty is not authoritative archive proof");
assert.match(report,/period_score_conflicts/,"report must surface quarter-total disagreements");
console.log("Historical coverage SQL report contract passed");
