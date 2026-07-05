import assert from "node:assert/strict";
import { ACTIVE_TEAMS, TEAM_STATISTICS_DIVISIONS, teamsForDivision } from "../src/config/teams.ts";
import { LIVE_DIVISION_TAGS } from "../src/config/divisions.ts";

assert.equal(TEAM_STATISTICS_DIVISIONS.length, 14);
assert.deepEqual(TEAM_STATISTICS_DIVISIONS.map((division) => division.tag), [
  "ipbl-66-m-pro-a",
  "ipbl-66-m-pro-b",
  "ipbl-66-m-pro-c",
  "ipbl-66-m-pro-d",
  "ipbl-66-m-pro-g",
  "ipbl-66-m-pro-u",
  "ipbl-66-m-pro-z",
  "ipbl-66-m-pro-l",
  "ipbl-66-w-pro-a",
  "ipbl-66-w-pro-b",
  "ipbl-66-w-pro-c",
  "ipbl-66-w-pro-d",
  "ipbl-66-w-pro-g",
  "ipbl-66-w-pro-k",
]);
assert.equal(ACTIVE_TEAMS.length, 54);
assert.equal(new Set(ACTIVE_TEAMS.map((team) => team.teamId)).size, 54);
for (const division of TEAM_STATISTICS_DIVISIONS) {
  const expected = division.tag === "ipbl-66-m-pro-z" ? 2 : 4;
  assert.equal(teamsForDivision(division.tag).length, expected, `${division.tag} must expose its verified team count`);
}
assert.deepEqual(teamsForDivision("ipbl-66-m-pro-g").map((team) => team.name), ["Astrakhan", "Gelendzhik", "Kachkanar", "Tver"]);
assert.equal(teamsForDivision("ipbl-66-w-pro-g").length, 4);
console.log("Team registry tests passed");
