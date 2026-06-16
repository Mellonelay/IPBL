import { LIVE_DIVISION_TAGS } from "../src/config/divisions.ts";
import assert from "node:assert/strict";
import {
  buildBoxScorePayload,
  buildGameDetailPayload,
  buildTeamGamesPayload,
  filterTeamGames,
  parseQuarterPairs,
  storedGamesFromValue,
} from "../lib/server/ipbl-compat.ts";
import type { ScheduleGame } from "../lib/server/calendar-normalize.ts";
import { parseTeamHistory, computeH2H } from "../src/api/normalize.ts";

const team1 = { teamId: 76049, shortName: "Samara", name: "Samara" };
const team2 = { teamId: 76050, shortName: "Krasnodar", name: "Krasnodar" };
const game: ScheduleGame = {
  gameId: 1063017, tag: "ipbl-66-m-pro-b", status: "Result", statusDisplay: "Finished",
  upstreamStatusId: "Result", score1: 98, score2: 76, scoreText: "98 : 76",
  fullScore: "32:16,14:25,30:16,22:19", localDate: "01.05.2026", localTime: "09:00",
  divisionLabel: "Pro Men B", period: null, timeToGo: null, isLive: false,
  scheduledTime: "2026-05-01T09:00:00+05:00", team1, team2,
};
const older: ScheduleGame = { ...game, gameId: 1000000, localDate: "01.04.2026", scheduledTime: "2026-04-01T09:00:00+05:00" };
const map = { "2026-05-01": [{ date: "2026-05-01", division: "Pro Men B", divisionTag: game.tag, games: [{ game }] }] };

assert.deepEqual(parseQuarterPairs(game.fullScore), [
  { period: 1, score1: 32, score2: 16 }, { period: 2, score1: 14, score2: 25 },
  { period: 3, score1: 30, score2: 16 }, { period: 4, score1: 22, score2: 19 },
]);
assert.equal(storedGamesFromValue(JSON.stringify(map))[0]?.gameId, game.gameId);
assert.deepEqual(filterTeamGames([older, game, game], team1.teamId).map((row) => row.gameId), [game.gameId, older.gameId]);
const detail = buildGameDetailPayload(game, "stored-results") as any;
assert.equal(detail.data.result.game.fullScore, game.fullScore);
assert.equal(detail.meta.source, "stored-results");
const box = buildBoxScorePayload(game, "stored-results") as any;
assert.equal(box.data.status, "Ok");
assert.equal(box.data.result.scoreByPeriods[0].score1, 32);
const history = buildTeamGamesPayload([game], "stored-results") as any;
const noScheduledTime = {
  ...game,
  scheduledTime: undefined,
  sourceLocalDate: "01.05.2026",
  sourceLocalTime: "09:00",
};
const synthesizedHistory = buildTeamGamesPayload([noScheduledTime], "stored-results") as any;
assert.equal(history.data.items[0].game.id, game.gameId);
assert.equal(history.data.items[0].game.scheduledTime, "2026-05-01T09:00:00+05:00");
assert.equal(history.data.items[0].game.tag, game.tag);
assert.equal(synthesizedHistory.data.items[0].game.scheduledTime, "2026-05-01T09:00:00+05:00");
assert.equal(history.data.items[0].team1.teamId, team1.teamId);
const parsedA = parseTeamHistory(history, game.tag);
const parsedB = parseTeamHistory(history, game.tag);
const computed = computeH2H(parsedA, parsedB, team1.teamId, team2.teamId, 15);
assert.equal(computed.length, 1);
assert.equal(computed[0]?.gameId, game.gameId);
assert.equal(computed[0]?.fullScore, game.fullScore);
console.log("IPBL compatibility fallback tests passed");
