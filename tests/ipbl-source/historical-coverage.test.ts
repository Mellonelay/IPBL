import assert from "node:assert/strict";
import { divisionsForResultsMonth } from "../../src/config/divisions.ts";
import { confirmedEmptyResultState, historicalUnverifiedResultState, shouldShowNoMatchesToday } from "../../src/results/result-states.ts";

assert.equal(divisionsForResultsMonth(2026, 4).length, 12, "May 2026 must represent all 12 active/historical divisions");
assert.equal(divisionsForResultsMonth(2026, 5).length, 14, "June 2026 must use the current 14-division set");
assert.equal(shouldShowNoMatchesToday(historicalUnverifiedResultState("ipbl-66-m-pro-a", "2026-05-01")), false);
assert.equal(shouldShowNoMatchesToday(confirmedEmptyResultState({ divisionId: "ipbl-66-m-pro-a", date: "2026-05-01", source: "official" })), true);
