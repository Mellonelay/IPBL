import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const worker = readFileSync(
  new URL("../supabase/migrations/20260731161109_add_resumable_backfill_worker.sql", import.meta.url),
  "utf8"
);
const aliases = readFileSync(
  new URL("../supabase/migrations/20260731165000_add_missing_men_z_team_aliases.sql", import.meta.url),
  "utf8"
);
const periodPolicy = readFileSync(
  new URL("../supabase/migrations/20260731165500_classify_period_conflict_as_nonblocking.sql", import.meta.url),
  "utf8"
);
const historicalAliases = readFileSync(
  new URL("../supabase/migrations/20260731171946_seed_historical_rotation_aliases.sql", import.meta.url),
  "utf8"
);

for (const name of [
  "ipbl_start_backfill",
  "ipbl_claim_backfill_segments",
  "ipbl_commit_backfill_segment",
  "ipbl_fail_backfill_segment",
  "ipbl_backfill_status",
  "ipbl_team_history_worker",
]) {
  assert.match(worker, new RegExp(`function public\\.${name}\\b`, "i"), `${name} missing`);
}

assert.match(worker, /private\.backfill_worker_config/);
assert.match(worker, /source_observations_source_hash_uidx/);
assert.match(worker, /backfill_segments_run_division_window_uidx/);
assert.match(worker, /security definer/gi);
assert.match(worker, /search_path TO ''/i);

assert.doesNotMatch(worker, /insert\s+into\s+private\.backfill_worker_config/i);
assert.doesNotMatch(worker, /values\s*\(\s*true\s*,\s*'[0-9a-f]{64}'/i);
assert.doesNotMatch(worker, /\bsb_secret_[A-Za-z0-9_-]+/);
assert.doesNotMatch(worker, /postgres(?:ql)?:\/\//i);
assert.doesNotMatch(worker, /\b(?:drop\s+table|truncate\s+table)\b/i);
assert.doesNotMatch(worker, /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i);
assert.match(worker, /grant execute on function public\.ipbl_start_backfill[\s\S]*to anon/i);
assert.match(worker, /revoke execute on function public\.ipbl_start_backfill[\s\S]*from public, authenticated/i);

assert.match(aliases, /'76053',\s*'Revda'/);
assert.match(aliases, /'76056',\s*'Ufa'/);
assert.match(aliases, /ipbl-66-m-pro-z/);
assert.doesNotMatch(aliases, /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i);
assert.doesNotMatch(aliases, /\b(?:drop\s+table|truncate\s+table)\b/i);

assert.match(periodPolicy, /period_total_conflict/g);
assert.match(periodPolicy, /is distinct from 'period_total_conflict'/i);
assert.match(periodPolicy, /f\.resolved_at is null/i);
assert.match(periodPolicy, /new\.status := 'verified'/i);
assert.match(periodPolicy, /period_evidence_quarantined/i);
assert.doesNotMatch(periodPolicy, /quarantined_game_count\s*=\s*0/i);
assert.doesNotMatch(periodPolicy, /\b(?:drop\s+table|truncate\s+table)\b/i);
assert.doesNotMatch(periodPolicy, /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i);

for (const [sourceId, name] of [
  ["76042", "Omsk"],
  ["76045", "Vorkuta"],
  ["76077", "Kirov"],
  ["76080", "Perm"],
]) {
  assert.match(historicalAliases, new RegExp(`'${sourceId}'[\\s\\S]{0,80}'${name}'`));
}
assert.match(historicalAliases, /where not exists/gi);
assert.doesNotMatch(historicalAliases, /\b(?:drop\s+table|truncate\s+table)\b/i);
assert.doesNotMatch(historicalAliases, /postgres(?:ql)?:\/\//i);
assert.doesNotMatch(historicalAliases, /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i);

console.log("Supabase backfill migration contract tests passed");
