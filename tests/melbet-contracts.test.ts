import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { parseGetGameZip, parseHistoryGraphExt, parseSportsShortZip, parseSubscriptionOptions } from "../lib/server/melbet-contracts.ts";
const fixture = async (name:string) => JSON.parse(await readFile(new URL(`./fixtures/phase-c/${name}`, import.meta.url),"utf8"));
for (const name of ["men-short.json","women-short.json"]) {
  const leagues=parseSportsShortZip(await fixture(name)); assert.ok(leagues.length>=1); assert.ok(leagues.every(x=>[2496666,2496667].includes(x.league.sourceLeagueId)));
  assert.ok(leagues.some(x=>x.games.length>0));
}
for (const name of ["men-728683234-game.json","women-728682586-game.json"]) {
  const game=parseGetGameZip(await fixture(name)); assert.ok(game); assert.ok(game!.gameId>0); assert.ok(game!.league.sourceLeagueId===2496666||game!.league.sourceLeagueId===2496667);
  assert.ok(game!.quarterScores.length>=4); assert.ok(game!.statistics.length>=1);
}
for (const name of ["men-728683234-subscription.json","women-728682586-subscription.json"]) {
  const parsed=parseSubscriptionOptions(await fixture(name)); assert.equal(parsed.sport,3); assert.ok(parsed.options.length>=1);
}
await assert.rejects(async()=>parseHistoryGraphExt(await fixture("men-728683234-history.json")),/history_graph_contract_unverified/);
console.log("Phase C Melbet contract fixture tests passed");
