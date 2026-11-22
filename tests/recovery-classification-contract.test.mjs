import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const sql = readFileSync(new URL("../supabase/migrations/20261122090000_recovery_classification_integrity.sql", import.meta.url), "utf8");
assert.match(sql, /when v_accepted = 0 then 'quarantined'/i, "zero accepted canonical games cannot certify coverage");
assert.match(sql, /unverified_no_accepted_games/, "zero accepted source response has explicit non-verified reason");
assert.match(sql, /unparseable_row/, "unparseable observations must not silently certify a segment");
assert.match(sql, /on conflict \(official_game_id\)/i, "canonical reconciliation should remain idempotent");
assert.doesNotMatch(sql, /when v_observed = 0 then 'confirmed_empty'/i);
console.log("Backfill evidence classification contract passed");
