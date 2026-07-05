import assert from "node:assert/strict";
import fs from "node:fs";

import { buildBettingRecordSummary } from "../lib/server/betting-record-summary.ts";

const bets = JSON.parse(fs.readFileSync("public/bet_history_clean.json", "utf8")) as Array<Record<string, unknown>>;
const summary = buildBettingRecordSummary(bets);

assert.equal(summary.source, "public/bet_history_clean.json");
assert.equal(summary.totalBets, 300);
assert.equal(summary.recentBets.length, 12);
assert.ok(summary.period.firstPlacedAt);
assert.ok(summary.period.lastPlacedAt);
assert.ok(summary.period.firstPlacedAt! <= summary.period.lastPlacedAt!);
assert.ok(summary.results.winRate > 0);
assert.ok(summary.results.netProfit !== 0);
assert.ok(summary.quarterStats.some((stat) => stat.key === "Q1"));
assert.ok(summary.quarterStats.some((stat) => stat.key === "Q4"));
assert.ok(summary.divisionStats.some((stat) => stat.key === "Men"));
assert.ok(summary.divisionStats.some((stat) => stat.key === "Women"));
assert.ok(summary.matchupStats.length > 0);
assert.equal(summary.recentWindow.size, 12);
assert.ok(summary.recentWindow.winRate >= 0);

console.log("betting record summary tests passed");
