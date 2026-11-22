import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const sql = readFileSync(new URL("../supabase/migrations/20261122173000_include_official_pending_results_in_team_history_view.sql", import.meta.url), "utf8");
assert.match(sql,/CREATE OR REPLACE VIEW public\.team_history_games/i);
assert.match(sql,/g\.verification_state = 'pending'/);
assert.match(sql,/g\.status = 'Result'/);
assert.match(sql,/g\.canonical_source = 'official_ipbl'/);
assert.match(sql,/g\.verification_state = ANY \(ARRAY\['verified'/);
assert.match(sql,/g\.home_score IS NOT NULL/i);
assert.match(sql,/g\.away_score IS NOT NULL/i);
assert.doesNotMatch(sql,/g\.status\s*=\s*'(?:Online|Scheduled)'/i);
assert.doesNotMatch(sql,/\b(?:INSERT|UPDATE|DELETE)\s+(?:INTO\s+|FROM\s+)?public\./i);
console.log("Official pending Result shared view contract passed");
