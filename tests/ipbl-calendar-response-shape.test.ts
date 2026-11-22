import assert from "node:assert/strict";
import { fetchOfficialCalendarEvidenceForDay } from "../lib/server/ingest-results-month.ts";

const originalFetch = globalThis.fetch;
try {
  globalThis.fetch = async () => new Response(JSON.stringify({ error: "upstream failure" }), {
    status: 200, headers: { "Content-Type": "application/json" },
  });
  await assert.rejects(
    fetchOfficialCalendarEvidenceForDay("ipbl-66-m-pro-a", "2026-11-21", { timeoutMs: 1000 }),
    /invalid_calendar_response/,
    "a successful HTTP status with an invalid payload must not be treated as an empty official day",
  );

  globalThis.fetch = async () => new Response(JSON.stringify({ data: { items: [] } }), {
    status: 200, headers: { "Content-Type": "application/json" },
  });
  const empty = await fetchOfficialCalendarEvidenceForDay("ipbl-66-m-pro-a", "2026-11-21", { timeoutMs: 1000 });
  assert.deepEqual(empty.rows, [], "an explicitly empty items array is distinguishable from malformed JSON");
} finally {
  globalThis.fetch = originalFetch;
}
console.log("Calendar response validation tests passed");
