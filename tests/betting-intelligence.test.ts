import assert from "node:assert/strict";
import fs from "node:fs";
import { buildBettingIntelligenceEntries } from "../lib/server/betting-intelligence.ts";
import type { GameReplay } from "../lib/server/replay-engine.ts";

const bets = JSON.parse(fs.readFileSync("public/bet_history_clean.json", "utf8")) as Array<Record<string, unknown>>;
const memoryIndex = JSON.parse(fs.readFileSync("public/betting_memory_index.json", "utf8")) as Record<string, unknown>;

const bet = bets.find((row) => row.slip_id === 79646367087);
assert.ok(bet, "expected a known win bet fixture");

const gameId = Number(bet.raw_main_game_id);
const replay: GameReplay = {
  gameId,
  gameKey: `${gameId}`,
  timeline: [
    { kind: "quarter", capturedAt: "2026-03-30T17:07:00.000Z", quarter: 1, gameId, scoreText: "14 : 12" },
    { kind: "odds", capturedAt: "2026-03-30T17:08:00.000Z", quarter: 1, gameId, line: 41.5, overOdds: 1.62, underOdds: 1.88 },
  ],
};

const entries = buildBettingIntelligenceEntries([bet], new Map([[gameId, replay]]), memoryIndex);

assert.equal(entries.length, 1);
assert.equal(entries[0]?.betId, 79646367087);
assert.equal(entries[0]?.gameId, gameId);
assert.equal(entries[0]?.quarter, "Q1");
assert.equal(entries[0]?.odds, 1.65);
assert.equal(entries[0]?.result, "Win");
assert.equal(entries[0]?.profitLoss, 110500);
assert.equal(entries[0]?.contextSnapshot.kind, "quarter");
assert.equal(entries[0]?.contextSnapshot.capturedAt, "2026-03-30T17:07:00.000Z");

const statusCases = [
  { bet_status: "Loss", expected: -1000 },
  { bet_status: "Pending", expected: 0 },
  { bet_status: "Void", expected: 0 },
  { bet_status: "Unknown", expected: 0 },
  { bet_status: "Win", expected: 650 },
];
for (const [index, row] of statusCases.entries()) {
  const entry = buildBettingIntelligenceEntries(
    [{ ...bet, slip_id: index+1, bet_status: row.bet_status, stake: 1000, odds: 1.65, actual_payout: row.bet_status === "Win" ? "" : 0 }],
    new Map([[gameId, replay]]),
  )[0];
  assert.equal(entry.profitLoss, row.expected, "settlement handling for " + row.bet_status);
}
console.log("Betting intelligence tests passed");
