#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEventsStatHistoryGraph } from '../lib/server/eventsstat-contracts.ts';

const APPROVED_LIVE_TAGS = [
  'ipbl-66-m-pro-a', 'ipbl-66-m-pro-b', 'ipbl-66-m-pro-c', 'ipbl-66-m-pro-d', 'ipbl-66-m-pro-u', 'ipbl-66-m-pro-z', 'ipbl-66-m-pro-l',
  'ipbl-66-w-pro-a', 'ipbl-66-w-pro-b', 'ipbl-66-w-pro-c', 'ipbl-66-w-pro-d', 'ipbl-66-w-pro-g', 'ipbl-66-w-pro-k',
];

const args = new Map();
for (let i = 2; i < process.argv.length; i += 1) {
  if (process.argv[i].startsWith('--')) args.set(process.argv[i], process.argv[i + 1]?.startsWith('--') ? true : (process.argv[i + 1] ?? true));
}
const has = (k) => process.argv.includes(k);
const arg = (k, d) => args.get(k) ?? d;
const iso = () => new Date().toISOString();
const norm = (v) => String(v ?? '').toLowerCase().replace(/\(women\)/g, '').replace(/\bwomen\b/g, '').replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
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
  if (side === 'home') c.push(g?.score1, g?.scoreA, g?.ScoreA, g?.S1, g?.FS1, g?.fullScoreHome);
  else c.push(g?.score2, g?.scoreB, g?.ScoreB, g?.S2, g?.FS2, g?.fullScoreAway);
  return num(first(...c));
}
function extract(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  for (const c of [payload.games,payload.data,payload.items,payload.results,payload.matches,payload.events,payload.live,payload.Value,payload.value,payload.snapshots]) {
    if (Array.isArray(c)) return c;
    if (c && typeof c === 'object') for (const n of [c.games,c.items,c.results,c.matches,c.events,c.snapshots]) if (Array.isArray(n)) return n;
  }
  return [];
}
function row(source, g, i) {
  const id = gameId(g), homeName = team(g,'home'), awayName = team(g,'away');
  const homeNorm = norm(homeName), awayNorm = norm(awayName);
  const divisionTag = first(g?.divisionTag, g?.tag, g?.division, g?.leagueTag);
  return { source, index:i, rowKey:id || `${homeNorm} v ${awayNorm}` || `${source}:${i}`, gameId:id || null, divisionTag: divisionTag || null, homeName:homeName||null, awayName:awayName||null, homeNorm, awayNorm, homeScore:score(g,'home'), awayScore:score(g,'away'), period:first(g?.period,g?.Period,g?.quarter,g?.Quarter,g?.Q), clock:first(g?.clock,g?.Clock,g?.timeToGo,g?.time,g?.Time,g?.remaining), status:first(g?.status,g?.Status,g?.state,g?.State), rawShape:Object.keys(g||{}).slice(0,80) };
}
async function fetchJson(label, url, timeoutMs=35000, fetchImpl = fetch) {
  const ac = new AbortController(); const t = setTimeout(()=>ac.abort(), timeoutMs);
  try {
    const r = await fetchImpl(url, { signal: ac.signal, headers:{'user-agent':'ExecutionFabric-IPBL-PR23-Reconciliation/1.1', accept:'application/json,text/plain,*/*', 'cache-control':'no-cache'} });
    const text = await r.text(); let json=null; try { json=JSON.parse(text); } catch {}
    return { label, url, capturedAt:iso(), http:r.status, ok:r.ok, bytes:Buffer.byteLength(text), contentType:r.headers.get('content-type'), json, preview:text.slice(0,1200) };
  } catch (e) { return { label, url, capturedAt:iso(), ok:false, error:`${e.name}: ${e.message}` }; }
  finally { clearTimeout(t); }
}
function index(rows) { const byId=new Map(), byPair=new Map(); for (const r of rows) { const scoped = r.divisionTag && r.gameId ? `${r.divisionTag}:${r.gameId}` : null; if (scoped) byId.set(scoped,r); if (r.gameId) byId.set(r.gameId,r); if (r.homeNorm&&r.awayNorm) byPair.set(`${r.homeNorm}|${r.awayNorm}`,r); } return {byId,byPair}; }
function reconcile(rowSets) {
  const sources = Object.keys(rowSets); const primary = rowSets.productionLive?.length ? 'productionLive' : sources.find(s=>rowSets[s]?.length) || 'productionLive';
  const idx = Object.fromEntries(sources.map(s=>[s,index(rowSets[s]||[])])); const matches=[], missing=[], mismatches=[];
  for (const base of rowSets[primary]||[]) {
    const m = { rowKey:base.rowKey, baseSource:primary, base, matched:{} };
    for (const s of sources) if (s !== primary) {
      const scoped = base.divisionTag && base.gameId ? `${base.divisionTag}:${base.gameId}` : null;
      const cand = (scoped && idx[s].byId.get(scoped)) || (base.gameId && idx[s].byId.get(base.gameId)) || idx[s].byPair.get(`${base.homeNorm}|${base.awayNorm}`) || null;
      if (!cand) { missing.push({rowKey:base.rowKey, missingSource:s, gameId:base.gameId, divisionTag:base.divisionTag, teamPair:`${base.homeNorm}|${base.awayNorm}`}); continue; }
      m.matched[s]=cand;
      if (base.homeNorm && cand.homeNorm && (base.homeNorm!==cand.homeNorm || base.awayNorm!==cand.awayNorm)) mismatches.push({type:'team', rowKey:base.rowKey, source:s});
      if (base.homeScore!==null && cand.homeScore!==null && (base.homeScore!==cand.homeScore || base.awayScore!==cand.awayScore)) mismatches.push({type:'score', rowKey:base.rowKey, source:s, baseScore:[base.homeScore,base.awayScore], candidateScore:[cand.homeScore,cand.awayScore]});
    }
    matches.push(m);
  }
  return { primarySource:primary, matches, missing, mismatches };
}
async function fetchOfficialCalendar(proxyBase, fetchImpl = fetch) {
  const components = [];
  const games = [];
  for (const tag of APPROVED_LIVE_TAGS) {
    const url = `${proxyBase}/calendar/online?${new URLSearchParams({ tag, lang: 'ru' })}`;
    const result = await fetchJson(`officialCalendar-${tag}`, url, 35000, fetchImpl);
    components.push(result);
    if (result.ok) for (const game of extract(result.json)) games.push({ ...game, tag, divisionTag: game?.divisionTag ?? game?.tag ?? tag });
  }
  return { label: 'officialCalendar', url: `${proxyBase}/calendar/online?tag=<approved>&lang=ru`, capturedAt: iso(), ok: components.some((c) => c.ok), http: components.some((c) => c.ok) ? 200 : null, components, json: { games } };
}
function activeRowsForRecorder(productionRows, recorderStatusJson) {
  const rows = [...productionRows];
  const active = Array.isArray(recorderStatusJson?.activeGameKeys) ? recorderStatusJson.activeGameKeys : [];
  for (const key of active) {
    const [divisionTag, gameId] = String(key).split(':');
    if (divisionTag && gameId && !rows.some((r) => r.divisionTag === divisionTag && r.gameId === gameId)) rows.push({ divisionTag, gameId });
  }
  return rows.filter((r) => r.divisionTag && r.gameId);
}
async function fetchRecorderHistory(prod, productionRows, recorderStatus, historyLimit, fetchImpl = fetch) {
  const targets = activeRowsForRecorder(productionRows, recorderStatus.json);
  const components = [];
  const snapshots = [];
  for (const target of targets.slice(0, 10)) {
    const url = `${prod}/api/recorder/history?${new URLSearchParams({ division: target.divisionTag, gameId: target.gameId, limit: String(historyLimit) })}`;
    const result = await fetchJson(`recorderHistory-${target.divisionTag}-${target.gameId}`, url, 35000, fetchImpl);
    components.push(result);
    if (result.ok) for (const snapshot of extract(result.json)) snapshots.push(snapshot);
  }
  return { label:'recorderHistory', url:`${prod}/api/recorder/history?division=<division>&gameId=<gameId>&limit=${historyLimit}`, capturedAt: iso(), ok: components.some((c) => c.ok), http: components.some((c) => c.ok) ? 200 : null, components, json:{ snapshots } };
}

const MELBET_IPBL_LEAGUES = [2496666, 2496667];
function melbetIpblUrl(leagueId) {
  return `https://melbet.com/service-api/LiveFeed/Get1x2_VZip?sports=3&champs=${leagueId}&count=40&lng=en&gr=62&mode=4&country=169&partner=8&getEmpty=true&virtualSports=true&noFilterBlockEvent=true`;
}
function melbetEventRow(event, leagueId, index) {
  const id = first(event?.I, event?.gameId, event?.id);
  const homeName = first(event?.O1, event?.team1, event?.homeName);
  const awayName = first(event?.O2, event?.team2, event?.awayName);
  return { source:'melbetLive', index, rowKey:String(id ?? `${norm(homeName)} v ${norm(awayName)}`), gameId:id ? String(id) : null, leagueId, divisionTag:null, homeName:homeName||null, awayName:awayName||null, homeNorm:norm(homeName), awayNorm:norm(awayName), homeScore:num(event?.SC?.FS?.S1), awayScore:num(event?.SC?.FS?.S2), period:first(event?.SC?.CP), clock:null, status:first(event?.SC?.CPS,event?.SC?.SLS), rawShape:Object.keys(event||{}).slice(0,80) };
}
async function fetchMelbetLiveCandidates(fetchImpl = fetch) {
  const components=[]; const rows=[];
  for (const leagueId of MELBET_IPBL_LEAGUES) {
    const result = await fetchJson(`melbetLive-${leagueId}`, melbetIpblUrl(leagueId), 30000, fetchImpl);
    components.push(result);
    const events = Array.isArray(result.json?.Value) ? result.json.Value : [];
    for (const [index,event] of events.entries()) {
      const league = first(event?.LI, leagueId);
      if (league !== 2496666 && league !== 2496667 && !String(event?.L ?? '').toLowerCase().includes('ipbl')) continue;
      const row = melbetEventRow(event, leagueId, index);
      if (row.gameId) rows.push(row);
    }
  }
  return { label:'melbetLiveDiscovery', url:'https://melbet.com/service-api/LiveFeed/Get1x2_VZip?champs=<2496666|2496667>&partner=8', capturedAt:iso(), ok:components.some((c)=>c.ok), http:components.some((c)=>c.ok)?200:null, components, json:{ games: rows } };
}
function pairKey(row) { return `${row.homeNorm}|${row.awayNorm}`; }
function reversePairKey(row) { return `${row.awayNorm}|${row.homeNorm}`; }
function melbetIdsForActiveProduction(productionRows, melbetRows) {
  const ids = new Set(); const matches=[];
  for (const prod of productionRows) {
    for (const melbet of melbetRows) {
      const direct = pairKey(prod) && pairKey(prod) === pairKey(melbet);
      const reverse = pairKey(prod) && pairKey(prod) === reversePairKey(melbet);
      if (direct || reverse) {
        ids.add(melbet.gameId);
        matches.push({ productionGameId:prod.gameId, productionDivisionTag:prod.divisionTag, melbetGameId:melbet.gameId, productionTeams:[prod.homeName,prod.awayName], melbetTeams:[melbet.homeName,melbet.awayName], matchMode:direct?'direct-team-pair':'reverse-team-pair' });
      }
    }
  }
  return { ids:[...ids].filter(Boolean), matches };
}

function collectEventsStatIds(productionRows, productionJson, fallbackIds) {
  const ids = new Set(productionRows.map((r)=>r.gameId).filter(Boolean));
  for (const row of [productionJson?.status?.unmatchedBookmakerEvents, productionJson?.status?.matchedBookmakerEvents, productionJson?.status?.bookmakerEvents].flatMap((v)=>Array.isArray(v)?v:[])) {
    const id = first(row?.gameId,row?.id,row?.I,row?.eventId,row?.raw?.I,row?.raw?.gameId);
    if (id) ids.add(String(id));
  }
  for (const id of fallbackIds) ids.add(String(id));
  return [...ids];
}
async function eventsstat(gameIds, fetchImpl = fetch) {
  const out=[];
  for (const id of gameIds.slice(0,8)) for (const partner of [8,25]) {
    const url=`https://melbet.com/service-api/LiveFeed/GetHistoryGraphExt?gameId=${encodeURIComponent(id)}&coefView=3&lng=en&partner=${partner}`;
    const r=await fetchJson(`eventsstat-${id}-${partner}`,url,30000,fetchImpl); const v=r.json?.Value||{}; const eg=Array.isArray(v.EG)?v.EG:[]; const sh=Array.isArray(v.SH)?v.SH:[];
    const parsed = r.ok ? (() => { try { return parseEventsStatHistoryGraph(r.json); } catch { return null; } })() : null;
    out.push({
      gameId:id,
      partner,
      url,
      http:r.http??null,
      ok:r.ok,
      bytes:r.bytes??null,
      success:r.json?.Success??null,
      rootKeys:r.json?Object.keys(r.json):[],
      valueKeys:v&&typeof v==='object'?Object.keys(v):[],
      hasEG:eg.length>0,
      egCount:eg.length,
      hasSH:sh.length>0,
      shCount:sh.length,
      hasDS:v.DS!==undefined&&v.DS!==null,
      dsType:v.DS===null?'null':typeof v.DS,
      firstSH:sh[0]??null,
      lastSH:sh.at(-1)??null,
      firstEGKeys:eg[0]&&typeof eg[0]==='object'?Object.keys(eg[0]):[],
      marketSample:eg.flatMap(e=>Array.isArray(e?.C)?e.C.slice(0,12):[]).slice(0,30),
      marketSeriesCount: parsed?.markets.length ?? 0,
      marketSelectionCount: parsed?.marketSelections.length ?? 0,
      scoreHistoryCount: parsed?.scoreHistory.length ?? 0,
      scoreAlignmentCount: parsed?.scoreAlignment.length ?? 0,
      marketSeriesSample: parsed?.markets.slice(0,3).map((market)=>({
        marketKey: market.marketKey,
        marketType: market.marketType,
        marketGroup: market.marketGroup,
        marketSubgroup: market.marketSubgroup,
        pointCount: market.prices.length,
        firstPrice: market.prices[0] ?? null,
        lastPrice: market.prices.at(-1) ?? null,
      })) ?? [],
      scoreAlignmentSample: parsed?.scoreAlignment.slice(0,8).map((point)=>({
        index: point.index,
        capturedAt: point.capturedAt,
        period: point.period,
        periodName: point.periodName,
        score1: point.score1,
        score2: point.score2,
        deltaScore1: point.deltaScore1,
        deltaScore2: point.deltaScore2,
        elapsedMsSincePrevious: point.elapsedMsSincePrevious,
        isPeriodTransition: point.isPeriodTransition,
      })) ?? [],
      error:r.error??null
    });
  }
  return out;
}
export async function runPhaseC9RowReconciliation(options = {}) {
  const outPath = String(options.outPath ?? arg('--out','artifacts/phase-c9/pr23/row-reconciliation-latest.json'));
  const prod = String(options.productionBase ?? arg('--production-base','https://ipbl-minimal-viewer.vercel.app')).replace(/\/$/,'');
  const proxyBase = String(options.officialProxyBase ?? arg('--official-proxy-base','https://worker.mloneslot99.com/ipbl-proxy')).replace(/\/$/,'');
  const historyLimit = Number(options.historyLimit ?? arg('--history-limit','5')) || 5;
  const fetchImpl = options.fetchImpl ?? fetch;
  const allowFallbackGameIds = Boolean(options.allowFallbackGameIds ?? has('--allow-fallback-game-ids'));
  const fallbackIds = (options.fallbackGameIds ?? String(arg('--fallback-game-ids','')).split(',').map(s=>s.trim()).filter(Boolean)).map(String);
  const endpoints = { officialLivePage: String(arg('--official-live-url','https://ipbl.pro/live')), productionLive: `${prod}/api/results/live?reconcile=${Date.now()}`, recorderStatus:`${prod}/api/recorder/status` };
  const [officialLivePage, officialCalendar, productionLive, recorderStatus, melbetLiveDiscovery] = await Promise.all([
    fetchJson('officialLivePage', endpoints.officialLivePage, 35000, fetchImpl),
    fetchOfficialCalendar(proxyBase, fetchImpl),
    fetchJson('productionLive', endpoints.productionLive, 45000, fetchImpl),
    fetchJson('recorderStatus', endpoints.recorderStatus, 35000, fetchImpl),
    fetchMelbetLiveCandidates(fetchImpl),
  ]);
  const productionRows = extract(productionLive.json).map((g,i)=>row('productionLive',g,i));
  const recorderHistory = await fetchRecorderHistory(prod, productionRows, recorderStatus, historyLimit, fetchImpl);
  const fetched = { officialLivePage, officialCalendar, productionLive, recorderStatus, recorderHistory, melbetLiveDiscovery };
  const rowSets = { officialCalendar:extract(officialCalendar.json).map((g,i)=>row('officialCalendar',g,i)), productionLive:productionRows, recorderHistory:extract(recorderHistory.json).map((g,i)=>row('recorderHistory',g,i)) };
  const activeIds = rowSets.productionLive.map(r=>r.gameId).filter(Boolean);
  const melbetRows = extract(melbetLiveDiscovery.json).map((g,i)=>row('melbetLive',g,i));
  const melbetMatch = melbetIdsForActiveProduction(productionRows, melbetRows);
  const melbetCandidateIds = melbetRows.map((r)=>r.gameId).filter(Boolean);
  const ids = activeIds.length ? [...new Set([...collectEventsStatIds(productionRows, productionLive.json, []), ...melbetCandidateIds, ...(allowFallbackGameIds ? fallbackIds : [])])] : (allowFallbackGameIds ? fallbackIds : []);
  const ev = await eventsstat(ids, fetchImpl); const rec = reconcile(rowSets);
  const provenIds = new Set(ev.filter((r)=>r.hasEG&&r.hasSH&&r.hasDS).map((r)=>String(r.gameId)));
  const matchedProven = melbetMatch.matches.filter((m)=>provenIds.has(String(m.melbetGameId)));
  const deterministicTeamPairEvidence = melbetMatch.matches.map((m)=>({ ...m, eventsstatProven: provenIds.has(String(m.melbetGameId)), requiredForOddsGate: true }));
  const activeMatchedEventsstatProven = matchedProven.length > 0;
  const summary = { capturedAt:iso(), endpoints:Object.fromEntries(Object.entries(fetched).map(([k,v])=>[k,{url:v.url,http:v.http??null,ok:v.ok,bytes:v.bytes??null,error:v.error??null,contentType:v.contentType??null, components:Array.isArray(v.components)?v.components.map((c)=>({label:c.label,url:c.url,http:c.http??null,ok:c.ok,bytes:c.bytes??null,error:c.error??null})):undefined}])), rowCounts:Object.fromEntries(Object.entries(rowSets).map(([k,v])=>[k,v.length])), activeProductionGameIds:activeIds, melbetLiveCandidateCount:melbetRows.length, melbetCandidateIds, melbetMatchedActiveProduction:melbetMatch.matches, deterministicTeamPairEvidence, eventsstatProbeMode:activeIds.length?'active-production-games-with-melbet-live-discovery':(allowFallbackGameIds?'fallback-game-ids-no-active-production-games':'skipped-no-active-production-games'), eventsstatProbeIds:ids, eventsstatProven:ev.some(r=>r.hasEG&&r.hasSH&&r.hasDS), activeMatchedEventsstatProven, activeMatchedEventsstatProofs:matchedProven, partner8Proven:ev.some(r=>r.partner===8&&r.hasEG&&r.hasSH&&r.hasDS), partner25Proven:ev.some(r=>r.partner===25&&r.hasEG&&r.hasSH&&r.hasDS), oddsImplementationGate:{ requiresActiveMatchedEventsstatProven:true, activeMatchedEventsstatProven, passed:activeMatchedEventsstatProven, blocksOddsImplementation:!activeMatchedEventsstatProven }, reconciliation:{primarySource:rec.primarySource,matchCount:rec.matches.length,missingCount:rec.missing.length,mismatchCount:rec.mismatches.length,classification:rec.mismatches.length===0&&rec.missing.length===0&&rec.matches.length>0?'RECONCILED':'PARTIAL'}, oddsDeploymentAllowed:false, oddsDeploymentBlockReason: activeMatchedEventsstatProven ? 'PR23 proves active matched EG/SH/DS but remains reconciliation/proof only; odds implementation still requires separate approved scope, parser policy, tests, and review.' : 'PR23 is reconciliation/proof only; live odds deployment requires activeMatchedEventsstatProven=true, row-level reconciliation, source policy, and tests.' };
  await fs.mkdir(path.dirname(outPath),{recursive:true}); await fs.writeFile(outPath,JSON.stringify({summary,fetched,rowSets,reconciliation:rec,eventsstat:ev},null,2)); console.log(JSON.stringify(summary,null,2));
  return { summary, fetched, rowSets, reconciliation: rec, eventsstat: ev };
}

const isEntryPoint = path.resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url);
if (isEntryPoint) {
  runPhaseC9RowReconciliation().catch(e=>{console.error(e?.stack||e);process.exit(1)});
}
