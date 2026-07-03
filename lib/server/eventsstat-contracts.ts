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
  marketKey: string;
  prices: number[];
  timestamps: Array<number | null>;
};

export type ScoreHistoryPoint = {
  index: number;
  raw: unknown;
  score1: number | null;
  score2: number | null;
  period: number | null;
  timestamp: number | null;
};

export type MarketSelectionPoint = {
  marketKey: string;
  seriesIndex: number;
  pointIndex: number;
  price: number;
  capturedAtMs: number | null;
  capturedAt: string | null;
  selectionKey: string;
};

export type ScoreHistoryAlignmentPoint = {
  index: number;
  capturedAtMs: number | null;
  capturedAt: string | null;
  period: number | null;
  periodName: string | null;
  score1: number | null;
  score2: number | null;
  deltaScore1: number | null;
  deltaScore2: number | null;
  elapsedMsSincePrevious: number | null;
  isPeriodTransition: boolean;
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

function timestampArray(value: unknown): Array<number | null> {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => {
    if (typeof entry === "number" && Number.isFinite(entry)) return entry;
    if (typeof entry === "string") {
      const match = entry.match(/\/Date\((\d+)\)\//);
      if (match) return Number(match[1]);
      const parsed = Date.parse(entry);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  });
}

function firstNumberFromKeys(source: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const value = finiteNumber(source[key]);
    if (value !== null) return value;
  }
  return null;
}

function firstNumberFromRecords(sources: Array<Record<string, unknown> | null>, keys: string[]): number | null {
  for (const source of sources) {
    if (!source) continue;
    const value = firstNumberFromKeys(source, keys);
    if (value !== null) return value;
  }
  return null;
}

function isoFromTimestamp(timestamp: number | null): string | null {
  return timestamp === null ? null : new Date(timestamp).toISOString();
}

function parseCapturedAt(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const match = value.match(/\/Date\((\d+)\)\//);
    if (match) return Number(match[1]);
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function parseEventsStatHistoryGraph(payload: unknown): {
  markets: MarketSeries[];
  odds: OddsMovementPoint[];
  marketSelections: MarketSelectionPoint[];
  scoreHistory: ScoreHistoryPoint[];
  scoreAlignment: ScoreHistoryAlignmentPoint[];
} {
  const root = record(payload);
  if (!root || root.Success !== true) throw new Error("eventsstat_history_graph_unsuccessful");
  const value = record(root.Value);
  if (!value) throw new Error("eventsstat_history_graph_value_missing");
  const eg = Array.isArray(value.EG) ? value.EG : [];
  const sh = Array.isArray(value.SH) ? value.SH : [];
  if (eg.length === 0 && sh.length === 0) throw new Error("eventsstat_history_graph_empty");

  const markets: MarketSeries[] = [];
  const odds: OddsMovementPoint[] = [];
  const marketSelections: MarketSelectionPoint[] = [];
  eg.forEach((entry, seriesIndex) => {
    const row = record(entry);
    const event = record(row?.E);
    const prices = numberArray(row?.C);
    const timestamps = timestampArray(row?.S);
    const marketType = finiteNumber(event?.T);
    const marketGroup = finiteNumber(event?.G);
    const marketSubgroup = finiteNumber(event?.GS);
    const marketKey = [
      marketType === null ? "na" : marketType,
      marketGroup === null ? "na" : marketGroup,
      marketSubgroup === null ? "na" : marketSubgroup,
    ].join(":");
    if (prices.length === 0) return;
    markets.push({ seriesIndex, marketType, marketGroup, marketSubgroup, marketKey, prices, timestamps });
    prices.forEach((price, pointIndex) => {
      odds.push({ seriesIndex, pointIndex, marketType, marketGroup, marketSubgroup, price });
      const capturedAtMs = timestamps[pointIndex] ?? null;
      marketSelections.push({
        marketKey,
        seriesIndex,
        pointIndex,
        price,
        capturedAtMs,
        capturedAt: isoFromTimestamp(capturedAtMs),
        selectionKey: `${marketKey}:${pointIndex}`,
      });
    });
  });

  const scoreHistory = sh.map((entry, index) => {
    const row = record(entry) ?? {};
    const dtUpdate = parseCapturedAt(row.DtUpdate);
    const fullScore = record(row.FullScore);
    const periodScore = record(row.PeriodScore);
    const subScore = record(row.SubScore);
    return {
      index,
      raw: entry,
      score1: firstNumberFromRecords([fullScore, periodScore, subScore, row], ["S1", "score1", "Score1", "A", "H"]),
      score2: firstNumberFromRecords([fullScore, periodScore, subScore, row], ["S2", "score2", "Score2", "B", "G"]),
      period: firstNumberFromKeys(row, ["P", "Period", "period", "CP"]),
      timestamp: dtUpdate ?? firstNumberFromKeys(row, ["T", "TS", "time", "timestamp"]),
    };
  });

  const scoreAlignment: ScoreHistoryAlignmentPoint[] = scoreHistory.map((point, index) => {
    const previous = index > 0 ? scoreHistory[index - 1] : null;
    const capturedAtMs = parseCapturedAt((record(sh[index]) ?? {}).DtUpdate ?? point.timestamp);
    return {
      index,
      capturedAtMs,
      capturedAt: isoFromTimestamp(capturedAtMs),
      period: point.period,
      periodName: typeof (record(sh[index]) ?? {}).PeriodName === "string" ? String((record(sh[index]) ?? {}).PeriodName) : null,
      score1: point.score1,
      score2: point.score2,
      deltaScore1: previous && previous.score1 !== null && point.score1 !== null ? point.score1 - previous.score1 : null,
      deltaScore2: previous && previous.score2 !== null && point.score2 !== null ? point.score2 - previous.score2 : null,
      elapsedMsSincePrevious: previous ? (capturedAtMs !== null && previous.timestamp !== null ? capturedAtMs - previous.timestamp : null) : null,
      isPeriodTransition: previous ? previous.period !== point.period : false,
    };
  });

  return { markets, odds, marketSelections, scoreHistory, scoreAlignment };
}
