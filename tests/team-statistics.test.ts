import assert from "node:assert/strict";
import type { TeamHistoryGame } from "../src/api/types.ts";
import {
  buildTeamProfile,
  parseQuarterTotals,
  sortTeamGamesNewest,
  teamHistoryToScheduleGame,
} from "../src/teams/statistics.ts";

const team1 = { teamId: 1, shortName: "Alpha", name: "Alpha" };
const team2 = { teamId: 2, shortName: "Beta", name: "Beta" };
const game = (gameId: number, date: string, time: string, score: string, fullScore: string): TeamHistoryGame => ({
  gameId,
  scheduledTime: "",
  localDate: date,
  localTime: time,
  status: "ResultConfirmed",
  scoreText: score,
  fullScore,
  team1,
  team2,
  tag: "ipbl-66-m-pro-a",
});

const games = [
  game(1, "30.04.2026", "17:30", "80:70", "20:20,18:16,22:17,20:17"),
  game(2, "29.05.2026", "12:30", "90:95", "20:20,25:22,20:28,25:25"),
  game(3, "01.06.2026", "08:00", "100:90", "20:20,30:20,25:25,25:25"),
];

assert.deepEqual(sortTeamGamesNewest(games).map((row) => row.gameId), [3, 2, 1]);
assert.deepEqual(parseQuarterTotals(games[0].fullScore), [40, 34, 39, 37]);

const profile = buildTeamProfile(games, 1, "all");
assert.equal(profile.games.length, 3);
assert.equal(profile.wins, 2);
assert.equal(profile.losses, 1);
assert.equal(profile.averageFinalTotal, 175);
assert.deepEqual(profile.quarterAverages.map((value) => Number(value?.toFixed(2))), [40, 43.67, 45.67, 45.67]);
assert.equal(profile.transitions[0].samples, 3);
assert.equal(profile.transitions[0].increases, 2);
assert.equal(Number(profile.transitions[0].rate?.toFixed(4)), 0.6667);

const schedule = teamHistoryToScheduleGame(games[2]);
assert.equal(schedule.gameId, 3);
assert.equal(schedule.score1, 100);
assert.equal(schedule.score2, 90);
assert.equal(schedule.divisionLabel, "Pro Men A");
assert.equal(schedule.displayTimeZone, "Asia/Yangon");
console.log("Team statistics tests passed");
