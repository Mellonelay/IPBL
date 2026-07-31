import assert from "node:assert/strict";
import { resolveInitialRouteState } from "../src/app/initial-route.ts";

const allowed = ["ipbl-66-m-pro-a", "ipbl-66-w-pro-b"] as const;
const fallbackResults = { year: 2026, monthIndex: 5 };

const requested = resolveInitialRouteState({
  search: "?tab=results&date=2026-07-31&division=ipbl-66-w-pro-b",
  fallbackResults,
  defaultDivisionTag: "ipbl-66-m-pro-a",
  allowedDivisionTags: allowed,
});
assert.deepEqual(requested, {
  activeTab: "results",
  resultsYear: 2026,
  resultsMonthIndex: 6,
  resultsDivisionTag: "ipbl-66-w-pro-b",
  jumpDate: "2026-07-31",
});

const rejected = resolveInitialRouteState({
  search: "?tab=invalid&date=2026-02-31&division=unknown",
  fallbackResults,
  defaultDivisionTag: "ipbl-66-m-pro-a",
  allowedDivisionTags: allowed,
});
assert.equal(rejected.activeTab, "results");
assert.equal(rejected.resultsYear, 2026);
assert.equal(rejected.resultsMonthIndex, 5);
assert.equal(rejected.resultsDivisionTag, "ipbl-66-m-pro-a");
assert.equal(rejected.jumpDate, "2026-06-01");

const alternateTab = resolveInitialRouteState({
  search: "?tab=live",
  fallbackResults,
  defaultDivisionTag: "ipbl-66-m-pro-a",
  allowedDivisionTags: allowed,
});
assert.equal(alternateTab.activeTab, "live");
assert.equal(alternateTab.jumpDate, "2026-06-01");

console.log("Initial URL route hydration tests passed");
