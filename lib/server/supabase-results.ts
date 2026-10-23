import type { StoredResultsMonthMap, ResultsMonthMetadata, StoredCalendarGridGame } from "./results-types.js";
import { canonicalDivisionLabel } from "./results-sync-constants.js";
import { getWorkerResultsMonth, isIpblBackfillConfigured } from "./ipbl-supabase-worker.js";

export type CanonicalResultsRow = {
  official_game_id: number;
  division_tag: string;
  scheduled_at: string;
  source_local_date: string;
  source_local_time: string;
  status: string;
  score1: number;
  score2: number;
  full_score: string | null;
  quarter_totals: string | null;
  home_source_team_id: number;
  home_short_name: string;
  home_name: string;
  away_source_team_id: number;
  away_short_name: string;
  away_name: string;
};

function isoSourceDay(value: string): string | null {
  const match = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(value);
  if (!match) return null;
  const iso = `${match[3]}-${match[2]}-${match[1]}`;
  const check = new Date(`${iso}T00:00:00.000Z`);
  return !Number.isNaN(check.getTime()) && check.toISOString().slice(0, 10) === iso ? iso : null;
}

export function canonicalResultsMonthMap(rows: CanonicalResultsRow[], year: number, month: number, tag: string): StoredResultsMonthMap {
  const out: StoredResultsMonthMap = {};
  const seen = new Set<number>();
  for (const row of rows) {
    const day = isoSourceDay(String(row.source_local_date ?? ""));
    if (!day || !day.startsWith(`${year}-${String(month).padStart(2, "0")}-`)
        || row.division_tag !== tag || seen.has(Number(row.official_game_id))
        || !Number.isFinite(row.score1) || !Number.isFinite(row.score2)) continue;
    const gameId = Number(row.official_game_id);
    seen.add(gameId);
    const team1 = { teamId: Number(row.home_source_team_id), shortName: row.home_short_name, name: row.home_name };
    const team2 = { teamId: Number(row.away_source_team_id), shortName: row.away_short_name, name: row.away_name };
    const label = canonicalDivisionLabel(tag) ?? tag;
    const scoreText = `${row.score1} : ${row.score2}`;
    const game: StoredCalendarGridGame = {
      game: {
        gameId, tag, status: row.status, statusDisplay: "Finished",
        upstreamStatusId: row.status, score1: row.score1, score2: row.score2, scoreText,
        fullScore: row.full_score, localDate: row.source_local_date, localTime: row.source_local_time,
        divisionLabel: label, period: null, timeToGo: null, timeIsGo: null,
        isLive: false, updatedAt: null, scheduledTime: row.scheduled_at,
        sourceLocalDate: row.source_local_date, sourceLocalTime: row.source_local_time,
        sourceTimeZone: "UTC+05:00", displayTimeZone: "Asia/Yangon",
        team1, team2,
      },
      time: row.source_local_time, teams: `${team1.shortName} vs ${team2.shortName}`,
      score: scoreText, division: label, divisionTag: tag, quarterTotals: row.quarter_totals,
    };
    (out[day] ??= [{ date: day, division: label, divisionTag: tag, games: [] }])[0].games.push(game);
  }
  for (const groups of Object.values(out)) groups[0].games.sort((a, b) => a.time.localeCompare(b.time));
  return out;
}

export function canonicalResultsMetadata(year: number, month: number, tag: string, map: StoredResultsMonthMap): ResultsMonthMetadata {
  const days = Object.keys(map).sort();
  return {
    schemaVersion: 1, status: "ok", source: "supabase-canonical",
    checkedAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    verifiedThroughDate: days.at(-1) ?? null,
    year, month, divisionTag: tag,
    acceptedRows: Object.values(map).reduce((n, groups) => n + groups.reduce((sum, group) => sum + group.games.length, 0), 0),
  };
}

export function isCanonicalResultsMonth(year: number, month: number): boolean {
  return year > 2026 || (year === 2026 && month >= 9);
}

export async function loadCanonicalResultsMonth(year: number, month: number, tag: string):
  Promise<{ calendar: StoredResultsMonthMap; meta: ResultsMonthMetadata } | null> {
  if (!isCanonicalResultsMonth(year, month) || !isIpblBackfillConfigured()) return null;
  const rows = await getWorkerResultsMonth({ divisionTag: tag, year, month });
  if (!Array.isArray(rows)) throw new Error("Canonical month RPC returned invalid rows");
  const calendar = canonicalResultsMonthMap(rows as CanonicalResultsRow[], year, month, tag);
  return { calendar, meta: canonicalResultsMetadata(year, month, tag, calendar) };
}
