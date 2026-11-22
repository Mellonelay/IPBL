import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const sql = readFileSync(new URL("../scripts/sql/ipbl-october-2026-official-recovery-proof.sql", import.meta.url), "utf8");
assert.match(sql,/2026-10-01/, "requested recovery must begin October 1");
assert.match(sql,/2026-11-22/, "the reference snapshot date must be explicit");
assert.match(sql,/official_ipbl_calendar_audit/, "audit must use persisted independent official responses");
assert.match(sql,/source_record_id/, "evidence must be scoped to exact division and date");
assert.match(sql,/jsonb_array_length/, "a 200 response without a complete envelope is not proof");
assert.match(sql,/league,tag/, "division identity must match each returned game");
assert.match(sql,/game,localDate/, "source-local date must match the requested day");
assert.match(sql,/ResultConfirmed.*Result/, "finished and result states must be distinguished");
assert.match(sql,/missing_completed_game_ids/, "all completed source IDs must be reconciled");
assert.match(sql,/date_division_conflicts/, "canonical date and division must be compared");
assert.match(sql,/period_score_conflicts/, "official individual period values must be compared");
assert.doesNotMatch(sql,/UPDATE\s+public\.|DELETE\s+FROM\s+public\./i, "coverage proof must remain read-only");
console.log("Official October source-to-canonical coverage proof contract passed");
