#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';

const args = new Map();
for (let i = 2; i < process.argv.length; i += 1) {
  if (process.argv[i].startsWith('--')) args.set(process.argv[i], process.argv[i + 1]?.startsWith('--') ? true : (process.argv[i + 1] ?? true));
}
const has = (k) => process.argv.includes(k);
const arg = (k, d) => args.get(k) ?? d;
const iso = () => new Date().toISOString();
const norm = (v) => String(v ?? '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
const first = (...v) => v.find((x) => x !== undefined && x !== null && x !== '') ?? null;
const num = (v) => Number.isFinite(Number(v)) ? Number(v) : null;

function gameId(g) { return String(first(g?.gameId, g?.id, g?.Id, g?.game_id, g?.eventId, g?.event_id, g?.I, g?.GameId) ?? ''); }
function team(g, side) {
  const p = side === 'home' ? ['home','team1','t1','a'] : ['away','team2','t2','b'];
  const c = [];
  for (const x of p) {
    c.push(g?.[`${x}Name`], g?.[`${x}_name`], g?.[`${x}Team`], g?.[`${x}_team`]);
    const o = g?.[x]; if (o && typeof o === 'object') c.push(o.name, o.title, o.teamName, o.shortName);
  }
  if (side === 'home') c.push(g?.teamA, g?.teamAName, g?.TeamA, g?.O1, g?.participant1);
  else c.push(g?.teamB, g?.teamBName, g?.TeamB, g?.O2, g?.participant2);
  return first(...c);
}
function score(g, side) {
  const p = side === 'home' ? ['home','team1','t1','a'] : ['away','team2','t2','b'];
  const c = [];
  for (const x of p) c.push(g?.[`${x}Score`], g?.[`${x}_score`], g?.[`${x}Points`], g?.score?.[x], g?.scores?.[x]);
  if (side === 'home') c.push(g?.scoreA, g?.ScoreA, g?.S1, g?.FS1, g?.fullScoreHome);
  else c.push(g?.scoreB, g?.ScoreB, g?.S2, g?.FS2, g?.fullScoreAway);
  return num(first(...c));
}
function extract(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  for (const c of [payload.games,payload.data,payload.items,payload.results,payload.matches,payload.events,payload.live,payload.Value,payload.value]) {
    if (Array.isArray(c)) return c;
    if (c && typeof c === 'object') for (const n of [c.games,c.items,c.results,c.matches,c.events]) if (Array.isArray(n)) return n;
  }
  return [];
}
function row(source, g, i) {
  const id = gameId(g), homeName = team(g,'home'), awayName = team(g,'away');
  const homeNorm = norm(homeName), awayNorm = norm(awayName);
  return { source, index:i, rowKey:id || `${homeNorm} v ${awayNorm}` || `${source}:${i}`, gameId:id || null, homeName:homeName||null, awayName:awayName||null, homeNorm, awayNorm, homeScore:score(g,'home'), awayScore:score(g,'away'), period:first(g?.period,g?.Period,g?.quarter,g?.Quarter,g?.Q), clock:first(g?.clock,g?.Clock,g?.time,g?.Time,g?.remaining), status:first(g?.status,g?.Status,g?.state,g?.State), rawShape:Object.keys(g||{}).slice(0,60) };
}
async function fetchJson(label, url, timeoutMs=25000) {
  const ac = new AbortController(); const t = setTimeout(()=>ac.abort(), timeoutMs);
  try {
    const r = await fetch(url, { signal: ac.signal, headers:{'user-agent':'ExecutionFabric-IPBL-PR23-Reconciliation/1.0', accept:'application/json,text/plain,*/*'} });
    const text = await r.text(); let json=null; try { json=JSON.parse(text); } catch {}
    return { label, url, capturedAt:iso(), http:r.status, ok:r.ok, bytes:Buffer.byteLength(text), contentType:r.headers.get('content-type'), json, preview:text.slice(0,1200) };
  } catch (e) { return { label, url, capturedAt:iso(), ok:false, error:`${e.name}: ${e.message}` }; }
  finally { clearTimeout(t); }
}
function index(rows) { const byId=new Map(), byPair=new Map(); for (const r of rows) { if (r.gameId) byId.set(r.gameId,r); if (r.homeNorm&&r.awayNorm) byPair.set(`${r.homeNorm}|${r.awayNorm}`,r); } return {byId,byPair}; }
function reconcile(rowSets) {
  const sources = Object.keys(rowSets); const primary = rowSets.productionLive?.length ? 'productionLive' : sources.find(s=>rowSets[s]?.length) || 'productionLive';
  const idx = Object.fromEntries(sources.map(s=>[s,index(rowSets[s]||[])])); const matches=[], missing=[], mismatches=[];
  for (const base of rowSets[primary]||[]) {
    const m = { rowKey:base.rowKey, baseSource:primary, base, matched:{} };
    for (const s of sources) if (s !== primary) {
      const cand = (base.gameId && idx[s].byId.get(base.gameId)) || idx[s].byPair.get(`${base.homeNorm}|${base.awayNorm}`) || null;
      if (!cand) { missing.push({rowKey:base.rowKey, missingSource:s, gameId:base.gameId, teamPair:`${base.homeNorm}|${base.awayNorm}`}); continue; }
      m.matched[s]=cand;
      if (base.homeNorm && cand.homeNorm && (base.homeNorm!==cand.homeNorm || base.awayNorm!==cand.awayNorm)) mismatches.push({type:'team', rowKey:base.rowKey, source:s});
      if (base.homeScore!==null && cand.homeScore!==null && (base.homeScore!==cand.homeScore || base.awayScore!==cand.awayScore)) mismatches.push({type:'score', rowKey:base.rowKey, source:s, baseScore:[base.homeScore,base.awayScore], candidateScore:[cand.homeScore,cand.awayScore]});
    }
    matches.push(m);
  }
  return { primarySource:primary, matches, missing, mismatches };
}
async function eventsstat(gameIds) {
  const out=[];
  for (const id of gameIds.slice(0,5)) for (const partner of [8,25]) {
    const url=`https://melbet.com/service-api/LiveFeed/GetHistoryGraphExt?gameId=${encodeURIComponent(id)}&coefView=3&lng=en&partner=${partner}`;
    const r=await fetchJson(`eventsstat-${id}-${partner}`,url,25000); const v=r.json?.Value||{}; const eg=Array.isArray(v.EG)?v.EG:[]; const sh=Array.isArray(v.SH)?v.SH:[];
    out.push({ gameId:id, partner, url, http:r.http??null, ok:r.ok, bytes:r.bytes??null, success:r.json?.Success??null, rootKeys:r.json?Object.keys(r.json):[], valueKeys:v&&typeof v==='object'?Object.keys(v):[], hasEG:eg.length>0, egCount:eg.length, hasSH:sh.length>0, shCount:sh.length, hasDS:v.DS!==undefined&&v.DS!==null, dsType:v.DS===null?'null':typeof v.DS, firstSH:sh[0]??null, lastSH:sh.at(-1)??null, firstEGKeys:eg[0]&&typeof eg[0]==='object'?Object.keys(eg[0]):[], marketSample:eg.flatMap(e=>Array.isArray(e?.C)?e.C.slice(0,12):[]).slice(0,30), error:r.error??null });
  }
  return out;
}
async function main() {
  const outPath = String(arg('--out','artifacts/phase-c9/pr23/row-reconciliation-latest.json'));
  const prod = String(arg('--production-base','https://ipbl-minimal-viewer.vercel.app')).replace(/\/$/,'');
  const endpoints = {
    officialLivePage: String(arg('--official-live-url','https://ipbl.pro/live')),
    officialCalendar: String(arg('--official-calendar-url','https://api1.ipbl.pro/api/Calendar/GetOnline?lng=en')),
    productionLive: `${prod}/api/results/live`, recorderStatus:`${prod}/api/recorder/status`, recorderHistory:`${prod}/api/recorder/history?limit=${encodeURIComponent(String(arg('--history-limit','5')))}`
  };
  const fetched = Object.fromEntries(await Promise.all(Object.entries(endpoints).map(async ([k,u])=>[k,await fetchJson(k,u)])));
  const rowSets = { officialCalendar:extract(fetched.officialCalendar.json).map((g,i)=>row('officialCalendar',g,i)), productionLive:extract(fetched.productionLive.json).map((g,i)=>row('productionLive',g,i)), recorderHistory:extract(fetched.recorderHistory.json).map((g,i)=>row('recorderHistory',g,i)) };
  const activeIds = rowSets.productionLive.map(r=>r.gameId).filter(Boolean);
  const fallbackIds = String(arg('--fallback-game-ids','')).split(',').map(s=>s.trim()).filter(Boolean);
  const ids = activeIds.length ? activeIds : (has('--allow-fallback-game-ids') ? fallbackIds : []);
  const ev = await eventsstat(ids); const rec = reconcile(rowSets);
  const summary = { capturedAt:iso(), endpoints:Object.fromEntries(Object.entries(fetched).map(([k,v])=>[k,{url:v.url,http:v.http??null,ok:v.ok,bytes:v.bytes??null,error:v.error??null,contentType:v.contentType??null}])), rowCounts:Object.fromEntries(Object.entries(rowSets).map(([k,v])=>[k,v.length])), activeProductionGameIds:activeIds, eventsstatProbeMode:activeIds.length?'active-production-games':(has('--allow-fallback-game-ids')?'fallback-game-ids-no-active-production-games':'skipped-no-active-production-games'), eventsstatProven:ev.some(r=>r.hasEG&&r.hasSH&&r.hasDS), partner8Proven:ev.some(r=>r.partner===8&&r.hasEG&&r.hasSH&&r.hasDS), partner25Proven:ev.some(r=>r.partner===25&&r.hasEG&&r.hasSH&&r.hasDS), reconciliation:{primarySource:rec.primarySource,matchCount:rec.matches.length,missingCount:rec.missing.length,mismatchCount:rec.mismatches.length,classification:rec.mismatches.length===0&&rec.missing.length===0&&rec.matches.length>0?'RECONCILED':'PARTIAL'}, oddsDeploymentAllowed:false, oddsDeploymentBlockReason:'PR23 is reconciliation/proof only; live odds deployment requires active EG/SH/DS proof, row-level reconciliation, source policy, and tests.' };
  await fs.mkdir(path.dirname(outPath),{recursive:true}); await fs.writeFile(outPath,JSON.stringify({summary,fetched,rowSets,reconciliation:rec,eventsstat:ev},null,2)); console.log(JSON.stringify(summary,null,2));
}
main().catch(e=>{console.error(e?.stack||e);process.exit(1)});
