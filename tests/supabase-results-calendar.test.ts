import assert from "node:assert/strict";
import { canonicalResultsMonthMap, isCanonicalResultsMonth, canonicalResultsMetadata } from "../lib/server/supabase-results.ts";
const row = {
  official_game_id: 1128469, division_tag: "ipbl-66-m-pro-b",
  scheduled_at: "2026-10-22T07:05:00Z", source_local_date: "22.10.2026", source_local_time: "12:05",
  status: "ResultConfirmed", score1: 101, score2: 85,
  full_score: "36:20,25:16,23:26,17:23", quarter_totals: "Q1 56 · Q2 41 · Q3 49 · Q4 40",
  home_source_team_id: 76049, home_short_name: "Samara", home_name: "Samara",
  away_source_team_id: 76052, away_short_name: "Tyumen", away_name: "Tyumen",
};
const tag = "ipbl-66-m-pro-b";
const map = canonicalResultsMonthMap([row,row,{...row,official_game_id:1128470,source_local_date:"01.09.2026"}],2026,10,tag);
assert.deepEqual(Object.keys(map),["2026-10-22"]);
const game = map["2026-10-22"][0].games[0].game;
assert.equal(map["2026-10-22"][0].games.length,1);
assert.equal(game.gameId,1128469);
assert.equal(game.scoreText,"101 : 85");
assert.equal(game.fullScore,row.full_score);
assert.equal(game.team1.teamId,76049);
assert.equal(canonicalResultsMetadata(2026,10,tag,map).acceptedRows,1);
assert.equal(isCanonicalResultsMonth(2026,8),false);
assert.equal(isCanonicalResultsMonth(2026,9),true);
assert.equal(isCanonicalResultsMonth(2027,1),true);
assert.deepEqual(canonicalResultsMonthMap([{...row,source_local_date:"31.02.2026"}],2026,2,tag),{});
console.log("Canonical Supabase results calendar projection passed");
