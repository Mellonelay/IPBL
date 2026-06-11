import type { StoredResultsMonthMap } from "./ingest-results-month.js";

export type StoredTeamHistoryItem = {
  game: {
    id: number;
    scheduledTime: string | null;
    localDate: string;
    localTime: string;
    gameStatus: string;
    score: string;
    fullScore: string | null;
  };
  team1: { teamId: number; shortName: string; name: string };
  team2: { teamId: number; shortName: string; name: string };
};

export function parseStoredResultsMonth(value: unknown): StoredResultsMonthMap | null {
  if (!value) return null;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return parsed && typeof parsed === "object" ? parsed as StoredResultsMonthMap : null;
    } catch {
      return null;
    }
  }
  return typeof value === "object" ? value as StoredResultsMonthMap : null;
}

export function teamHistoryItemsFromMonths(
  months: Array<StoredResultsMonthMap | null>,
  teamId: number,
  divisionTag: string
): StoredTeamHistoryItem[] {
  const byGame = new Map<number, StoredTeamHistoryItem>();
  for (const month of months) {
    if (!month) continue;
    for (const divisions of Object.values(month)) {
      if (!Array.isArray(divisions)) continue;
      for (const division of divisions) {
        if (division.divisionTag !== divisionTag || !Array.isArray(division.games)) continue;
        for (const row of division.games) {
          const game = row?.game;
          if (!game || game.tag !== divisionTag || !Number.isFinite(game.gameId)) continue;
          if (game.team1?.teamId !== teamId && game.team2?.teamId !== teamId) continue;
          byGame.set(game.gameId, {
            game: {
              id: game.gameId,
              scheduledTime: game.scheduledTime ?? null,
              localDate: game.sourceLocalDate ?? game.localDate ?? "",
              localTime: game.sourceLocalTime ?? game.localTime ?? "",
              gameStatus: String(game.status ?? "ResultConfirmed"),
              score: String(game.scoreText ?? ""),
              fullScore: game.fullScore ?? null,
            },
            team1: game.team1,
            team2: game.team2,
          });
        }
      }
    }
  }
  return [...byGame.values()].sort((a, b) => {
    const left = Date.parse(a.game.scheduledTime ?? "") || 0;
    const right = Date.parse(b.game.scheduledTime ?? "") || 0;
    return right - left || b.game.id - a.game.id;
  });
}
