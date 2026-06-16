import assert from "node:assert/strict";
import { parseCalendarItems } from "../../src/api/normalize.ts";

const pad = (value: number) => String(value).padStart(2, "0");
const today = new Date();
const sourceDate = `${pad(today.getDate())}.${pad(today.getMonth() + 1)}.${today.getFullYear()}`;
const sourceIsoDate = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
const myanmarDisplay = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Yangon",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
}).format(new Date(`${sourceIsoDate}T23:00:00+05:00`)).replace(/\//g, ".");

const fixture = {
  data: {
    items: [{
      game: { id: 123, gameStatus: "Online", score1: 55, score2: 51, score: "55:51", localDate: sourceDate, localTime: "23:00", scheduledTime: `${sourceIsoDate}T23:00:00+05:00`, period: 3, timeToGo: "04:10" },
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
assert.equal(games[0].localDate, myanmarDisplay, "23:00 +05 must cross into next Myanmar day");
assert.equal(games[0].localTime, "00:30");
assert.equal(games[0].displayTimeZone, "Asia/Yangon");
assert.equal(games[0].timeIsGo, 1);
