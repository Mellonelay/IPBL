import assert from "node:assert/strict";
import { currentMyanmarResultsSelection } from "../src/results/month-default.ts";

assert.deepEqual(
  currentMyanmarResultsSelection(new Date("2026-07-05T00:00:00Z")),
  { year: 2026, monthIndex: 6 },
  "results page must default to the current Myanmar month"
);

assert.deepEqual(
  currentMyanmarResultsSelection(new Date("2026-03-01T00:00:00Z")),
  { year: 2026, monthIndex: 2 },
  "helper must still report the active March start month when that is the current month"
);

console.log("Results month default helper tests passed");
