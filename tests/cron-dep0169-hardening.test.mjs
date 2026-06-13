import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const cron = readFileSync("api/cron/record-live.ts", "utf8");
const live = readFileSync("api/results/live.ts", "utf8");
const teamHistory = readFileSync("api/teams/history.ts", "utf8");
const recorder = readFileSync("api/recorder.ts", "utf8");

assert.match(cron, /buildLiveFeedEnvelope/);
assert.doesNotMatch(cron, /\/api\/results\/live\?recorder/);
assert.doesNotMatch(cron, /fetch\(liveUrl/);
assert.match(live, /export async function buildLiveFeedEnvelope/);
assert.match(teamHistory, /new URL\(req\.url/);
assert.doesNotMatch(teamHistory, /req\.query/);
assert.match(recorder, /new URL\(req\.url/);
assert.doesNotMatch(recorder, /req\.query/);

console.log("Cron recorder and DEP0169 hardening tests passed");
