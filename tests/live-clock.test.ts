import assert from "node:assert/strict";
import { elapsedGameSeconds, formatClockSeconds, parseClockSeconds, projectLiveClock } from "../src/live/clock.ts";

assert.equal(parseClockSeconds("5.02"), 302);
assert.equal(parseClockSeconds("02:08"), 128);
assert.equal(parseClockSeconds("10.00"), 600);
assert.equal(parseClockSeconds("bad"), null);
assert.equal(formatClockSeconds(128), "02:08");
assert.equal(elapsedGameSeconds(4, 128), 2272);
assert.equal(formatClockSeconds(elapsedGameSeconds(4, 128)), "37:52");
assert.equal(formatClockSeconds(elapsedGameSeconds(5, 200)), "41:40");

const running = projectLiveClock({ period: 4, timeToGo: "02:08", timeIsGo: 1, elapsedMs: 3100 });
assert.equal(running.remainingText, "02:05");
assert.equal(running.elapsedText, "37:55");
assert.equal(running.running, true);

const paused = projectLiveClock({ period: 4, timeToGo: "02:08", timeIsGo: 0, elapsedMs: 9000 });
assert.equal(paused.remainingText, "02:08");
assert.equal(paused.elapsedText, "37:52");
assert.equal(paused.running, false);

console.log("live clock tests passed");
