import { fetchOfficialJson } from "./ipbl-compat.js";
import type { ScheduleGame } from "./calendar-normalize.js";
import { normalizeLiveGame } from "./live-normalize.js";

type OfficialGamePayload = {
  data?: {
    status?: string;
    result?: {
      game?: {
        gameStatus?: string;
        score1?: number;
        score2?: number;
        score?: string;
        fullScore?: string | null;
        localDate?: string;
        localTime?: string;
        scheduledTime?: string | null;
        period?: number | null;
        timeToGo?: string | null;
      };
      status?: { id?: string; displayName?: string };
    };
  };
};

function officialStatusText(raw: unknown): string {
  const payload = raw as OfficialGamePayload;
  const result = payload?.data?.result;
  return [
    payload?.data?.status,
    result?.game?.gameStatus,
    result?.status?.id,
    result?.status?.displayName,
  ]
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLowerCase();
}

export function officialGameDetailIsTerminal(raw: unknown): boolean {
  const text = officialStatusText(raw);
  const terminalIndicators = [
    "result",
    "confirmed",
    "finish",
    "finished",
    "complete",
    "completed",
    "ended",
    "final",
    "заверш",
    "оконч",
    "итог",
    "отмен",
  ];
  return terminalIndicators.some((needle) => text.includes(needle));
}

function scoreText(score1: number, score2: number, explicit?: string): string {
  const text = typeof explicit === "string" ? explicit.trim() : "";
  return text ? text.replace(":", " : ") : `${score1} : ${score2}`;
}

function applyOfficialGameDetail(game: ScheduleGame, raw: unknown): ScheduleGame | null {
  if (officialGameDetailIsTerminal(raw)) return null;
  const payload = raw as OfficialGamePayload;
  const official = payload?.data?.result?.game;
  if (!official) return game;
  const score1 = typeof official.score1 === "number" && Number.isFinite(official.score1) ? official.score1 : game.score1;
  const score2 = typeof official.score2 === "number" && Number.isFinite(official.score2) ? official.score2 : game.score2;
  return normalizeLiveGame({
    ...game,
    status: official.gameStatus ?? game.status,
    statusDisplay: payload?.data?.result?.status?.displayName ?? game.statusDisplay,
    upstreamStatusId: payload?.data?.result?.status?.id ?? "official-detail",
    score1,
    score2,
    scoreText: scoreText(score1, score2, official.score),
    fullScore: official.fullScore ?? game.fullScore,
    period: typeof official.period === "number" ? official.period : game.period,
    timeToGo: typeof official.timeToGo === "string" ? official.timeToGo : game.timeToGo,
    scheduledTime: official.scheduledTime ?? game.scheduledTime,
    localDate: official.localDate ?? game.localDate,
    localTime: official.localTime ?? game.localTime,
    sourceLocalDate: official.localDate ?? game.sourceLocalDate,
    sourceLocalTime: official.localTime ?? game.sourceLocalTime,
  });
}

export async function reconcileLiveGamesWithOfficialDetail(
  games: ScheduleGame[],
): Promise<{ games: ScheduleGame[]; checked: number; dropped: number; updated: number }> {
  const reconciled = await Promise.all(games.map(async (game) => {
    const official = await fetchOfficialJson(
      "/games/game",
      new URLSearchParams({ id: String(game.gameId), tag: game.tag, lang: "ru" }),
    );
    if (!official) return { game, checked: 0, dropped: 0, updated: 0 };
    const next = applyOfficialGameDetail(game, official);
    if (!next) return { game: null, checked: 1, dropped: 1, updated: 0 };
    const updated = next.score1 !== game.score1
      || next.score2 !== game.score2
      || next.status !== game.status
      || next.upstreamStatusId !== game.upstreamStatusId
      ? 1
      : 0;
    return { game: next, checked: 1, dropped: 0, updated };
  }));
  return {
    games: reconciled.map((row) => row.game).filter((game): game is ScheduleGame => game !== null),
    checked: reconciled.reduce((sum, row) => sum + row.checked, 0),
    dropped: reconciled.reduce((sum, row) => sum + row.dropped, 0),
    updated: reconciled.reduce((sum, row) => sum + row.updated, 0),
  };
}
