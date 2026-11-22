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


  for (const league of [undefined, {}, { tag: "" }, { tag: null }]) {
    globalThis.fetch = async () => new Response(JSON.stringify({ data: { items: [{
      ...(league === undefined ? {} : { league }),
      game: { id: 992, gameStatus: "ResultConfirmed", score1: 80, score2: 78, localDate: "21.11.2026", localTime: "09:55" },
      team1: { teamId: 76042, name: "Omsk" }, team2: { teamId: 76045, name: "Vorkuta" },
    }] } }), { status: 200, headers: { "Content-Type": "application/json" } });
    await assert.rejects(
      fetchOfficialCalendarEvidenceForDay("ipbl-66-m-pro-a", "2026-11-21", { timeoutMs: 1000 }),
      /division_identity_unresolved/,
      "untagged official games must never inherit the requested division",
    );
  }


  globalThis.fetch = async () => new Response(JSON.stringify({ data: { items: [{
    league: { id: 1413060, tag: "ipbl-66-m-pro-a" },
    game: { id: 993, gameStatus: "ResultConfirmed", score1: 80, score2: 78, localDate: "21.11.2026", localTime: "09:55" },
    team1: { teamId: 76042, name: "Omsk" }, team2: { teamId: 76045, name: "Vorkuta" },
  }] } }), { status: 200, headers: { "Content-Type": "application/json" } });
  const matched = await fetchOfficialCalendarEvidenceForDay("ipbl-66-m-pro-a", "2026-11-21", { timeoutMs: 1000 });
  assert.equal(matched.rows.length, 1, "correctly identified division rows remain ingestible");
  assert.equal(matched.rows[0].game?.tag, "ipbl-66-m-pro-a");

  globalThis.fetch = async () => new Response(JSON.stringify({ data: { items: [{
    league: { tag: "ipbl-66-m-pro-a" },
    game: { id: 995, gameStatus: "ResultConfirmed", score1: 80, score2: 78, localDate: "20.11.2026", localTime: "22:00" },
    team1: { teamId: 76038, name: "Barnaul" }, team2: { teamId: 76040, name: "Novosibirsk" },
  }] } }), { status: 200, headers: { "Content-Type": "application/json" } });
  await assert.rejects(
    fetchOfficialCalendarEvidenceForDay("ipbl-66-m-pro-a", "2026-11-21", { timeoutMs: 1000 }),
    /source_day_mismatch/,
    "a source-local game from another date must never be certified as the requested date",
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
