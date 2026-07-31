import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration = readFileSync(
  new URL("../supabase/migrations/20260731121000_initial_ipbl_canonical_schema.sql", import.meta.url),
  "utf8",
);
const config = readFileSync(new URL("../supabase/config.toml", import.meta.url), "utf8");

assert.match(migration, /direct Supabase project hdrkrtfpcuzsbegytrei/);
assert.doesNotMatch(migration, /rxpjpwqqpdrnlvuhchyg/);
assert.doesNotMatch(migration, /^\s*(drop|truncate)\b/im);
assert.doesNotMatch(migration, /postgres(?:ql)?:\/\/[^:\s]+:[^@\s]+@/i);
assert.doesNotMatch(migration, /\bsb_secret_[A-Za-z0-9_-]+/);

const tableCount = (migration.match(/^create table public\./gim) ?? []).length;
const viewCount = (migration.match(/^create view public\./gim) ?? []).length;
const rlsCount = (migration.match(/^alter table public\..* enable row level security;/gim) ?? []).length;
assert.equal(tableCount, 11);
assert.equal(viewCount, 6);
assert.equal(rlsCount, 11);

for (const table of [
  "divisions",
  "teams",
  "team_aliases",
  "games",
  "game_periods",
  "source_observations",
]) {
  assert.match(migration, new RegExp(`create table public\\.${table}\\b`, "i"));
}

for (const view of [
  "team_history_games",
  "h2h_matchup_summary",
  "team_recent_form",
  "quarter_tendency_summary",
  "source_agreement_summary",
  "results_games",
]) {
  assert.match(migration, new RegExp(`create view public\\.${view}\\b`, "i"));
}

assert.match(migration, /games_h2h_verified_finished_idx/);
assert.match(migration, /pair_low_id, pair_high_id/);
for (const state of [
  "verified",
  "confirmed_empty",
  "retryable_failure",
  "quarantined",
]) {
  assert.match(migration, new RegExp(`'${state}'`));
}
assert.match(migration, /revoke all on table public\.divisions[\s\S]+from anon, authenticated;/i);
assert.match(migration, /grant select[\s\S]+to service_role;/i);
assert.ok(migration.trimEnd().endsWith(";"));

const seedSection = config.split("[db.seed]", 2)[1]?.split("\n[", 1)[0] ?? "";
assert.match(seedSection, /enabled = false/);
assert.match(seedSection, /sql_paths = \[\]/);

console.log("Supabase migration contract tests passed");
