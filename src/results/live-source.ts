export type IpblLiveGame = {
  source: "1xlite-get-sports-short-zip";
  sourceUrl: string;
  gameId: string;
  leagueId: string | null;
  division: string;
  divisionLabel: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  periodScores: Record<string, unknown>;
  currentPeriod: string | null;
  clock: string | null;
  status: "live" | "unverified";
  rawPath: string;
};

export type IpblLiveStatus = {
  lastSyncAt: string;
  status: "OK" | "SOURCE_UNAVAILABLE" | "PARSER_ERROR" | "EMPTY";
  errorCode?: "SOURCE_UNAVAILABLE" | "PARSER_ERROR" | "EMPTY_PAYLOAD";
  source: string;
  latencyMs: number;
  message?: string;
};

export type IpblLiveResponse = {
  games: IpblLiveGame[];
  status: IpblLiveStatus;
};

export const IPBL_1X_CHAMP_ID = "2496666";
export const IPBL_1X_LIVE_SOURCE_URL =
  "https://1xlite-041469.top/service-api/LiveFeed/GetSportsShortZip?sports=3,40&champs=2496666&lng=en&gr=830&country=126&virtualSports=true&groupChamps=true";

const TEAM_DIVISION_PATTERNS: Array<[RegExp, string, string]> = [
  [/\bMaykop\b/i, "ipbl-66-m-pro-a", "Men Pro A"],
  [/\bNalchik\b/i, "ipbl-66-m-pro-b", "Men Pro B"],
  [/\bKrasnodar\b/i, "ipbl-66-m-pro-c", "Men Pro C"],
  [/\bSamara\b/i, "ipbl-66-m-pro-d", "Men Pro D"],
];

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number") return String(value);
  return null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) return Number(value);
  return null;
}

function inferDivision(homeTeam: string, awayTeam: string): { division: string; divisionLabel: string } {
  const blob = `${homeTeam} ${awayTeam}`;
  for (const [pattern, division, divisionLabel] of TEAM_DIVISION_PATTERNS) {
    if (pattern.test(blob)) return { division, divisionLabel };
  }
  return { division: "ipbl-live-unmapped", divisionLabel: "IPBL Live Unmapped" };
}

function walk(value: unknown, visit: (record: JsonRecord, path: string) => void, path = "root"): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => walk(item, visit, `${path}[${index}]`));
    return;
  }
  const record = asRecord(value);
  if (!record) return;
  visit(record, path);
  for (const [key, child] of Object.entries(record)) walk(child, visit, `${path}.${key}`);
}

export function parseIpbl1xLivePayload(payload: unknown, sourceUrl = IPBL_1X_LIVE_SOURCE_URL): IpblLiveGame[] {
  const root = asRecord(payload);
  if (!root || root.Success !== true) {
    throw new Error("1xlite payload did not report Success=true");
  }
  const games: IpblLiveGame[] = [];
  const seen = new Set<string>();
  walk(root.Value, (record, path) => {
    const homeTeam = asString(record.O1);
    const awayTeam = asString(record.O2);
    const gameId = asString(record.I ?? record.ID);
    if (!homeTeam || !awayTeam || !gameId) return;
    const score = asRecord(record.SC);
    const fullScore = asRecord(score?.FS);
    const homeScore = asNumber(fullScore?.S1 ?? record.S1 ?? record.T1);
    const awayScore = asNumber(fullScore?.S2 ?? record.S2 ?? record.T2);
    const { division, divisionLabel } = inferDivision(homeTeam, awayTeam);
    const key = `${gameId}:${homeTeam}:${awayTeam}`;
    if (seen.has(key)) return;
    seen.add(key);
    games.push({
      source: "1xlite-get-sports-short-zip",
      sourceUrl,
      gameId,
      leagueId: asString(record.LI ?? record.CI),
      division,
      divisionLabel,
      homeTeam,
      awayTeam,
      homeScore,
      awayScore,
      periodScores: score ?? {},
      currentPeriod: asString(score?.CP ?? score?.CPS ?? record.P ?? record.TS),
      clock: asString(score?.TS ?? score?.T ?? record.SG),
      status: "live",
      rawPath: path,
    });
  });
  return games;
}

export async function fetchIpblLiveGames(fetchImpl: typeof fetch = fetch): Promise<IpblLiveResponse> {
  const started = Date.now();
  let response: Response;
  try {
    response = await fetchImpl(IPBL_1X_LIVE_SOURCE_URL, {
      headers: {
        accept: "application/json,text/plain,*/*",
        "user-agent": "Mozilla/5.0 Mellonelay-IPBL-Live/1.0",
      },
    });
  } catch (error) {
    return {
      games: [],
      status: {
        lastSyncAt: new Date().toISOString(),
        status: "SOURCE_UNAVAILABLE",
        errorCode: "SOURCE_UNAVAILABLE",
        source: IPBL_1X_LIVE_SOURCE_URL,
        latencyMs: Date.now() - started,
        message: error instanceof Error ? error.message : String(error),
      },
    };
  }
  if (!response.ok) {
    return {
      games: [],
      status: {
        lastSyncAt: new Date().toISOString(),
        status: "SOURCE_UNAVAILABLE",
        errorCode: "SOURCE_UNAVAILABLE",
        source: IPBL_1X_LIVE_SOURCE_URL,
        latencyMs: Date.now() - started,
        message: `upstream HTTP ${response.status}`,
      },
    };
  }
  try {
    const payload = await response.json();
    const games = parseIpbl1xLivePayload(payload, IPBL_1X_LIVE_SOURCE_URL);
    return {
      games,
      status: {
        lastSyncAt: new Date().toISOString(),
        status: games.length > 0 ? "OK" : "EMPTY",
        ...(games.length > 0 ? {} : { errorCode: "EMPTY_PAYLOAD" as const }),
        source: IPBL_1X_LIVE_SOURCE_URL,
        latencyMs: Date.now() - started,
        ...(games.length > 0 ? {} : { message: "upstream payload parsed but no live game objects were found" }),
      },
    };
  } catch (error) {
    return {
      games: [],
      status: {
        lastSyncAt: new Date().toISOString(),
        status: "PARSER_ERROR",
        errorCode: "PARSER_ERROR",
        source: IPBL_1X_LIVE_SOURCE_URL,
        latencyMs: Date.now() - started,
        message: error instanceof Error ? error.message : String(error),
      },
    };
  }
}
