import assert from "node:assert/strict";
import { DIVISIONS, LIVE_DIVISIONS, LIVE_DIVISION_TAGS, divisionsForResultsMonth } from "../../src/config/divisions.ts";

assert.deepEqual([...LIVE_DIVISION_TAGS], [
  "ipbl-66-m-pro-a", "ipbl-66-m-pro-b", "ipbl-66-m-pro-c", "ipbl-66-m-pro-d", "ipbl-66-m-pro-u", "ipbl-74-m-pro-h",
  "ipbl-66-w-pro-a", "ipbl-66-w-pro-b", "ipbl-66-w-pro-c", "ipbl-66-w-pro-d", "ipbl-66-w-pro-g", "ipbl-66-w-pro-k",
]);
assert.equal(LIVE_DIVISION_TAGS.includes("ipbl-66-m-pro-g" as never), false, "Men G is historical-only");
assert.equal(DIVISIONS.length, 12, "Historical + current registry must contain the 12 May divisions");

const march = divisionsForResultsMonth(2026, 2).map((d) => d.tag);
assert.equal(march.includes("ipbl-66-m-pro-g"), true);
assert.equal(march.includes("ipbl-66-m-pro-u"), false);
assert.equal(march.includes("ipbl-66-w-pro-g"), false);
assert.equal(march.includes("ipbl-66-w-pro-d"), false);
assert.equal(march.includes("ipbl-66-w-pro-k"), false);

const may = divisionsForResultsMonth(2026, 4).map((d) => d.tag);
assert.equal(may.length, 12, "May must expose both historical and post-change divisions");
assert.equal(may.includes("ipbl-66-m-pro-g"), true);
assert.equal(may.includes("ipbl-66-m-pro-u"), true);
assert.equal(may.includes("ipbl-66-w-pro-g"), true);

const june = divisionsForResultsMonth(2026, 5).map((d) => d.tag);
assert.equal(june.includes("ipbl-66-m-pro-g"), false);
assert.equal(june.includes("ipbl-66-m-pro-u"), true);

assert.equal(
  divisionsForResultsMonth(2026, 5).some((division) => division.tag === "ipbl-74-m-pro-h"),
  false,
  "live-only Pro Men H must not enter historical results months"
);
assert.equal(
  LIVE_DIVISIONS.some((division) => division.tag === "ipbl-74-m-pro-h"),
  true,
  "verified Pro Men H must be available to the live selector"
);
