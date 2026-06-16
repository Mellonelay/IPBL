export type PatternDiscoveryResult = {
  patternId: string;
  description: string;
  confidence: number;
  supportingGames: number[];
  ruleSignature: string;
};

type BetRow = {
  raw_main_game_id?: number;
  quarter?: string;
  odds?: number;
  stake?: number;
  bet_status?: string;
  actual_payout?: string | number;
  team_1?: string;
  team_2?: string;
};

type Aggregate = {
  key: string;
  label: string;
  count: number;
  wins: number;
  net: number;
  games: Map<number, number>;
};

function quarterNumber(value: string | undefined): number | null {
  const match = value?.match(/^Q([1-4])$/i);
  return match ? Number.parseInt(match[1], 10) : null;
}

function money(value: string | number | undefined): number {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim()) return Number(value);
  return 0;
}

function netPayout(row: BetRow): number {
  const stake = Number(row.stake || 0);
  return row.bet_status === "Win" ? money(row.actual_payout) - stake : -stake;
}

function oddsBand(odds: number | undefined): string | null {
  if (!Number.isFinite(odds)) return null;
  const lower = Math.floor((odds as number) * 5) / 5;
  const upper = lower + 0.19;
  return `${lower.toFixed(2)}-${upper.toFixed(2)}`;
}

function recordAggregate(map: Map<string, Aggregate>, key: string, label: string, row: BetRow): void {
  const current = map.get(key) ?? {
    key,
    label,
    count: 0,
    wins: 0,
    net: 0,
    games: new Map<number, number>(),
  };
  current.count += 1;
  if (row.bet_status === "Win") current.wins += 1;
  const contribution = netPayout(row);
  current.net += contribution;
  const gameId = row.raw_main_game_id;
  if (Number.isFinite(gameId)) {
    current.games.set(gameId as number, (current.games.get(gameId as number) ?? 0) + contribution);
  }
  map.set(key, current);
}

function confidenceFromAggregate(aggregate: Aggregate): number {
  const winRate = aggregate.count === 0 ? 0 : aggregate.wins / aggregate.count;
  const netScale = Math.min(Math.abs(aggregate.net) / 3_000_000, 1);
  return Number((0.35 + winRate * 0.4 + netScale * 0.25).toFixed(3));
}

function supportingGamesFromAggregate(aggregate: Aggregate): number[] {
  return [...aggregate.games.entries()]
    .sort((left, right) => {
      const delta = right[1] - left[1];
      if (delta !== 0) return delta;
      return left[0] - right[0];
    })
    .map(([gameId]) => gameId)
    .filter((gameId, index, all) => all.indexOf(gameId) === index)
    .slice(0, 5);
}

function quarterAggregate(bets: BetRow[]): Aggregate | null {
  const aggregates = new Map<string, Aggregate>();
  for (const bet of bets) {
    const quarter = bet.quarter ?? "";
    if (!quarterNumber(quarter)) continue;
    recordAggregate(aggregates, quarter, quarter, bet);
  }
  return [...aggregates.values()]
    .filter((aggregate) => aggregate.count >= 20 && aggregate.net > 0)
    .sort((left, right) => {
      const netDelta = right.net - left.net;
      if (netDelta !== 0) return netDelta;
      const countDelta = right.count - left.count;
      if (countDelta !== 0) return countDelta;
      return left.key.localeCompare(right.key);
    })[0] ?? null;
}

function oddsAggregate(bets: BetRow[]): Aggregate | null {
  const aggregates = new Map<string, Aggregate>();
  for (const bet of bets) {
    const band = oddsBand(Number(bet.odds));
    if (!band) continue;
    recordAggregate(aggregates, band, band, bet);
  }
  return [...aggregates.values()]
    .filter((aggregate) => aggregate.count >= 20 && aggregate.net > 0)
    .sort((left, right) => {
      const netDelta = right.net - left.net;
      if (netDelta !== 0) return netDelta;
      const countDelta = right.count - left.count;
      if (countDelta !== 0) return countDelta;
      return left.key.localeCompare(right.key);
    })[0] ?? null;
}

function matchupAggregate(bets: BetRow[], memoryIndex: Record<string, unknown>): Aggregate | null {
  const aggregates = new Map<string, Aggregate>();
  const memoryMatchups = (memoryIndex.matchups && typeof memoryIndex.matchups === "object")
    ? memoryIndex.matchups as Record<string, { label?: string }>
    : {};

  for (const bet of bets) {
    const leftTeam = typeof bet.team_1 === "string" ? bet.team_1 : "";
    const rightTeam = typeof bet.team_2 === "string" ? bet.team_2 : "";
    if (!leftTeam || !rightTeam) continue;
    const label = `${leftTeam} vs ${rightTeam}`;
    const memoryKey = Object.entries(memoryMatchups).find(([, value]) => value?.label === label)?.[0] ?? label;
    recordAggregate(aggregates, memoryKey, label, bet);
  }

  return [...aggregates.values()]
    .filter((aggregate) => aggregate.count >= 3 && aggregate.net > 0)
    .sort((left, right) => {
      const netDelta = right.net - left.net;
      if (netDelta !== 0) return netDelta;
      const countDelta = right.count - left.count;
      if (countDelta !== 0) return countDelta;
      return left.label.localeCompare(right.label);
    })[0] ?? null;
}

function formatMoney(value: number): string {
  return value.toFixed(2).replace(/\.00$/, "");
}

function buildQuarterPattern(aggregate: Aggregate): PatternDiscoveryResult {
  return {
    patternId: `quarter-${aggregate.key}-positive`,
    description: "Q4 bets are the strongest quarter by net profit.",
    confidence: confidenceFromAggregate(aggregate),
    supportingGames: supportingGamesFromAggregate(aggregate),
    ruleSignature: `quarter:${aggregate.key}:count=${aggregate.count}:wins=${aggregate.wins}:net=${formatMoney(aggregate.net)}`,
  };
}

function buildOddsPattern(aggregate: Aggregate): PatternDiscoveryResult {
  return {
    patternId: `odds-${aggregate.key}-positive`,
    description: `Odds in the ${aggregate.key} band are the strongest positive price band.`,
    confidence: confidenceFromAggregate(aggregate),
    supportingGames: supportingGamesFromAggregate(aggregate),
    ruleSignature: `odds:${aggregate.key}:count=${aggregate.count}:wins=${aggregate.wins}:net=${formatMoney(aggregate.net)}`,
  };
}

function buildMatchupPattern(aggregate: Aggregate): PatternDiscoveryResult {
  return {
    patternId: "matchup-repeat-positive",
    description: `Repeated matchups are strongest for ${aggregate.label}.`,
    confidence: confidenceFromAggregate(aggregate),
    supportingGames: supportingGamesFromAggregate(aggregate),
    ruleSignature: `matchup:${aggregate.label}:count=${aggregate.count}:wins=${aggregate.wins}:net=${formatMoney(aggregate.net)}`,
  };
}

export function discoverPatterns(bets: BetRow[], memoryIndex: Record<string, unknown>): PatternDiscoveryResult[] {
  const patterns: PatternDiscoveryResult[] = [];

  const quarter = quarterAggregate(bets);
  if (quarter) patterns.push(buildQuarterPattern(quarter));

  const odds = oddsAggregate(bets);
  if (odds) patterns.push(buildOddsPattern(odds));

  const matchup = matchupAggregate(bets, memoryIndex);
  if (matchup) patterns.push(buildMatchupPattern(matchup));

  return patterns;
}
