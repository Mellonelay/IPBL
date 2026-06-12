import assert from "node:assert/strict";
import { describeResultState, resultStateForStoredDay, shouldShowNoMatchesToday } from "../src/results/result-states.ts";

const base = { source: "official", checkedAt: "2026-06-12T00:00:00Z", verifiedThroughDate: "2026-06-11" };
const confirmed = resultStateForStoredDay({ divisionId: "a", date: "2026-06-10", matches: [], metadata: { ...base, status: "ok" as const } });
assert.equal(confirmed.kind, "confirmed_empty");
assert.equal(shouldShowNoMatchesToday(confirmed), true);
assert.equal(describeResultState(confirmed), "No matches today");

const unavailableFuture = resultStateForStoredDay({ divisionId: "a", date: "2026-06-12", matches: [], metadata: { ...base, status: "source_unavailable" as const } });
assert.equal(unavailableFuture.kind, "source_unavailable");
assert.equal(shouldShowNoMatchesToday(unavailableFuture), false);
assert.match(describeResultState(unavailableFuture), /Source unavailable/);

const unavailableVerifiedPast = resultStateForStoredDay({ divisionId: "a", date: "2026-06-11", matches: [], metadata: { ...base, status: "source_unavailable" as const } });
assert.equal(unavailableVerifiedPast.kind, "confirmed_empty");

const legacy = resultStateForStoredDay({ divisionId: "a", date: "2026-06-01", matches: [], metadata: { ...base, status: "legacy" as const } });
assert.equal(legacy.kind, "historical_unverified");
assert.equal(describeResultState(legacy), "Results not yet verified");

const loaded = resultStateForStoredDay({ divisionId: "a", date: "2026-06-12", matches: [{ id: 1 }], metadata: { ...base, status: "source_unavailable" as const } });
assert.equal(loaded.kind, "loaded");

console.log("Phase A Results evidence-state tests passed");
