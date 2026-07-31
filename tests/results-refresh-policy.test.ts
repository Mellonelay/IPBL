import assert from "node:assert/strict";
import {
  RESULTS_REFRESH_INTERVAL_MS,
  RESULTS_SESSION_CACHE_TTL_MS,
  clearResultsCalendarCache,
  fetchResultsMonthPayloadFromApi,
  resultsApiErrorMessage,
  shouldFetchPreviousResultsMonth,
} from "../src/results/calendar.ts";

assert.equal(RESULTS_REFRESH_INTERVAL_MS, 15 * 60_000);
assert.equal(RESULTS_SESSION_CACHE_TTL_MS, 15 * 60_000);
assert.equal(
  resultsApiErrorMessage("results_storage_quota_exceeded", "HTTP 503"),
  "Results storage is temporarily unavailable. Retry after the storage quota resets.",
);
assert.equal(resultsApiErrorMessage("other_error", "HTTP 500"), "other_error");
assert.equal(shouldFetchPreviousResultsMonth(2026, 2, "ipbl-66-w-pro-d"), false);
assert.equal(shouldFetchPreviousResultsMonth(2026, 5, "ipbl-66-m-pro-a"), true);

const originalFetch = globalThis.fetch;
const calls: string[] = [];
globalThis.fetch = (async (input: string | URL | Request) => {
  const url = String(input);
  calls.push(url);
  return new Response(JSON.stringify({
    calendar: {},
    meta: {
      schemaVersion: 1,
      status: "ok",
      source: "fixture",
      checkedAt: "2026-06-12T00:00:00Z",
      updatedAt: "2026-06-12T00:00:00Z",
      verifiedThroughDate: "2026-03-31",
      year: 2026,
      month: 3,
      divisionTag: "ipbl-66-w-pro-d",
    },
  }), { status: 200, headers: { "content-type": "application/json" } });
}) as typeof fetch;

try {
  clearResultsCalendarCache();
  await fetchResultsMonthPayloadFromApi({ year: 2026, monthIndex: 2, divisionTag: "ipbl-66-w-pro-d" });
  await fetchResultsMonthPayloadFromApi({ year: 2026, monthIndex: 2, divisionTag: "ipbl-66-w-pro-d" });
  assert.equal(calls.length, 1, "fresh session cache must suppress a duplicate request");
  assert.match(calls[0], /meta=1/);
  assert.match(calls[0], /month=3/);

  await fetchResultsMonthPayloadFromApi({ year: 2026, monthIndex: 2, divisionTag: "ipbl-66-w-pro-d", force: true });
  assert.equal(calls.length, 2, "forced refresh must bypass the session cache");
  assert.equal(calls.some((url) => /month=2/.test(url)), false, "inactive previous-month division must not be fetched");
} finally {
  globalThis.fetch = originalFetch;
  clearResultsCalendarCache();
}

console.log("Phase A Results refresh and quota message policy tests passed");
