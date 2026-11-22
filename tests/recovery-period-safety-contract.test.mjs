import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const sql = readFileSync(new URL("../supabase/migrations/20261122160100_prevent_stale_period_upserts.sql", import.meta.url),"utf8");
assert.match(sql,/v_updatable_game_ids bigint\[\]/,"only successfully inserted/updated canonical matches can write periods");
assert.match(sql,/array_append\(v_updatable_game_ids/,"remember successful canonical upserts");
assert.match(sql,/ANY\(v_updatable_game_ids\)/,"periods must be scoped to accepted game mutations");
assert.match(sql,/excluded\.source_updated_at/,"source ordering must be considered by canonical upsert");
console.log("Historical period stale-write SQL contract passed");
