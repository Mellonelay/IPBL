import assert from "node:assert/strict";
import { ACTIVE_TEAMS, TEAM_STATISTICS_DIVISIONS, teamsForDivision } from "../src/config/teams.ts";
import { LIVE_DIVISION_TAGS } from "../src/config/divisions.ts";

assert.equal(TEAM_STATISTICS_DIVISIONS.length, 11);
assert.deepEqual(TEAM_STATISTICS_DIVISIONS.map((division) => division.tag), [...LIVE_DIVISION_TAGS]);
assert.equal(ACTIVE_TEAMS.length, 44);
assert.equal(new Set(ACTIVE_TEAMS.map((team) => team.teamId)).size, 44);
for (const division of TEAM_STATISTICS_DIVISIONS) {
  assert.equal(teamsForDivision(division.tag).length, 4, `${division.tag} must expose four verified teams`);
}
assert.equal(teamsForDivision("ipbl-66-w-pro-g").length, 4);
console.log("Team registry tests passed");
