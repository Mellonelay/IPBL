import type { BetHistoryRow } from "./betting-intelligence.js";

export type BettingRecordStat = {
  key: string;
  count: number;
  wins: number;
  losses: number;
  other: number;
  winRate: number;
  netProfit: number;
};

export type BettingRecordRecentBet = {
  placedAt: string;
  competition: string;
  division: string;
  matchup: string;
  quarter: string;
  odds: number;
  stake: number;
  result: string;
  netProfit: number;
};

export type BettingRecordSummary = {
  source: "public/bet_history_clean.json";
  generatedAt: string;
  totalBets: number;
  period: {
    firstPlacedAt: string | null;
    lastPlacedAt: string | null;
  };
  results: {
    wins: number;
    losses: number;
    other: number;
    winRate: number;
    totalStaked: number;
    totalReturned: number;
    netProfit: number;
    roi: number;
  };
  recentWindow: {
    size: number;
    winRate: number;
    totalStaked: number;
    totalReturned: number;
    netProfit: number;
  };
  quarterStats: BettingRecordStat[];
  divisionStats: BettingRecordStat[];
  matchupStats: BettingRecordStat[];
  recentBets: BettingRecordRecentBet[];
};

type MetricRow = BetHistoryRow & {
  bet_status?: string;
  actual_payout?: string | number;
  competition?: string;
  division?: string;
};

function parsedTime(value: string): number {
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : 0;
}

function normalizeResult(value: string | undefined): "Win" | "Loss" | "Other" {
  if (value === "Win") return "Win";
  if (value === "Loss") return "Loss";
  return "Other";
}

function money(value: string | number | undefined): number {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim()) return Number(value);
  return 0;
}

function returnedAmount(row: MetricRow): number {
  const stake = Number(row.stake || 0);
  const result = normalizeResult(row.bet_status);
  if (result === "Win") {
    const payout = money(row.actual_payout);
    return payout > 0 ? payout : stake * Number(row.odds || 0);
  }
  if (result === "Other") return stake;
  return 0;
}

function profitLoss(row: MetricRow): number {
  const stake = Number(row.stake || 0);
  const result = normalizeResult(row.bet_status);
  if (result === "Win") return returnedAmount(row) - stake;
  if (result === "Other") return returnedAmount(row) - stake;
  return -stake;
}

function winRate(wins: number, count: number): number {
  if (!count) return 0;
  return round((wins / count) * 100);
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function buildStat(
  key: string,
  rows: readonly MetricRow[],
  totalReturned = rows.reduce((sum, row) => sum + returnedAmount(row), 0),
  totalStaked = rows.reduce((sum, row) => sum + Number(row.stake || 0), 0),
): BettingRecordStat {
  let wins = 0;
  let losses = 0;
  let other = 0;
  for (const row of rows) {
    const result = normalizeResult(row.bet_status);
    if (result === "Win") wins += 1;
    else if (result === "Loss") losses += 1;
    else other += 1;
  }

  return {
    key,
    count: rows.length,
    wins,
    losses,
    other,
    winRate: winRate(wins, rows.length),
    netProfit: round(totalReturned - totalStaked),
  };
}

function sortStatsBySignal(left: BettingRecordStat, right: BettingRecordStat): number {
  const profitDelta = right.netProfit - left.netProfit;
  if (profitDelta !== 0) return profitDelta;
  const winRateDelta = right.winRate - left.winRate;
  if (winRateDelta !== 0) return winRateDelta;
  const countDelta = right.count - left.count;
  if (countDelta !== 0) return countDelta;
  return left.key.localeCompare(right.key);
}

function buildRecentBets(rows: readonly MetricRow[], limit: number): BettingRecordRecentBet[] {
  return [...rows]
    .sort((left, right) => parsedTime(right.placed_at) - parsedTime(left.placed_at))
    .slice(0, limit)
    .map((row) => ({
      placedAt: row.placed_at,
      competition: row.competition || "",
      division: row.division || "",
      matchup: `${row.team_1 || "?"} vs ${row.team_2 || "?"}`,
      quarter: row.quarter || "",
      odds: Number(row.odds || 0),
      stake: Number(row.stake || 0),
      result: row.bet_status || "Unknown",
      netProfit: round(profitLoss(row)),
    }));
}

function summarizeRows(rows: readonly MetricRow[], selector: (row: MetricRow) => string | null): BettingRecordStat[] {
  const groups = new Map<string, MetricRow[]>();
  for (const row of rows) {
    const key = selector(row);
    if (!key) continue;
    const current = groups.get(key);
    if (current) current.push(row);
    else groups.set(key, [row]);
  }

  return [...groups.entries()]
    .map(([key, groupRows]) => buildStat(key, groupRows))
    .sort(sortStatsBySignal);
}

function summarizeRecentWindow(rows: readonly MetricRow[], size: number): BettingRecordSummary["recentWindow"] {
  const recent = [...rows]
    .sort((left, right) => parsedTime(right.placed_at) - parsedTime(left.placed_at))
    .slice(0, size);
  const wins = recent.filter((row) => normalizeResult(row.bet_status) === "Win").length;
  const totalStaked = recent.reduce((sum, row) => sum + Number(row.stake || 0), 0);
  const totalReturned = recent.reduce((sum, row) => sum + returnedAmount(row), 0);
  return {
    size: recent.length,
    winRate: winRate(wins, recent.length),
    totalStaked: round(totalStaked),
    totalReturned: round(totalReturned),
    netProfit: round(totalReturned - totalStaked),
  };
}

export function buildBettingRecordSummary(rows: readonly BetHistoryRow[], recentLimit = 12): BettingRecordSummary {
  const ordered = [...rows].sort((left, right) => parsedTime(left.placed_at) - parsedTime(right.placed_at));
  const totalStaked = ordered.reduce((sum, row) => sum + Number(row.stake || 0), 0);
  const totalReturned = ordered.reduce((sum, row) => sum + returnedAmount(row as MetricRow), 0);
  const wins = ordered.filter((row) => normalizeResult(row.bet_status) === "Win").length;
  const losses = ordered.filter((row) => normalizeResult(row.bet_status) === "Loss").length;
  const other = ordered.length - wins - losses;

  return {
    source: "public/bet_history_clean.json",
    generatedAt: new Date().toISOString(),
    totalBets: ordered.length,
    period: {
      firstPlacedAt: ordered[0]?.placed_at ?? null,
      lastPlacedAt: ordered.at(-1)?.placed_at ?? null,
    },
    results: {
      wins,
      losses,
      other,
      winRate: winRate(wins, ordered.length),
      totalStaked: round(totalStaked),
      totalReturned: round(totalReturned),
      netProfit: round(totalReturned - totalStaked),
      roi: round(totalStaked ? ((totalReturned - totalStaked) / totalStaked) * 100 : 0),
    },
    recentWindow: summarizeRecentWindow(ordered, Math.max(1, recentLimit)),
    quarterStats: summarizeRows(ordered, (row) => row.quarter || null),
    divisionStats: summarizeRows(ordered, (row) => row.division || null),
    matchupStats: summarizeRows(ordered, (row) => {
      if (!row.team_1 || !row.team_2) return null;
      return `${row.team_1} vs ${row.team_2}`;
    }),
    recentBets: buildRecentBets(ordered, recentLimit),
  };
}
