import assert from "node:assert/strict";
import { RESULTS_SYNC_TAGS, resultsMetadataKey, resultsSyncSlots, resultsSyncTagsForMonth } from "../lib/server/results-sync-constants.ts";
import { legacyResultsMetadata } from "../lib/server/results-hardening.ts";
import { LIVE_DIVISION_TAGS } from "../src/config/divisions.ts";
import type { StoredResultsMonthMap } from "../lib/server/results-types.ts";

assert.equal(resultsMetadataKey(2026, 6, "ipbl-66-m-pro-a"), "ipbl:results:2026:06:ipbl-66-m-pro-a:meta");
assert.equal(resultsSyncTagsForMonth(2026, 5).length, 14);
assert.equal(resultsSyncTagsForMonth(2026, 6).length, 14);
assert.equal(resultsSyncTagsForMonth(2026, 6).includes("ipbl-66-m-pro-g"), true);

const slots = resultsSyncSlots(new Date("2026-06-12T00:00:00Z"));
assert.deepEqual([...new Set(slots.map((slot) => `${slot.year}-${slot.month}`))], ["2026-6", "2026-5"]);
assert.equal(slots.length, resultsSyncTagsForMonth(2026, 6).length + resultsSyncTagsForMonth(2026, 5).length);

const map: StoredResultsMonthMap = {
  "2026-06-01": [{ date: "2026-06-01", division: "Pro Men A", divisionTag: "ipbl-66-m-pro-a", games: [] }],
  "2026-06-02": [{ date: "2026-06-02", division: "Pro Men A", divisionTag: "ipbl-66-m-pro-a", games: [{ game: { gameId: 1 } } as any] }],
};
const legacy = legacyResultsMetadata({ map, year: 2026, month: 6, divisionTag: "ipbl-66-m-pro-a" });
assert.equal(legacy.status, "legacy");
assert.equal(legacy.verifiedThroughDate, "2026-06-02");

console.log("Phase A Results sync policy tests passed");
