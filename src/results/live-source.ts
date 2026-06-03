export const MA_1XBET_PRIMARY_LIVE_URL =
  "https://ma-1xbet.com/service-api/LiveFeed/GetSportsShortZip?sports=3,40&champs=2496666&lng=en&gr=830&country=126&virtualSports=true&groupChamps=true";

export const MA_1XBET_SECONDARY_LIVE_URL =
  "https://ma-1xbet.com/service-api/main-live-feed/v1/expressDay?cfView=3&country=126&gr=830&lng=en&ref=1";

export type Ma1xBetLiveMatch = {
  source: "ma-1xbet:GetSportsShortZip" | "ma-1xbet:expressDay";
  sourceUrl: string;
  gameId: string | number | null;
  leagueId: string | number | null;
  division: string;
  homeTeam: string | null;
  awayTeam: string | null;
  homeScore: string | number | null;
  awayScore: string | number | null;
  periodScores: unknown;
  currentPeriod: string | number | null;
  clock: string | number | null;
  status: string | number | boolean | null;
  rawPathMap: Record<string, string>;
  confidence: "HIGH" | "MEDIUM" | "LOW";
};

type AnyRecord = Record<string, unknown>;

function isRecord(value: unknown): value is AnyRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isScalar(value: unknown): value is string | number | boolean {
  return ["string", "number", "boolean"].includes(typeof value);
}

function numLike(value: unknown): boolean {
  return typeof value === "number" || (typeof value === "string" && /^\d{1,3}(?:\.\d+)?$/.test(value.trim()));
}

function walkRecords(value: unknown, path = "$", out: Array<{ path: string; value: AnyRecord }> = []): Array<{ path: string; value: AnyRecord }> {
  if (isRecord(value)) {
    out.push({ path, value });
    for (const [key, child] of Object.entries(value)) walkRecords(child, `${path}.${key}`, out);
  } else if (Array.isArray(value)) {
    value.forEach((child, index) => walkRecords(child, `${path}[${index}]`, out));
  }
  return out;
}

function firstScalar(record: AnyRecord, keys: readonly string[]): { value: string | number | boolean | null; key: string | null } {
  for (const key of keys) {
    const value = record[key];
    if (isScalar(value) && String(value) !== "") return { value, key };
  }
  return { value: null, key: null };
}

function scorePair(container: unknown): { home: unknown; away: unknown; periods: unknown; currentPeriod: unknown; clock: unknown; status: unknown; pathHint: string | null } {
  if (!isRecord(container)) return { home: null, away: null, periods: null, currentPeriod: null, clock: null, status: null, pathHint: null };
  let home: unknown = null;
  let away: unknown = null;
  let periods: unknown = null;
  let currentPeriod: unknown = null;
  let clock: unknown = null;
  let status: unknown = null;
  let pathHint: string | null = null;
  for (const key of ["S1", "FS1", "T1", "H1", "homeScore", "score1"]) {
    if (home == null && numLike(container[key])) { home = container[key]; pathHint = key; }
  }
  for (const key of ["S2", "FS2", "T2", "H2", "awayScore", "score2"]) {
    if (away == null && numLike(container[key])) { away = container[key]; pathHint = pathHint ?? key; }
  }
  for (const key of ["FS", "F", "Score", "score", "SC", "current", "Current", "total", "Total"]) {
    if ((home == null || away == null) && isRecord(container[key])) {
      const nested = scorePair(container[key]);
      home = home ?? nested.home;
      away = away ?? nested.away;
      periods = periods ?? nested.periods;
      currentPeriod = currentPeriod ?? nested.currentPeriod;
      clock = clock ?? nested.clock;
      status = status ?? nested.status;
      pathHint = nested.pathHint ? `${key}.${nested.pathHint}` : pathHint;
    }
  }
  for (const key of ["PS", "P", "Periods", "periods", "PeriodScores", "quarterScores", "scoreByPeriod", "CPS"]) {
    if (periods == null && container[key] !== undefined) periods = container[key];
  }
  for (const key of ["CP", "P", "Period", "period", "Quarter", "quarter", "CPS"]) {
    if (currentPeriod == null && numLike(container[key])) currentPeriod = container[key];
  }
  for (const key of ["T", "TS", "Timer", "timer", "clock", "Clock", "Time", "time"]) {
    if (clock == null && (numLike(container[key]) || typeof container[key] === "string")) clock = container[key];
  }
  for (const key of ["S", "SS", "Status", "status", "state", "State", "Stage", "stage", "InPlay", "isLive", "live"]) {
    if (status == null && isScalar(container[key])) status = container[key];
  }
  return { home, away, periods, currentPeriod, clock, status, pathHint };
}

export function parseMa1xBetLiveMatches(payload: unknown, source: Ma1xBetLiveMatch["source"], sourceUrl: string): Ma1xBetLiveMatch[] {
  const matches: Ma1xBetLiveMatch[] = [];
  for (const { path, value } of walkRecords(payload)) {
    const home = firstScalar(value, ["O1", "home", "homeTeam", "team1", "HomeTeam", "homeName"]);
    const away = firstScalar(value, ["O2", "away", "awayTeam", "team2", "AwayTeam", "awayName"]);
    if (!home.value || !away.value) continue;
    const id = firstScalar(value, ["I", "Id", "ID", "GameId", "gameId", "eventId", "matchId", "E", "EI", "EventId"]);
    const league = firstScalar(value, ["LI", "LID", "leagueId", "LeagueId", "champId", "ChampId", "CI", "CH"]);
    let score = scorePair(value);
    if (score.home == null || score.away == null) {
      for (const [key, child] of Object.entries(value)) {
        if (/SC|FS|score|period|quarter|PS/i.test(key)) {
          const nested = scorePair(child);
          score = {
            home: score.home ?? nested.home,
            away: score.away ?? nested.away,
            periods: score.periods ?? nested.periods,
            currentPeriod: score.currentPeriod ?? nested.currentPeriod,
            clock: score.clock ?? nested.clock,
            status: score.status ?? nested.status,
            pathHint: nested.pathHint ? `${key}.${nested.pathHint}` : score.pathHint,
          };
        }
      }
    }
    matches.push({
      source,
      sourceUrl,
      gameId: id.value as string | number | null,
      leagueId: league.value as string | number | null,
      division: "Russia IPBL Pro Division / champ 2496666",
      homeTeam: String(home.value),
      awayTeam: String(away.value),
      homeScore: score.home as string | number | null,
      awayScore: score.away as string | number | null,
      periodScores: score.periods ?? null,
      currentPeriod: score.currentPeriod as string | number | null,
      clock: score.clock as string | number | null,
      status: score.status as string | number | boolean | null,
      rawPathMap: {
        record: path,
        game_id: id.key ? `${path}.${id.key}` : path,
        league_id: league.key ? `${path}.${league.key}` : path,
        home_team: home.key ? `${path}.${home.key}` : path,
        away_team: away.key ? `${path}.${away.key}` : path,
        score: score.pathHint ? `${path}.${score.pathHint}` : path,
      },
      confidence: id.value != null && score.home != null && score.away != null ? "HIGH" : "MEDIUM",
    });
  }
  return matches;
}
