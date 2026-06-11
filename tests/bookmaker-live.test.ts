import assert from "node:assert/strict";
import { parseBookmakerLivePayload, remainingClock } from "../lib/server/bookmaker-live.ts";

const raw = {
  Success: true,
  Value: [
    {
      I: 728348559, LI: 2496666, L: "IPBL. Pro Division",
      O1: "Samara", O2: "Krasnodar", O1I: 4431639, O2I: 4866337,
      S: 1781168401, U: 1781170531,
      SC: {
        FS: { S1: 78, S2: 63 },
        PS: [
          { Key: 1, Value: { S1: 25, S2: 32 } },
          { Key: 2, Value: { S1: 29, S2: 13 } },
          { Key: 3, Value: { S1: 24, S2: 18 } },
        ],
        CP: 3, CPS: "3rd quarter", TS: 1601, TR: -1,
      },
    },
    {
      I: 728363780, LI: 2496666, L: "IPBL. Pro Division",
      O1: "Belgorod", O2: "Saratov", O1I: 8630740, O2I: 8630741,
      S: 1781176200, U: 1781176647,
      SC: {
        FS: { S1: 24, S2: 8 },
        PS: [{ Key: 1, Value: { S1: 24, S2: 8 } }],
        CP: 1, CPS: "1st quarter", TS: 447, TR: -1,
      },
    },
    {
      I: 1, LI: 2496666, L: "IPBL. Pro Division",
      O1: "Unverified City", O2: "Unknown City", O1I: 1, O2I: 2,
      SC: { FS: { S1: 1, S2: 2 }, CP: 1, TS: 10, TR: -1 },
    },
  ],
};

assert.equal(remainingClock(3, 1601), "03:19");
assert.equal(remainingClock(1, 0), "10:00");
assert.equal(remainingClock(4, 1800), "10:00");
const parsed = parseBookmakerLivePayload(raw);
assert.equal(parsed.receivedEvents, 3);
assert.equal(parsed.games.length, 1);
assert.equal(parsed.unmatched.length, 2);
const samara = parsed.games.find((game) => game.team1.shortName === "Samara")!;
assert.equal(samara.tag, "ipbl-66-m-pro-b");
assert.equal(samara.divisionLabel, "Pro Men B");
assert.equal(samara.team1.teamId, 76049);
assert.equal(samara.team2.teamId, 76050);
assert.equal(samara.scoreText, "78 : 63");
assert.equal(samara.fullScore, "25:32,29:13,24:18");
assert.equal(samara.timeToGo, "03:19");
const excluded = parsed.unmatched.find((event) => event.team1 === "Belgorod" && event.team2 === "Saratov");
assert.ok(excluded, "teams outside the approved division list must not render");
assert.equal(excluded.reason, "unverified-team");
assert.equal(parsed.unmatched[0].reason, "unverified-team");
console.log("Bookmaker live adapter tests passed");
