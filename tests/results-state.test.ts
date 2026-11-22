import assert from "node:assert/strict";
import { describeResultState, resultStateForStoredDay, shouldShowNoMatchesToday } from "../src/results/result-states.ts";

const base = { source: "official", checkedAt: "2026-06-12T00:00:00Z", verifiedThroughDate: "2026-06-11" };
const confirmed = resultStateForStoredDay({ divisionId: "a", date: "2026-06-10", matches: [], metadata: { ...base, status: "ok" as const } });
assert.equal(confirmed.kind, "unverified");
assert.equal(shouldShowNoMatchesToday(confirmed), false);
assert.equal(describeResultState(confirmed), "Results not yet verified");

const scopedProof = resultStateForStoredDay({ divisionId: "a", date: "2026-06-10", matches: [], metadata: { ...base, status: "ok", divisionTag: "a", verifiedEmptyDates: ["2026-06-10"] } });
assert.equal(scopedProof.kind, "confirmed_empty");
assert.equal(shouldShowNoMatchesToday(scopedProof), true);
const wrongDivision = resultStateForStoredDay({ divisionId: "b", date: "2026-06-10", matches: [], metadata: { ...base, status: "ok", divisionTag: "a", verifiedEmptyDates: ["2026-06-10"] } });
assert.equal(wrongDivision.kind, "unverified");
const wrongDay = resultStateForStoredDay({ divisionId: "a", date: "2026-06-09", matches: [], metadata: { ...base, status: "ok", divisionTag: "a", verifiedEmptyDates: ["2026-06-10"] } });
assert.equal(wrongDay.kind, "unverified");

const unavailableFuture = resultStateForStoredDay({ divisionId: "a", date: "2026-06-12", matches: [], metadata: { ...base, status: "source_unavailable" as const } });
assert.equal(unavailableFuture.kind, "source_unavailable");
assert.equal(shouldShowNoMatchesToday(unavailableFuture), false);
assert.match(describeResultState(unavailableFuture), /Source unavailable/);

const unavailableVerifiedPast = resultStateForStoredDay({ divisionId: "a", date: "2026-06-11", matches: [], metadata: { ...base, status: "source_unavailable" as const } });
assert.equal(unavailableVerifiedPast.kind, "source_unavailable");
const staleProof = resultStateForStoredDay({ divisionId: "a", date: "2026-06-10", matches: [], metadata: { ...base, status: "source_unavailable", divisionTag: "a", verifiedEmptyDates: ["2026-06-10"] } });
assert.equal(staleProof.kind, "source_unavailable");

const legacy = resultStateForStoredDay({ divisionId: "a", date: "2026-06-01", matches: [], metadata: { ...base, status: "legacy" as const } });
assert.equal(legacy.kind, "historical_unverified");
assert.equal(describeResultState(legacy), "Results not yet verified");

const loaded = resultStateForStoredDay({ divisionId: "a", date: "2026-06-12", matches: [{ id: 1 }], metadata: { ...base, status: "source_unavailable" as const } });
assert.equal(loaded.kind, "loaded");

console.log("Phase A Results evidence-state tests passed");
