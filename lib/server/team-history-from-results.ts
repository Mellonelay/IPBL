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


type OfficialOnlineCalendarPayload = {
  data?: {
    items?: Array<{
      game?: {
        id?: number;
        scheduledTime?: string | null;
        localDate?: string | null;
        localTime?: string | null;
        gameStatus?: string | null;
        score?: string | null;
        score1?: number | null;
        score2?: number | null;
        fullScore?: string | null;
      };
      league?: { tag?: string | null };
      status?: { id?: string | null; displayName?: string | null };
      team1?: { teamId?: number; shortName?: string | null; name?: string | null };
      team2?: { teamId?: number; shortName?: string | null; name?: string | null };
    }>;
  };
};

type OfficialOnlineCalendarItem = NonNullable<NonNullable<OfficialOnlineCalendarPayload['data']>['items']>[number];
type OfficialOnlineTeamRef = NonNullable<OfficialOnlineCalendarItem['team1']>;
type OfficialOnlineGame = NonNullable<OfficialOnlineCalendarItem['game']>;

function officialTeamRef(team: OfficialOnlineTeamRef | undefined): { teamId: number; shortName: string; name: string } {
  const t = team ?? {};
  return {
    teamId: Number(t.teamId ?? 0),
    shortName: String(t.shortName ?? t.name ?? '?'),
    name: String(t.name ?? t.shortName ?? '?'),
  };
}

function officialScoreText(game: OfficialOnlineGame): string {
  const explicit = String(game.score ?? '').trim();
  if (explicit) return explicit.replace(':', ' : ');
  if (typeof game.score1 === 'number' && typeof game.score2 === 'number') return `${game.score1} : ${game.score2}`;
  return '';
}

function isCurrentOfficialHistoryRow(row: OfficialOnlineCalendarItem, divisionTag: string, teamId: number): row is OfficialOnlineCalendarItem & { game: OfficialOnlineGame } {
  const game = row.game;
  if (!game || !Number.isFinite(game.id)) return false;
  if (row.league?.tag !== divisionTag) return false;
  const team1 = Number(row.team1?.teamId ?? 0);
  const team2 = Number(row.team2?.teamId ?? 0);
  if (team1 !== teamId && team2 !== teamId) return false;
  const status = `${game.gameStatus ?? ''} ${row.status?.id ?? ''} ${row.status?.displayName ?? ''}`.toLowerCase();
  if (!/(online|live|result|confirmed|finish|finished)/i.test(status)) return false;
  if (!officialScoreText(game)) return false;
  return true;
}

export function officialOnlineTeamHistoryItems(
  raw: unknown,
  teamId: number,
  divisionTag: string
): StoredTeamHistoryItem[] {
  const payload = raw as OfficialOnlineCalendarPayload;
  const items = payload?.data?.items;
  if (!Array.isArray(items)) return [];
  const out: StoredTeamHistoryItem[] = [];
  for (const row of items) {
    if (!isCurrentOfficialHistoryRow(row, divisionTag, teamId)) continue;
    const game = row.game;
    out.push({
      game: {
        id: Number(game.id),
        scheduledTime: game.scheduledTime ?? null,
        localDate: String(game.localDate ?? ''),
        localTime: String(game.localTime ?? ''),
        gameStatus: String(game.gameStatus ?? row.status?.id ?? row.status?.displayName ?? 'Online'),
        score: officialScoreText(game),
        fullScore: game.fullScore ?? null,
      },
      team1: officialTeamRef(row.team1),
      team2: officialTeamRef(row.team2),
    });
  }
  return out;
}

export function mergeTeamHistoryItems(
  stored: StoredTeamHistoryItem[],
  currentOfficial: StoredTeamHistoryItem[]
): StoredTeamHistoryItem[] {
  const byGame = new Map<number, StoredTeamHistoryItem>();
  for (const item of stored) byGame.set(item.game.id, item);
  for (const item of currentOfficial) byGame.set(item.game.id, item);
  return [...byGame.values()].sort((a, b) => {
    const left = Date.parse(a.game.scheduledTime ?? '') || 0;
    const right = Date.parse(b.game.scheduledTime ?? '') || 0;
    return right - left || b.game.id - a.game.id;
  });
}
