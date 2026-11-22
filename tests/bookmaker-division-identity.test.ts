import assert from "node:assert/strict";
import { parseBookmakerLivePayload } from "../lib/server/bookmaker-live.ts";

function event(id: number, home: string, away: string) {
  return {
    I: id, LI: 2496666, L: "IPBL. Pro Division",
    O1: home, O2: away, S: 1795260000, U: 1795260060,
    SC: { FS: { S1: 51, S2: 44 }, CP: 3, TS: 1500, TR: -1 },
  };
}

const input = { Success: true, Value: [
  event(990001, "Omsk", "Vorkuta"),
  event(990002, "Syktyvkar", "Ukhta"),
  event(990003, "Samara", "Krasnodar"),
]};
const result = parseBookmakerLivePayload(input);
assert.equal(result.games.length, 1, "only approved, source-consistent identities should be promoted");
assert.equal(result.games[0].tag, "ipbl-66-m-pro-b");
assert.equal(result.unmatched.length, 2, "historical Men A names now active in official Men X must not be assigned Men A by bookmaker name alone");
for (const unmatched of result.unmatched) {
  assert.equal(unmatched.reason, "unverified-team");
}
assert.equal(result.games.some(g => g.tag === "ipbl-66-m-pro-a"), false);
console.log("Bookmaker division identity tests passed");
