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

  globalThis.fetch = async () => new Response(JSON.stringify({ data: { items: [{
    league: { tag: "ipbl-66-m-pro-x" },
    game: { id: 991, gameStatus: "ResultConfirmed", score1: 80, score2: 78, localDate: "21.11.2026", localTime: "09:55" },
    team1: { teamId: 76042, name: "Omsk" }, team2: { teamId: 76045, name: "Vorkuta" },
  }] } }), { status: 200, headers: { "Content-Type": "application/json" } });
  await assert.rejects(
    fetchOfficialCalendarEvidenceForDay("ipbl-66-m-pro-a", "2026-11-21", { timeoutMs: 1000 }),
    /division_mismatch/,
    "source Men X games must never be stamped into requested Men A",
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
