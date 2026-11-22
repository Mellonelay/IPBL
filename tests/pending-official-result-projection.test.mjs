import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const sql = readFileSync(new URL("../supabase/migrations/20261122170000_include_pending_official_results_in_projection.sql", import.meta.url), "utf8");
assert.match(sql,/ipbl_results_month_worker/, "reuse existing privileged month reader");
assert.match(sql,/verification_state='verified'/,"existing verified games retained");
assert.match(sql,/verification_state='pending'/,"pending result games must be eligible");
assert.match(sql,/h\.status='Result'/,"pending exception restricted to source-completed Result state");
assert.match(sql,/h\.canonical_source='official_ipbl'/,"pending exception restricted to official evidence");
assert.doesNotMatch(sql,/h\.status\s+IN\s*\([^)]*(?:Online|Scheduled)/i,"unfinished fixtures cannot enter Results");
assert.match(sql,/private\.require_ipbl_backfill_secret/,"privileged RPC authorization retained");
assert.doesNotMatch(sql,/\b(?:UPDATE|DELETE|INSERT)\s+(?:INTO\s+|FROM\s+)?public\./i,"read projection must not alter canonical data");
console.log("Pending official Result projection contract passed");
