import { canonicalDivisionLabel } from "../config/divisions";
import { h2hDateTimeKey } from "../api/normalize";
import type { ScheduleGame, TeamHistoryGame, TeamRef } from "../api/types";

export type TeamRange = 5 | 10 | 30 | "all";

export type QuarterTransition = {
  from: number;
  to: number;
  samples: number;
  increases: number;
  rate: number | null;
  averageDelta: number | null;
};

export type TeamProfile = {
  games: TeamHistoryGame[];
  totalAvailable: number;
  wins: number;
  losses: number;
  averageFinalTotal: number | null;
  quarterAverages: Array<number | null>;
  transitions: QuarterTransition[];
};

export function parseScorePair(value: string | null | undefined): [number, number] | null {
  const match = String(value ?? "").match(/(-?\d+)\s*[:\-]\s*(-?\d+)/);
  if (!match) return null;
  const first = Number(match[1]);
  const second = Number(match[2]);
  return Number.isFinite(first) && Number.isFinite(second) ? [first, second] : null;
}

export function parseQuarterTotals(fullScore: string | null | undefined): number[] {
  const source = String(fullScore ?? "").trim();
  if (!source) return [];
  return source
    .split(/[,;|]/)
    .map((part) => parseScorePair(part))
    .filter((pair): pair is [number, number] => pair !== null)
    .map(([first, second]) => first + second)
    .slice(0, 4);
}

export function sortTeamGamesNewest(games: TeamHistoryGame[]): TeamHistoryGame[] {
  return [...games].sort((a, b) => {
    const delta = h2hDateTimeKey(b.localDate, b.localTime) - h2hDateTimeKey(a.localDate, a.localTime);
    return delta || b.gameId - a.gameId;
  });
}

export function isCompletedTeamGame(game: TeamHistoryGame): boolean {
  return parseScorePair(game.scoreText) !== null;
}

function limitGames(games: TeamHistoryGame[], range: TeamRange): TeamHistoryGame[] {
  return range === "all" ? games : games.slice(0, range);
}

function transition(games: TeamHistoryGame[], from: number, to: number): QuarterTransition {
  const deltas = games
    .map((game) => parseQuarterTotals(game.fullScore))
    .filter((quarters) => quarters.length > Math.max(from, to))
    .map((quarters) => quarters[to] - quarters[from]);
  const samples = deltas.length;
  const increases = deltas.filter((delta) => delta > 0).length;
  return {
    from: from + 1,
    to: to + 1,
    samples,
    increases,
    rate: samples ? increases / samples : null,
    averageDelta: samples ? deltas.reduce((sum, value) => sum + value, 0) / samples : null,
  };
}

export function buildTeamProfile(
  allGames: TeamHistoryGame[],
  teamId: number,
  range: TeamRange
): TeamProfile {
  const completed = sortTeamGamesNewest(allGames.filter(isCompletedTeamGame));
  const games = limitGames(completed, range);
  let wins = 0;
  let losses = 0;
  const finalTotals: number[] = [];
  const quarterValues: number[][] = [[], [], [], []];

  for (const game of games) {
    const score = parseScorePair(game.scoreText);
    if (score) {
      finalTotals.push(score[0] + score[1]);
      const isHome = game.team1.teamId === teamId;
      const own = isHome ? score[0] : score[1];
      const opponent = isHome ? score[1] : score[0];
      if (own > opponent) wins += 1;
      else if (own < opponent) losses += 1;
    }
    parseQuarterTotals(game.fullScore).forEach((value, index) => quarterValues[index]?.push(value));
  }

  const average = (values: number[]): number | null =>
    values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;

  return {
    games,
    totalAvailable: completed.length,
    wins,
    losses,
    averageFinalTotal: average(finalTotals),
    quarterAverages: quarterValues.map(average),
    transitions: [transition(games, 0, 1), transition(games, 1, 2), transition(games, 2, 3)],
  };
}

export function opponentForGame(game: TeamHistoryGame, teamId: number): TeamRef {
  return game.team1.teamId === teamId ? game.team2 : game.team1;
}

export function teamResultForGame(game: TeamHistoryGame, teamId: number): "W" | "L" | "T" | "—" {
  const score = parseScorePair(game.scoreText);
  if (!score) return "—";
  const isHome = game.team1.teamId === teamId;
  const own = isHome ? score[0] : score[1];
  const opponent = isHome ? score[1] : score[0];
  return own > opponent ? "W" : own < opponent ? "L" : "T";
}

export function teamHistoryToScheduleGame(game: TeamHistoryGame): ScheduleGame {
  const score = parseScorePair(game.scoreText) ?? [0, 0];
  return {
    gameId: game.gameId,
    tag: game.tag,
    status: game.status,
    statusDisplay: "Result",
    upstreamStatusId: String(game.status || "Result"),
    score1: score[0],
    score2: score[1],
    scoreText: game.scoreText,
    fullScore: game.fullScore,
    localDate: game.localDate,
    localTime: game.localTime,
    divisionLabel: canonicalDivisionLabel(game.tag) ?? game.tag,
    period: null,
    timeToGo: null,
    timeIsGo: 0,
    isLive: false,
    scheduledTime: game.scheduledTime || null,
    displayTimeZone: "Asia/Yangon",
    team1: game.team1,
    team2: game.team2,
  };
}
