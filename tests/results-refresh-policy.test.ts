import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const calendar = readFileSync(new URL("../src/results/calendar.ts", import.meta.url), "utf8");
assert.match(app, /setInterval\(\(\) => void loadResults\(\{ silent: true, force: true \}\), 60_000\)/);
assert.match(app, /metadata=\{resultsMetadata\}/);
assert.match(calendar, /meta=1/);
assert.match(calendar, /force=false/);
assert.match(calendar, /if\(!force&&hit/);
assert.doesNotMatch(app, /setInterval\(\(\) => void loadResults\(\), 25_000\)/);
console.log("Phase A Results refresh policy tests passed");
