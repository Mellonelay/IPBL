import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const liveRoute = readFileSync("lib/server/live-feed-status.ts", "utf8");
const sourceHealth = readFileSync("lib/server/source-health.ts", "utf8");

assert.ok(liveRoute.includes('input.bookmakerSettled && input.bookmakerSettled.ok && input.bookmakerSettled.fallback.sourceFailures.length === 0'));
assert.ok(liveRoute.includes('"IDLE"'));
assert.ok(liveRoute.includes('"FAIL"'));
assert.match(sourceHealth, /reportedStatus === "FAIL"/);

console.log("Live source idle semantics tests passed");
