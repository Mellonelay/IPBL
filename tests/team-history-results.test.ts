import assert from "node:assert/strict";
import type { StoredResultsMonthMap } from "../lib/server/ingest-results-month.ts";
import {
  parseStoredResultsMonth,
  teamHistoryItemsFromMonths,
} from "../lib/server/team-history-from-results.ts";

const team1 = { teamId: 10, shortName: "Alpha", name: "Alpha" };
const team2 = { teamId: 20, shortName: "Beta", name: "Beta" };
const game = (gameId: number, date: string, scheduledTime: string) => ({
  game: {
    gameId,
    tag: "ipbl-66-m-pro-a",
    status: "ResultConfirmed",
    statusDisplay: "Finished",
    upstreamStatusId: "ResultConfirmed",
    score1: 90,
    score2: 80,
    scoreText: "90 : 80",
    fullScore: "20:20,25:20,20:20,25:20",
    localDate: date,
    localTime: "10:00",
    divisionLabel: "Pro Men A",
    period: null,
    timeToGo: null,
    isLive: false,
    scheduledTime,
    sourceLocalDate: date,
    sourceLocalTime: "08:30",
    sourceTimeZone: "UTC+05:00",
    displayTimeZone: "Asia/Yangon",
    team1,
    team2,
  },
  time: "10:00",
  teams: "Alpha vs Beta",
  score: "90 : 80",
  division: "Pro Men A",
  divisionTag: "ipbl-66-m-pro-a",
  quarterTotals: "Q1 40 · Q2 45 · Q3 40 · Q4 45",
});
const month: StoredResultsMonthMap = {
  "2026-05-01": [{ date: "2026-05-01", division: "Pro Men A", divisionTag: "ipbl-66-m-pro-a", games: [game(1, "01.05.2026", "2026-05-01T08:30:00+05:00")] }],
  "2026-05-02": [{ date: "2026-05-02", division: "Pro Men A", divisionTag: "ipbl-66-m-pro-a", games: [game(2, "02.05.2026", "2026-05-02T08:30:00+05:00")] }],
};
assert.deepEqual(parseStoredResultsMonth(JSON.stringify(month)), month);
assert.equal(parseStoredResultsMonth("not json"), null);
const rows = teamHistoryItemsFromMonths([month, month], 10, "ipbl-66-m-pro-a");
assert.deepEqual(rows.map((row) => row.game.id), [2, 1]);
assert.equal(rows.length, 2, "duplicate months must dedupe by gameId");
assert.equal(rows[0].game.localTime, "08:30");
assert.equal(rows[0].game.score, "90 : 80");
assert.equal(rows[0].game.quarterTotals, "Q1 40 · Q2 45 · Q3 40 · Q4 45");
assert.equal(teamHistoryItemsFromMonths([month], 999, "ipbl-66-m-pro-a").length, 0);
console.log("Results-backed team history tests passed");
