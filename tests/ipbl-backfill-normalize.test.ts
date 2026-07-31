import assert from "node:assert/strict";
import type { ScheduleGame } from "../lib/server/calendar-normalize.ts";
import {
  buildBackfillSegmentCommit,
  payloadSha256,
  stableStringify,
} from "../lib/server/ipbl-backfill-normalize.ts";

function game(overrides: Partial<ScheduleGame> = {}): ScheduleGame {
  return {
    gameId: 1001,
    tag: "ipbl-66-w-pro-b",
    status: "ResultConfirmed",
    statusDisplay: "Finished",
    upstreamStatusId: "ResultConfirmed",
    score1: 80,
    score2: 70,
    scoreText: "80 : 70",
    fullScore: "20:18,20:17,20:18,20:17",
    localDate: "31.07.2026",
    localTime: "21:30",
    divisionLabel: "Pro Women B",
    period: null,
    timeToGo: null,
    timeIsGo: null,
    isLive: false,
    updatedAt: 1_785_500_000,
    scheduledTime: "2026-07-31T21:30:00+05:00",
    sourceLocalDate: "31.07.2026",
    sourceLocalTime: "21:30",
    sourceTimeZone: "UTC+05:00",
    displayTimeZone: "Asia/Yangon",
    team1: { teamId: 76013, shortName: "Yaroslavl", name: "Yaroslavl" },
    team2: { teamId: 76015, shortName: "Tomsk", name: "Tomsk" },
    ...overrides,
  };
}

const complete = game();
const live = game({ gameId: 1002, status: "Online", statusDisplay: "Live", isLive: true });
const conflict = game({
  gameId: 1003,
  score1: 90,
  score2: 70,
  scoreText: "90 : 70",
  fullScore: "20:18,20:17,20:18,20:17",
});

const evidence = {
  divisionTag: "ipbl-66-w-pro-b",
  isoDate: "2026-07-31",
  fetchedAt: "2026-07-31T16:00:00.000Z",
  sourcePath: "https://worker.example/ipbl-proxy/calendar?tag=ipbl-66-w-pro-b",
  rows: [
    { raw: { game: { id: 1001 }, marker: "complete" }, game: complete },
    { raw: { game: { id: 1002 }, marker: "live" }, game: live },
    { raw: { game: { id: 1003 }, marker: "conflict" }, game: conflict },
  ],
};

const payload = buildBackfillSegmentCommit(evidence);
assert.equal(payload.observations.length, 3);
assert.deepEqual(
  payload.observations.map((row: any) => row.acceptance_state),
  ["accepted", "rejected", "quarantined"]
);
assert.deepEqual(
  payload.observations.map((row: any) => row.rejection_code),
  [null, "non_finished_status", "period_total_conflict"]
);

assert.equal(payload.games.length, 2);
assert.equal((payload.games[0] as any).official_game_id, 1001);
assert.equal((payload.games[1] as any).official_game_id, 1003);
assert.equal((payload.games[1] as any).full_score, null, "conflicting period evidence must be removed from canonical game");
assert.equal(payload.periods.length, 4, "only reconciled quarter rows should be written");
assert.equal((payload.periods[0] as any).period_type, "quarter");
assert.equal((payload.periods[0] as any).evidence_complete, true);

assert.equal(
  stableStringify({ b: 2, a: { d: 4, c: 3 } }),
  stableStringify({ a: { c: 3, d: 4 }, b: 2 })
);
assert.equal(
  payloadSha256({ b: 2, a: 1 }),
  payloadSha256({ a: 1, b: 2 }),
  "evidence hashes must be independent of object key order"
);
assert.deepEqual(
  buildBackfillSegmentCommit(evidence).observations.map((row: any) => row.payload_sha256),
  payload.observations.map((row: any) => row.payload_sha256),
  "reruns must produce identical evidence hashes"
);

console.log("IPBL Supabase backfill normalization tests passed");
