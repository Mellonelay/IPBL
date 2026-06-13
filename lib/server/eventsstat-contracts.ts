export type EventsStatGraphEnvelope = {
  Id?: number;
  Success?: boolean;
  Error?: string;
  ErrorCode?: number;
  Guid?: string;
  Value?: {
    EG?: unknown[];
    SH?: unknown[];
  };
};

export type OddsMovementPoint = {
  seriesIndex: number;
  pointIndex: number;
  marketType: number | null;
  marketGroup: number | null;
  marketSubgroup: number | null;
  price: number;
};

export type MarketSeries = {
  seriesIndex: number;
  marketType: number | null;
  marketGroup: number | null;
  marketSubgroup: number | null;
  prices: number[];
};

export type ScoreHistoryPoint = {
  index: number;
  raw: unknown;
  score1: number | null;
  score2: number | null;
  period: number | null;
  timestamp: number | null;
};

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function numberArray(value: unknown): number[] {
  return Array.isArray(value) ? value.filter((entry): entry is number => typeof entry === "number" && Number.isFinite(entry)) : [];
}

function firstNumberFromKeys(source: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const value = finiteNumber(source[key]);
    if (value !== null) return value;
  }
  return null;
}

export function parseEventsStatHistoryGraph(payload: unknown): { markets: MarketSeries[]; odds: OddsMovementPoint[]; scoreHistory: ScoreHistoryPoint[] } {
  const root = record(payload);
  if (!root || root.Success !== true) throw new Error("eventsstat_history_graph_unsuccessful");
  const value = record(root.Value);
  if (!value) throw new Error("eventsstat_history_graph_value_missing");
  const eg = Array.isArray(value.EG) ? value.EG : [];
  const sh = Array.isArray(value.SH) ? value.SH : [];
  if (eg.length === 0 && sh.length === 0) throw new Error("eventsstat_history_graph_empty");

  const markets: MarketSeries[] = [];
  const odds: OddsMovementPoint[] = [];
  eg.forEach((entry, seriesIndex) => {
    const row = record(entry);
    const event = record(row?.E);
    const prices = numberArray(row?.C);
    const marketType = finiteNumber(event?.T);
    const marketGroup = finiteNumber(event?.G);
    const marketSubgroup = finiteNumber(event?.GS);
    if (prices.length === 0) return;
    markets.push({ seriesIndex, marketType, marketGroup, marketSubgroup, prices });
    prices.forEach((price, pointIndex) => odds.push({ seriesIndex, pointIndex, marketType, marketGroup, marketSubgroup, price }));
  });

  const scoreHistory = sh.map((entry, index) => {
    const row = record(entry) ?? {};
    return {
      index,
      raw: entry,
      score1: firstNumberFromKeys(row, ["S1", "score1", "Score1", "A", "H"]),
      score2: firstNumberFromKeys(row, ["S2", "score2", "Score2", "B", "G"]),
      period: firstNumberFromKeys(row, ["P", "period", "CP"]),
      timestamp: firstNumberFromKeys(row, ["T", "TS", "time", "timestamp"]),
    };
  });

  return { markets, odds, scoreHistory };
}
