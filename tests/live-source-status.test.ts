import assert from "node:assert/strict";
import { summarizeBookmakerFailures } from "../src/live/source-status.ts";

assert.equal(summarizeBookmakerFailures([]), null);
assert.equal(
  summarizeBookmakerFailures([{ kind: "zero_approved_games", source: "melbet", leagueId: 2496666 }]),
  "Bookmaker live rows were found, but none matched the approved team registry."
);
assert.equal(
  summarizeBookmakerFailures([{ kind: "parse_failed", source: "melbet", leagueId: 2496666 }]),
  "Bookmaker live pages changed shape before any games could be parsed."
);
assert.equal(
  summarizeBookmakerFailures([{ kind: "fetch_failed", source: "melbet", leagueId: 2496666 }]),
  "Bookmaker live pages could not be fetched in the current runtime."
);

console.log("Live source status label tests passed");
