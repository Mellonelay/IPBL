import type { StoredTeamHistoryItem } from "./team-history-from-results.js";
import { getSupabaseAdminClient } from "./supabase-admin.js";

export type SupabaseTeamHistoryResult = {
  configured: boolean;
  ok: boolean;
  items: StoredTeamHistoryItem[];
  error: string | null;
};

type TeamHistoryViewRow = {
  official_game_id: number;
  scheduled_at: string;
  source_local_date: string | null;
  source_local_time: string | null;
  status: string;
  score1: number | null;
  score2: number | null;
  full_score: string | null;
  quarter_totals: string | null;
  home_source_team_id: number;
  home_short_name: string;
  home_name: string;
  away_source_team_id: number;
  away_short_name: string;
  away_name: string;
};

function scoreText(row: TeamHistoryViewRow): string {
  return typeof row.score1 === "number" && typeof row.score2 === "number"
    ? `${row.score1} : ${row.score2}`
    : "";
}

function toStoredItem(row: TeamHistoryViewRow): StoredTeamHistoryItem {
  return {
    game: {
      id: Number(row.official_game_id),
      scheduledTime: row.scheduled_at,
      localDate: String(row.source_local_date ?? ""),
      localTime: String(row.source_local_time ?? ""),
      gameStatus: String(row.status),
      score: scoreText(row),
      fullScore: row.full_score,
      quarterTotals: row.quarter_totals,
    },
    team1: {
      teamId: Number(row.home_source_team_id),
      shortName: String(row.home_short_name),
      name: String(row.home_name),
    },
    team2: {
      teamId: Number(row.away_source_team_id),
      shortName: String(row.away_short_name),
      name: String(row.away_name),
    },
  };
}

export async function fetchSupabaseTeamHistoryRows(
  teamId: number,
  divisionTag: string,
  limit = 1000
): Promise<SupabaseTeamHistoryResult> {
  const client = getSupabaseAdminClient();
  if (!client) return { configured: false, ok: false, items: [], error: "not configured" };

  const { data, error } = await client
    .from("team_history_games")
    .select([
      "official_game_id",
      "scheduled_at",
      "source_local_date",
      "source_local_time",
      "status",
      "score1",
      "score2",
      "full_score",
      "quarter_totals",
      "home_source_team_id",
      "home_short_name",
      "home_name",
      "away_source_team_id",
      "away_short_name",
      "away_name",
    ].join(","))
    .eq("division_tag", divisionTag)
    .or(`home_source_team_id.eq.${teamId},away_source_team_id.eq.${teamId}`)
    .order("scheduled_at", { ascending: false })
    .limit(Math.max(1, Math.min(limit, 2000)))
    .overrideTypes<TeamHistoryViewRow[], { merge: false }>();

  if (error) {
    return { configured: true, ok: false, items: [], error: error.message };
  }

  const items = (Array.isArray(data) ? data : [])
    .map(toStoredItem)
    .filter((row) => row.game.id > 0 && Boolean(row.game.score));
  return { configured: true, ok: true, items, error: null };
}
