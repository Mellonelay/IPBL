import type { ScheduleGame } from "./calendar-normalize.js";
import { fetchMelbetLive } from "./bookmaker-live.js";
import { getResultsRedis } from "./results-redis.js";
import {
  IPBL_API_BASE,
  isApprovedResultsTag,
  resultsKvKey,
} from "./results-sync-constants.js";

type StoredGridRow = { game?: ScheduleGame };
type StoredGridDivision = { games?: StoredGridRow[] };
type StoredMonthMap = Record<string, StoredGridDivision[]>;

export type CompatSource = "official" | "bookmaker-live" | "stored-results";

export type ResolvedCompatGame = {
  game: ScheduleGame;
  source: CompatSource;
};

const ARCHIVE_START_YEAR = 2026;
const ARCHIVE_START_MONTH = 3;
const CACHE_TTL_MS = 60_000;
const storedCache = new Map<string, { at: number; games: ScheduleGame[] }>();


function asObject(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

function decodeStored(value: unknown): unknown {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export function storedGamesFromValue(value: unknown): ScheduleGame[] {
  const decoded = decodeStored(decodeStored(value)) as StoredMonthMap | null;
  if (!decoded || typeof decoded !== "object" || Array.isArray(decoded)) return [];
  const games: ScheduleGame[] = [];
  for (const divisions of Object.values(decoded)) {
    if (!Array.isArray(divisions)) continue;
    for (const division of divisions) {
      if (!Array.isArray(division?.games)) continue;
      for (const row of division.games) {
        if (row?.game && Number.isFinite(Number(row.game.gameId))) games.push(row.game);
      }
    }
  }
  return games;
}

export function parseQuarterPairs(fullScore: string | null | undefined): Array<{ period: number; score1: number; score2: number }> {
  if (!fullScore) return [];
  return fullScore
    .split(",")
    .map((chunk) => chunk.trim())
    .map((chunk, index) => {
      const match = chunk.match(/^(\d+)\s*:\s*(\d+)$/);
      return match
        ? { period: index + 1, score1: Number(match[1]), score2: Number(match[2]) }
        : null;
    })
    .filter((row): row is { period: number; score1: number; score2: number } => row !== null);
}

function clockParts(clock: string | null | undefined): { currentMinute: number; currentSecond: number } {
  const match = String(clock ?? "").trim().match(/^(\d{1,2}):(\d{2})$/);
  return {
    currentMinute: match ? Number(match[1]) : 0,
    currentSecond: match ? Number(match[2]) : 0,
  };
}

export function buildGameDetailPayload(game: ScheduleGame, source: CompatSource): unknown {
  const clock = clockParts(game.timeToGo);
  return {
    data: {
      status: "Ok",
      result: {
        game: {
          id: game.gameId,
          gameStatus: game.status,
          score1: game.score1,
          score2: game.score2,
          score: game.scoreText,
          fullScore: game.fullScore,
          localDate: game.localDate,
          localTime: game.localTime,
          scheduledTime: game.scheduledTime ?? null,
          period: game.period,
          timeToGo: game.timeToGo,
        },
        team1: game.team1,
        team2: game.team2,
        live: {
          periods: "10,10,10,10",
          currentMinute: clock.currentMinute,
          currentSecond: clock.currentSecond,
        },
      },
    },
    meta: { source, fallback: source !== "official" },
  };
}

export function buildBoxScorePayload(game: ScheduleGame, source: CompatSource): unknown {
  return {
    data: {
      status: "Ok",
      result: {
        score1: game.score1,
        score2: game.score2,
        fullScore: game.fullScore,
        scoreByPeriods: parseQuarterPairs(game.fullScore),
      },
    },
    meta: { source, fallback: source !== "official" },
  };
}

function historyTimestamp(game: ScheduleGame): number {
  if (game.scheduledTime) {
    const parsed = Date.parse(game.scheduledTime);
    if (Number.isFinite(parsed)) return parsed;
  }
  const match = String(game.localDate).match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (match) {
    const parsed = Date.parse(`${match[3]}-${match[2]}-${match[1]}T${game.localTime || "00:00"}:00+05:00`);
    if (Number.isFinite(parsed)) return parsed;
  }
  return Number(game.gameId) || 0;
}

export function filterTeamGames(games: ScheduleGame[], teamId: number): ScheduleGame[] {
  const seen = new Set<number>();
  return games
    .filter((game) => game.team1.teamId === teamId || game.team2.teamId === teamId)
    .filter((game) => {
      if (seen.has(game.gameId)) return false;
      seen.add(game.gameId);
      return true;
    })
    .sort((a, b) => historyTimestamp(b) - historyTimestamp(a) || b.gameId - a.gameId);
}

function sourceScheduledTime(game: ScheduleGame): string {
  if (game.scheduledTime) return game.scheduledTime;
  const date = String(game.sourceLocalDate ?? game.localDate ?? "");
  const time = String(game.sourceLocalTime ?? game.localTime ?? "00:00");
  const match = date.match(/^(\d{1,2})[.](\d{1,2})[.](\d{4})$/);
  if (!match) return "";
  return `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}T${time}:00+05:00`;
}

export function buildTeamGamesPayload(games: ScheduleGame[], source: CompatSource): unknown {
  return {
    data: {
      status: "Ok",
      items: games.map((game) => ({
        game: {
          id: game.gameId,
          scheduledTime: sourceScheduledTime(game),
          localDate: game.sourceLocalDate ?? game.localDate,
          localTime: game.sourceLocalTime ?? game.localTime,
          tag: game.tag,
          gameStatus: game.status,
          score: game.scoreText,
          score1: game.score1,
          score2: game.score2,
          fullScore: game.fullScore,
        },
        team1: game.team1,
        team2: game.team2,
      })),
    },
    meta: { source, fallback: source !== "official", count: games.length },
  };
}

export async function fetchOfficialJson(path: string, query: URLSearchParams): Promise<unknown | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 1_500);
  try {
    const response = await fetch(`${IPBL_API_BASE}${path}?${query.toString()}`, {
      headers: { Accept: "application/json", "User-Agent": "IPBL-Minimal-Viewer/1.0" },
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const text = await response.text();
    const parsed = JSON.parse(text) as unknown;
    const root = asObject(parsed);
    return root && asObject(root.data) && !("error" in root) ? parsed : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function monthsForSeason(season: number): number[] {
  const now = new Date();
  if (season < ARCHIVE_START_YEAR || season > now.getUTCFullYear()) return [];
  const start = season === ARCHIVE_START_YEAR ? ARCHIVE_START_MONTH : 1;
  const end = season === now.getUTCFullYear() ? now.getUTCMonth() + 1 : 12;
  return Array.from({ length: Math.max(0, end - start + 1) }, (_, index) => start + index);
}

export async function loadStoredGames(tag: string, season: number): Promise<ScheduleGame[]> {
  if (!isApprovedResultsTag(tag)) return [];
  const cacheKey = `${season}|${tag}`;
  const hit = storedCache.get(cacheKey);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.games;
  const redis = getResultsRedis();
  if (!redis) return [];
  const values = await Promise.all(
    monthsForSeason(season).map((month) =>
      redis.get<unknown>(resultsKvKey(season, month, tag)).catch(() => null)
    )
  );
  const byId = new Map<number, ScheduleGame>();
  for (const value of values) {
    for (const game of storedGamesFromValue(value)) byId.set(game.gameId, game);
  }
  const games = [...byId.values()].sort((a, b) => historyTimestamp(b) - historyTimestamp(a) || b.gameId - a.gameId);
  storedCache.set(cacheKey, { at: Date.now(), games });
  return games;
}


async function resolveLiveGame(id: number, tag: string): Promise<ResolvedCompatGame | null> {
  try {
    const live = await fetchMelbetLive();
    const game = live.games.find((candidate) => candidate.gameId === id && candidate.tag === tag);
    return game ? { game, source: "bookmaker-live" } : null;
  } catch {
    return null;
  }
}

async function resolveStoredGame(id: number, tag: string, season: number): Promise<ResolvedCompatGame | null> {
  const game = (await loadStoredGames(tag, season)).find((candidate) => candidate.gameId === id);
  return game ? { game, source: "stored-results" } : null;
}

export async function resolveCompatGame(id: number, tag: string, season: number): Promise<ResolvedCompatGame | null> {
  if (!isApprovedResultsTag(tag)) return null;
  return id > 50_000_000
    ? (await resolveLiveGame(id, tag)) ?? resolveStoredGame(id, tag, season)
    : (await resolveStoredGame(id, tag, season)) ?? resolveLiveGame(id, tag);
}
