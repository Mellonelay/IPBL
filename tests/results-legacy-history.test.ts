import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseStoredResultsMonth } from "../lib/server/results-hardening.ts";

for (const tag of ["ipbl-66-m-pro-a", "ipbl-66-w-pro-a"]) {
  const fixtureUrl = new URL(`./fixtures/results/2026-03-${tag}-legacy.json`, import.meta.url);
  const raw = JSON.parse(readFileSync(fixtureUrl, "utf8"));
  const originalGame = Object.values(raw)[0][0].games[0].game;
  for (const field of ["scheduledTime", "sourceLocalDate", "sourceLocalTime", "sourceTimeZone", "updatedAt"]) {
    assert.equal(Object.prototype.hasOwnProperty.call(originalGame, field), false, `${tag} must preserve the legacy omission for ${field}`);
  }

  const parsed = parseStoredResultsMonth(raw);
  assert.ok(parsed, `${tag} legacy March fixture must parse`);
  const game = Object.values(parsed)[0][0].games[0].game;
  assert.equal(game.sourceLocalDate, game.localDate);
  assert.equal(game.sourceLocalTime, game.localTime);
  assert.equal(game.sourceTimeZone, "UTC+05:00");
  assert.equal(game.updatedAt, null);
  assert.match(game.scheduledTime ?? "", /^2026-03-\d{2}T\d{2}:\d{2}:00\+05:00$/);
  assert.equal(Object.prototype.hasOwnProperty.call(originalGame, "scheduledTime"), false, "parser must not mutate the fixture");
}

const malformed = {
  "2026-03-01": [{
    date: "2026-03-01",
    division: "Pro Women A",
    divisionTag: "ipbl-66-w-pro-a",
    games: [{
      game: {
        gameId: 1,
        tag: "ipbl-66-w-pro-a",
        status: "ResultConfirmed",
        statusDisplay: "Finished",
        upstreamStatusId: null,
        score1: 1,
        score2: 2,
        scoreText: "1 : 2",
        fullScore: null,
        localDate: "not-a-date",
        localTime: "not-a-time",
        divisionLabel: "Pro Women A",
        period: null,
        timeToGo: null,
        isLive: false,
        team1: { teamId: 1, shortName: "A", name: "A" },
        team2: { teamId: 2, shortName: "B", name: "B" },
      },
      time: "not-a-time",
      teams: "A vs B",
      score: "1 : 2",
      division: "Pro Women A",
      divisionTag: "ipbl-66-w-pro-a",
      quarterTotals: null,
    }],
  }],
};
const malformedParsed = parseStoredResultsMonth(malformed);
assert.ok(malformedParsed, "invalid legacy local date/time may remain displayable without inventing an instant");
const malformedGame = malformedParsed["2026-03-01"][0].games[0].game;
assert.equal(malformedGame.scheduledTime, null);
assert.equal(malformedGame.sourceLocalDate, "not-a-date");
assert.equal(malformedGame.sourceLocalTime, "not-a-time");

for (const [localDate, localTime] of [
  ["31.02.2026", "13:00"],
  ["2026-04-31", "13:00"],
  ["29.02.2026", "13:00"],
  ["01.03.2026", "24:00"],
  ["01.03.2026", "12:60"],
] as const) {
  const impossible = structuredClone(malformed);
  const impossibleGame = impossible["2026-03-01"][0].games[0].game;
  impossibleGame.localDate = localDate;
  impossibleGame.localTime = localTime;
  const parsed = parseStoredResultsMonth(impossible);
  assert.ok(parsed, `legacy row remains displayable for ${localDate} ${localTime}`);
  assert.equal(
    parsed["2026-03-01"][0].games[0].game.scheduledTime,
    null,
    `must not fabricate an instant for ${localDate} ${localTime}`
  );
}

const leapYear = structuredClone(malformed);
leapYear["2026-03-01"][0].games[0].game.localDate = "29.02.2024";
leapYear["2026-03-01"][0].games[0].game.localTime = "7:05";
const leapYearParsed = parseStoredResultsMonth(leapYear);
assert.ok(leapYearParsed);
assert.equal(leapYearParsed["2026-03-01"][0].games[0].game.scheduledTime, "2024-02-29T07:05:00+05:00");

console.log("Phase A legacy historical Results fixtures passed");
