import type { GameReplay, ReplayEvent } from "./replay-engine.js";

export type BetHistoryRow = {
  slip_id: number;
  placed_at: string;
  raw_main_game_id: number;
  quarter: string;
  odds: number;
  bet_status: string;
  stake: number;
  actual_payout: string | number;
  team_1?: string;
  team_2?: string;
  market_raw?: string;
};

export type BettingMemoryIndex = Record<string, unknown>;

export type BettingIntelligenceEntry = {
  betId: number;
  gameId: number;
  quarter: string;
  odds: number;
  result: string;
  profitLoss: number;
  contextSnapshot: ReplayEvent;
};

function quarterNumber(value: string): number | null {
  const match = value.match(/^Q([1-4])$/i);
  return match ? Number.parseInt(match[1], 10) : null;
}

function time(value: string): number {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function resultPayout(row: BetHistoryRow): number {
  const payout = typeof row.actual_payout === "number" ? row.actual_payout : Number(row.actual_payout || 0);
  const stake = Number(row.stake || 0);
  return row.bet_status === "Win" ? payout - stake : -stake;
}

function replayRank(kind: ReplayEvent["kind"]): number {
  if (kind === "quarter") return 0;
  if (kind === "odds") return 1;
  return 2;
}

export function selectReplaySnapshot(replay: GameReplay, placedAt: string, quarter: string): ReplayEvent {
  const quarterNo = quarterNumber(quarter);
  const candidates = replay.timeline.filter((event) => time(event.capturedAt) <= time(placedAt));
  const preferred = quarterNo === null
    ? candidates
    : candidates.filter((event) => event.quarter === quarterNo);
  const source = preferred.length ? preferred : candidates;
  if (source.length === 0) throw new Error(`No replay snapshot for game ${replay.gameId}`);
  return [...source].sort((left, right) => {
    const delta = time(left.capturedAt) - time(right.capturedAt);
    if (delta !== 0) return delta;
    const kindDelta = replayRank(left.kind) - replayRank(right.kind);
    if (kindDelta !== 0) return kindDelta;
    return Number(left.quarter ?? 0) - Number(right.quarter ?? 0);
  }).at(-1) as ReplayEvent;
}

export function buildBettingIntelligenceEntries(
  bets: BetHistoryRow[],
  replays: Map<number, GameReplay>,
  _memoryIndex?: BettingMemoryIndex,
): BettingIntelligenceEntry[] {
  return bets.map((bet) => {
    const replay = replays.get(bet.raw_main_game_id);
    if (!replay) throw new Error(`Missing replay for game ${bet.raw_main_game_id}`);
    const contextSnapshot = selectReplaySnapshot(replay, bet.placed_at, bet.quarter);
    return {
      betId: bet.slip_id,
      gameId: bet.raw_main_game_id,
      quarter: bet.quarter,
      odds: bet.odds,
      result: bet.bet_status,
      profitLoss: resultPayout(bet),
      contextSnapshot,
    };
  });
}
