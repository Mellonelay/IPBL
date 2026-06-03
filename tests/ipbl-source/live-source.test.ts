import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseIpbl1xLivePayload } from "../../src/results/live-source.ts";

const fixturePath = new URL("../../ipbl-hunt-live-fixture.json", import.meta.url);
let fixture: unknown;
try {
  fixture = JSON.parse(readFileSync(fixturePath, "utf8"));
} catch {
  fixture = {
    Success: true,
    Value: [
      {
        G: [
          {
            I: 123,
            O1: "Maykop",
            O2: "Nalchik",
            SC: { FS: { S1: 55, S2: 51 }, P1: { S1: 20, S2: 18 } },
            LI: 2496666,
          },
        ],
      },
    ],
  };
}

const games = parseIpbl1xLivePayload(fixture);
assert.ok(games.length >= 1, "1xlite live fixture must produce at least one game");
const first = games[0];
assert.ok(first.gameId, "game id required");
assert.ok(first.homeTeam, "home team required");
assert.ok(first.awayTeam, "away team required");
assert.notEqual(first.homeTeam, first.awayTeam, "teams must differ");
assert.equal(first.status, "live");
assert.ok(first.rawPath.startsWith("root"));
assert.throws(() => parseIpbl1xLivePayload({ Success: false, Value: null }), /Success=true/);
