import assert from "node:assert/strict";
import { planTeamHistoryResponse, sanitizeTeamHistorySourceError } from "../lib/server/team-history-response.ts";
import type { StoredTeamHistoryItem } from "../lib/server/team-history-from-results.ts";

const emptyCoverage = { checkedAt: "2026-07-31T00:00:00.000Z" };

const unavailable = planTeamHistoryResponse({
  mergedItems: [],
  range: "all",
  successfulSources: [],
  failedSources: ["supabase", "official-calendar", "results-kv"],
  sourceParts: [],
  coverage: emptyCoverage,
});
assert.equal(unavailable.status, 503);
assert.equal(unavailable.availability, "unavailable");
assert.equal(unavailable.body.error, "team_history_unavailable");
assert.equal(sanitizeTeamHistorySourceError(new Error("ERR max requests limit exceeded")), "quota_exceeded");
assert.equal(
  sanitizeTeamHistorySourceError(new Error("Could not find the table 'public.team_history_games' in the schema cache")),
  "schema_not_ready",
);
assert.equal(sanitizeTeamHistorySourceError(new Error("postgres://user:secret@example.test/db")), "source_error");

const verifiedEmpty = planTeamHistoryResponse({
  mergedItems: [],
  range: "all",
  successfulSources: ["official-calendar"],
  failedSources: [],
  sourceParts: [],
  coverage: emptyCoverage,
});
assert.equal(verifiedEmpty.status, 200);
assert.equal(verifiedEmpty.availability, "available");
assert.equal(verifiedEmpty.source, "verified-empty");
assert.equal(verifiedEmpty.body.emptyReason, "no_verified_history");
const sample: StoredTeamHistoryItem = {
  game: {
    id: 1,
    scheduledTime: "2026-07-31T11:00:00+05:00",
    localDate: "31.07.2026",
    localTime: "11:00",
    gameStatus: "ResultConfirmed",
    score: "85 : 87",
    fullScore: "19:20,20:19,29:24,17:24",
    quarterTotals: "Q1 39 · Q2 39 · Q3 53 · Q4 41",
  },
  team1: { teamId: 76013, shortName: "Yaroslavl", name: "Yaroslavl" },
  team2: { teamId: 76015, shortName: "Tomsk", name: "Tomsk" },
};

const partial = planTeamHistoryResponse({
  mergedItems: [sample, { ...sample, game: { ...sample.game, id: 2 } }],
  range: 5,
  successfulSources: ["official-calendar"],
  failedSources: ["supabase", "results-kv"],
  sourceParts: ["official-calendar"],
  coverage: emptyCoverage,
});
assert.equal(partial.status, 200);
assert.equal(partial.availability, "partial");
assert.equal((partial.body.data as { items: unknown[] }).items.length, 2);
assert.equal(partial.source, "official-calendar");

console.log("Team history availability and false-empty protection tests passed");
