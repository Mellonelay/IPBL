import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const liveRoute = readFileSync("api/results/live.ts", "utf8");
const sourceHealth = readFileSync("lib/server/source-health.ts", "utf8");

assert.match(liveRoute, /fallback\.sourceFailures\.length > 0 \? "PARTIAL" : "IDLE"/);
assert.doesNotMatch(liveRoute, /games\.length > 0[\s\S]{0,180}: "FAIL"/);
assert.match(sourceHealth, /reportedStatus === "FAIL"/);

console.log("Live source idle semantics tests passed");
