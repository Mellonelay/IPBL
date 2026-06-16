import assert from "node:assert/strict";
import fs from "node:fs";

import { discoverPatterns } from "../lib/server/pattern-discovery.ts";

const bets = JSON.parse(fs.readFileSync("public/bet_history_clean.json", "utf8")) as Array<Record<string, unknown>>;
const memoryIndex = JSON.parse(fs.readFileSync("public/betting_memory_index.json", "utf8")) as Record<string, unknown>;

const patterns = discoverPatterns(bets, memoryIndex);

assert.ok(patterns.length >= 3);
assert.deepEqual(patterns.slice(0, 3).map((pattern) => pattern.patternId), [
  "quarter-Q4-positive",
  "odds-1.60-1.79-positive",
  "matchup-repeat-positive",
]);
assert.equal(patterns[0].description, "Q4 bets are the strongest quarter by net profit.");
assert.ok(patterns[0].confidence > 0 && patterns[0].confidence <= 1);
assert.ok(patterns[0].supportingGames.length > 0);
assert.match(patterns[0].ruleSignature, /^quarter:Q4:/);
assert.ok(patterns.every((pattern) => pattern.supportingGames.length > 0));

console.log("Pattern discovery tests passed");
