import { mkdir, writeFile } from "node:fs/promises";
import { parseGetGameZip, parseSportsShortZip, type LiveGameSnapshot } from "../lib/server/melbet-contracts.ts";

const BASE = process.env.MELBET_BASE_URL?.replace(/\/$/, "") || "https://melbet-319960.top";
const LEAGUES = [2496666, 2496667] as const;
const iterations = Math.max(1, Math.min(10, Number(process.env.PHASE_C_DRY_RUN_ITERATIONS || 3)));
const intervalMs = Math.max(1000, Math.min(60000, Number(process.env.PHASE_C_DRY_RUN_INTERVAL_MS || 5000)));
const outputDir = process.env.PHASE_C_DRY_RUN_OUTPUT || `/root/runtime-audits/ipbl-phase-c-dry-run-${new Date().toISOString().replace(/[-:.]/g, "").replace("Z", "Z")}`;
const headers = { Accept: "application/json", "User-Agent": "IPBL-Minimal-Viewer/1.0" };

async function json(url: string): Promise<unknown> {
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(25_000) });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response.json();
}
function shortUrl(leagueId: number): string {
  const q = new URLSearchParams({ sports:"3", champs:String(leagueId), lng:"en", gr:"2220", country:"169", partner:"8", virtualSports:"true", groupChamps:"true" });
  return `${BASE}/service-api/LiveFeed/GetSportsShortZip?${q}`;
}
function gameUrl(gameId: number): string {
  const q = new URLSearchParams({ id:String(gameId), lng:"en", isSubGames:"true", GroupEvents:"true", countevents:"250", grMode:"4", partner:"8", topGroups:"", country:"169", marketType:"1", isNewBuilder:"true" });
  return `${BASE}/service-api/LiveFeed/GetGameZip?${q}`;
}

type Row = { capturedAt:string; iteration:number; game:LiveGameSnapshot; transition:{scoreDelta1:number|null;scoreDelta2:number|null;periodChanged:boolean|null;elapsedDelta:number|null} };
const previous = new Map<number,LiveGameSnapshot>(); const rows:Row[]=[]; const health:unknown[]=[];
await mkdir(outputDir,{recursive:true});
for (let iteration=1; iteration<=iterations; iteration++) {
  const started=Date.now(); const payloads=await Promise.all(LEAGUES.map(shortUrl).map(json));
  const leagues=payloads.flatMap((p)=>parseSportsShortZip(p));
  const discovered=[...new Map(leagues.flatMap((l)=>l.games).map((g)=>[g.gameId,g])).values()];
  const details=await Promise.all(discovered.map(async(g)=>parseGetGameZip(await json(gameUrl(g.gameId)))));
  let accepted=0;
  for (const game of details) {
    if (!game) continue; accepted++; const old=previous.get(game.gameId);
    rows.push({capturedAt:new Date().toISOString(),iteration,game,transition:{
      scoreDelta1:old?.score1!=null&&game.score1!=null?game.score1-old.score1:null,
      scoreDelta2:old?.score2!=null&&game.score2!=null?game.score2-old.score2:null,
      periodChanged:old?.period!=null&&game.period!=null?old.period!==game.period:null,
      elapsedDelta:old?.elapsedSeconds!=null&&game.elapsedSeconds!=null?game.elapsedSeconds-old.elapsedSeconds:null,
    }}); previous.set(game.gameId,game);
  }
  health.push({iteration,capturedAt:new Date().toISOString(),leagueCount:leagues.length,discoveredGames:discovered.length,acceptedDetails:accepted,latencyMs:Date.now()-started});
  if (iteration<iterations) await new Promise((r)=>setTimeout(r,intervalMs));
}
await writeFile(`${outputDir}/timeline.jsonl`,rows.map((x)=>JSON.stringify(x)).join("\n")+"\n");
await writeFile(`${outputDir}/health.json`,JSON.stringify({base:BASE,iterations,intervalMs,productionWrites:false,health},null,2)+"\n");
console.log(JSON.stringify({outputDir,iterations,intervalMs,rows:rows.length,games:[...previous.keys()],productionWrites:false,health},null,2));
