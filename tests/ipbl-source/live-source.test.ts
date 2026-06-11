import assert from "node:assert/strict";
import { parseCalendarItems } from "../../src/api/normalize.ts";

const fixture = {
  data: {
    items: [{
      game: { id: 123, gameStatus: "Online", score1: 55, score2: 51, score: "55:51", localDate: "11.06.2026", localTime: "23:00", scheduledTime: "2026-06-11T23:00:00+05:00", period: 3, timeToGo: "04:10" },
      status: { id: "Online", displayName: "Онлайн" },
      period: 3, timeToGo: "04:10", timeIsGo: 1,
      team1: { teamId: 1, shortName: "Maykop", name: "Maykop" },
      team2: { teamId: 2, shortName: "Nalchik", name: "Nalchik" },
      division: "Pro Men A",
    }],
  },
};
const games = parseCalendarItems(fixture, "ipbl-66-m-pro-a");
assert.equal(games.length, 1);
assert.equal(games[0].isLive, true);
assert.equal(games[0].gameId, 123);
assert.equal(games[0].localDate, "12.06.2026", "23:00 +05 must cross into next Myanmar day");
assert.equal(games[0].localTime, "00:30");
assert.equal(games[0].displayTimeZone, "Asia/Yangon");
assert.equal(games[0].timeIsGo, 1);
