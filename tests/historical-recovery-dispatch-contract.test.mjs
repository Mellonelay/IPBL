import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// This contract must fail until the durable historical driver is implemented.
const sql = readFileSync(new URL("../supabase/migrations/20261122160000_durable_reverse_historical_dispatch.sql", import.meta.url), "utf8");
assert.match(sql,/private\.ipbl_enqueue_reverse_historical/, "campaign entrypoint must exist");
assert.match(sql,/owner-historical-recovery/, "persisted runs must have a distinct source");
assert.match(sql,/recovery_order/, "recent windows must be claimed before older windows");
assert.match(sql,/p_from date, p_to date/, "campaign must use explicit UTC-independent source-local dates");
assert.match(sql,/ipbl_start_backfill/, "must reuse existing run and segment ledger");
assert.match(sql,/ipbl_dispatch_current_ingest/, "must reuse existing cron worker");
assert.match(sql,/ipbl-current-season-worker/, "campaign must schedule the existing worker");
assert.match(sql,/date range exceeds campaign maximum/, "historical requests must have bounded scope");
assert.match(sql,/recovery already active/, "overlapping campaigns must be prevented");
assert.match(sql,/REVOKE ALL ON FUNCTION private\.ipbl_enqueue_reverse_historical/, "privileged entrypoint cannot be public");
console.log("Durable historical recovery contract passed");
