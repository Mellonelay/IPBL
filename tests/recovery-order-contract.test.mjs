import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const sql = readFileSync(new URL("../supabase/migrations/20261122000000_recovery_order_and_unverified_empty.sql", import.meta.url), "utf8");
assert.match(sql, /order by s\.window_start desc, d\.tag/i, "leases must prioritize newest dates");
assert.match(sql, /order by c\.window_start desc, d\.tag/i, "claimed segments must be returned newest first");
assert.match(sql, /when v_observed = 0 then 'quarantined'/, "zero rows are not proof of verified absence");
assert.match(sql, /unverified_empty_source/, "unproven empty source must carry a reason");
assert.doesNotMatch(sql, /when v_observed = 0 then 'confirmed_empty'/);
console.log("Reverse backfill and unverified-empty SQL contract tests passed");
