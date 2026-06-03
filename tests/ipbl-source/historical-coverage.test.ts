import assert from "node:assert/strict";
import {
  REQUIRED_HISTORICAL_COVERAGE_DATES,
  REQUIRED_HISTORICAL_EXPECTED_SLOT_COUNT,
  REQUIRED_HISTORICAL_SELECTED_DIVISIONS,
  REQUIRED_HISTORICAL_SELECTED_DIVISION_TAGS,
  buildRequiredHistoricalCoverageSlots,
  shouldShowNoMatchesTodayForHistoricalState,
} from "../../src/results/historical-coverage.ts";

const slots = buildRequiredHistoricalCoverageSlots();
const mayDates = REQUIRED_HISTORICAL_COVERAGE_DATES.filter((date) => date.startsWith("2026-05-"));
const tags = new Set(REQUIRED_HISTORICAL_SELECTED_DIVISION_TAGS);

assert.equal(mayDates.length, 31, "May 2026 must include 31 represented dates");
assert.ok(REQUIRED_HISTORICAL_COVERAGE_DATES.includes("2026-06-01"), "June 1, 2026 must be represented");
assert.equal(REQUIRED_HISTORICAL_SELECTED_DIVISIONS.length, 10, "All 10 selected betting divisions must be represented");
assert.equal(slots.length, 320, "Expected 320 division-date slots");
assert.equal(REQUIRED_HISTORICAL_EXPECTED_SLOT_COUNT, 320, "Expected slot constant must be 320");

assert.ok(tags.has("ipbl-66-w-pro-g"), "Women Pro G must be included in selected divisions");
assert.ok(tags.has("ipbl-66-w-pro-k"), "Women Pro K must be included in selected divisions");
assert.ok(tags.has("ipbl-66-m-pro-g"), "Men Pro G must remain in watchlist coverage");

const menProG = REQUIRED_HISTORICAL_SELECTED_DIVISIONS.find((division) => division.tag === "ipbl-66-m-pro-g");
assert.equal(menProG?.status, "source_unverified", "Men Pro G must be watchlist-only/source-unverified unless live source discovers it active");

for (const slot of slots) {
  assert.match(slot.date, /^2026-0[56]-\d{2}$/);
  assert.ok(tags.has(slot.division));
  assert.equal(slot.matches.length, 0, "unverified historical slots must not invent match rows");
  assert.equal(slot.scoreVerified, false, "unverified historical slots must not claim verified scores");
  assert.equal(slot.confirmedEmpty, false, "unverified historical slots must not be confirmed empty");
  assert.notEqual(slot.state, "confirmed_empty", "missing historical data must not map to confirmed_empty");
  assert.ok(slot.state === "historical_unverified" || slot.state === "pending_backfill" || slot.state === "source_unavailable");
  assert.equal(shouldShowNoMatchesTodayForHistoricalState(slot.state), false, "No matches today must not render for historical unverified slots");
}

assert.equal(shouldShowNoMatchesTodayForHistoricalState("confirmed_empty"), true, "No matches today is allowed only for confirmed_empty");
