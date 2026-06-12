export type TeamIdentity = { sourceTeamId: number | null; name: string };
export type LeagueIdentity = { sourceLeagueId: number; name: string };
export type ScoreHistoryPoint = { capturedAt: string; team1: number; team2: number; period: number | null };
export type OddsHistoryPoint = { capturedAt: string; coefficient: number; line: number | null };
export type OddsHistorySeries = { marketKey: string; points: OddsHistoryPoint[] };
export type MarketDefinition = { groupId: number | null; groupSection: number | null; typeId: number | null; line: number | null; coefficient: number | null };
export type SubscriptionOption = { period: number; events: number[] };
export type StatisticsSnapshot = { periodKey: number | null; statisticId: number | null; name: string; team1: number | null; team2: number | null };
export type LiveGameSnapshot = {
  gameId: number; league: LeagueIdentity; team1: TeamIdentity; team2: TeamIdentity;
  score1: number | null; score2: number | null; period: number | null; periodLabel: string | null;
  elapsedSeconds: number | null; sourceUpdatedAt: number | null; startsAt: number | null;
  quarterScores: Array<{ period: number; team1: number | null; team2: number | null }>;
  statistics: StatisticsSnapshot[]; markets: MarketDefinition[];
};
export type LeagueSnapshot = { league: LeagueIdentity; games: LiveGameSnapshot[] };
export type H2HRecord = { gameId: number; source: "unproven" };
export type MelZoneSnapshot = { source: "unproven" };

type R = Record<string, unknown>;
const rec = (x: unknown): R | null => x !== null && typeof x === "object" && !Array.isArray(x) ? x as R : null;
const arr = (x: unknown): unknown[] => Array.isArray(x) ? x : [];
const num = (x: unknown): number | null => typeof x === "number" && Number.isFinite(x) ? x : null;
const str = (x: unknown): string | null => typeof x === "string" && x.trim() ? x.trim() : null;

function parseStatistics(score: R | null): StatisticsSnapshot[] {
  const output: StatisticsSnapshot[] = [];
  for (const groupRaw of arr(score?.ST)) {
    const group = rec(groupRaw); const periodKey = num(group?.Key);
    for (const itemRaw of arr(group?.Value)) {
      const item = rec(itemRaw); const name = str(item?.N); if (!name) continue;
      const n = (v: unknown) => typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v)) ? Number(v) : null;
      output.push({ periodKey, statisticId: num(item?.ID), name, team1: n(item?.S1), team2: n(item?.S2) });
    }
  }
  return output;
}

function parseMarkets(value: R): MarketDefinition[] {
  const out: MarketDefinition[] = [];
  const visitGroups = (groups: unknown[]) => {
    for (const groupRaw of groups) {
      const group = rec(groupRaw); if (!group) continue;
      for (const column of arr(group.E)) for (const eventRaw of arr(column)) {
        const event = rec(eventRaw); if (!event) continue;
        out.push({ groupId: num(event.G) ?? num(group.G), groupSection: num(event.GS) ?? num(group.GS), typeId: num(event.T), line: num(event.P), coefficient: num(event.C) });
      }
    }
  };
  visitGroups(arr(value.GE));
  for (const subRaw of arr(value.SG)) { const sub = rec(subRaw); if (sub) visitGroups(arr(sub.GE)); }
  return out;
}

export function parseGameValue(valueRaw: unknown): LiveGameSnapshot | null {
  const value = rec(valueRaw); if (!value) return null;
  const gameId = num(value.I), leagueId = num(value.LI), team1Name = str(value.O1), team2Name = str(value.O2);
  if (gameId === null || leagueId === null || !team1Name || !team2Name) return null;
  const score = rec(value.SC), final = rec(score?.FS);
  const quarterScores = arr(score?.PS).map((raw) => { const p=rec(raw),v=rec(p?.Value); return { period:num(p?.Key), team1:num(v?.S1), team2:num(v?.S2) }; })
    .filter((x): x is {period:number;team1:number|null;team2:number|null} => x.period !== null);
  return {
    gameId, league:{ sourceLeagueId:leagueId, name:str(value.LE) ?? str(value.L) ?? `league:${leagueId}` },
    team1:{ sourceTeamId:num(value.O1I), name:team1Name }, team2:{ sourceTeamId:num(value.O2I), name:team2Name },
    score1:num(final?.S1), score2:num(final?.S2), period:num(score?.CP), periodLabel:str(score?.CPS),
    elapsedSeconds:num(score?.TS), sourceUpdatedAt:num(value.U), startsAt:num(value.S), quarterScores,
    statistics:parseStatistics(score), markets:parseMarkets(value),
  };
}

export function parseGetGameZip(raw: unknown): LiveGameSnapshot | null { return parseGameValue(rec(raw)?.Value); }

export function parseSportsShortZip(raw: unknown, allowedLeagueIds = new Set([2496666,2496667])): LeagueSnapshot[] {
  const root=rec(raw); const byLeague=new Map<number,LeagueSnapshot>();
  for (const sportRaw of arr(root?.Value)) {
    const sport=rec(sportRaw); if (!sport) continue;
    for (const leagueRaw of arr(sport.L)) {
      const league=rec(leagueRaw), id=num(league?.LI); if (id===null || !allowedLeagueIds.has(id)) continue;
      const snapshot=byLeague.get(id) ?? { league:{sourceLeagueId:id,name:str(league?.L) ?? `league:${id}`}, games:[] };
      for (const gameRaw of arr(league?.G)) { const game=parseGameValue(gameRaw); if (game) snapshot.games.push(game); }
      byLeague.set(id,snapshot);
    }
  }
  return [...byLeague.values()].sort((a,b)=>a.league.sourceLeagueId-b.league.sourceLeagueId);
}

export function parseSubscriptionOptions(raw: unknown): { sport: number | null; options: SubscriptionOption[] } {
  const root=rec(raw); return { sport:num(root?.sport), options:arr(root?.options).map((x)=>rec(x)).filter((x):x is R=>x!==null)
    .map((x)=>({period:num(x.period),events:arr(x.events).map(num).filter((n):n is number=>n!==null)}))
    .filter((x):x is SubscriptionOption=>x.period!==null) };
}

export function parseHistoryGraphExt(raw: unknown): { scoreHistory: ScoreHistoryPoint[]; oddsHistory: OddsHistorySeries[] } {
  const root=rec(raw); if (!root || (!Array.isArray(root.SH) && !Array.isArray(root.EG))) throw new Error("history_graph_contract_unverified");
  return { scoreHistory: [], oddsHistory: [] };
}
