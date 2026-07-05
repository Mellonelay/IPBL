import type { GameReplay, ReplayEvent } from "./replay-engine.js";
import { replayEventTotal } from "./replay-engine.js";

export type LiveQuarterPattern = {
  patternId: string;
  description: string;
  confidence: number;
  evidence: string[];
  suggestedBias: "OVER" | "UNDER" | "MONITOR" | null;
};

export type LiveQuarterPatternSummary = {
  patterns: LiveQuarterPattern[];
  quarterCount: number;
  oddsCount: number;
};

type QuarterPoint = {
  quarter: number;
  first: ReplayEvent;
  last: ReplayEvent;
  firstTotal: number;
  lastTotal: number;
  pace: number;
};

type OddsPoint = {
  quarter: number | null;
  capturedAt: string;
  line: number | null;
  overOdds: number | null;
  underOdds: number | null;
  bookmaker: string | null;
};

function time(value: string): number {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function number(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function oddsPoint(event: ReplayEvent): OddsPoint | null {
  if (event.kind !== "odds") return null;
  return {
    quarter: number((event as Record<string, unknown>).quarter),
    capturedAt: event.capturedAt,
    line: number((event as Record<string, unknown>).line),
    overOdds: number((event as Record<string, unknown>).overOdds),
    underOdds: number((event as Record<string, unknown>).underOdds),
    bookmaker: typeof (event as Record<string, unknown>).bookmaker === "string"
      ? (event as Record<string, unknown>).bookmaker
      : null,
  };
}

function quarterPoints(replay: GameReplay): QuarterPoint[] {
  const grouped = new Map<number, ReplayEvent[]>();
  for (const event of replay.timeline) {
    if (event.kind !== "quarter") continue;
    if (!Number.isFinite(event.quarter ?? Number.NaN)) continue;
    const list = grouped.get(Number(event.quarter)) ?? [];
    list.push(event);
    grouped.set(Number(event.quarter), list);
  }

  const points: QuarterPoint[] = [];
  for (const [quarter, events] of grouped.entries()) {
    const sorted = [...events].sort((left, right) => {
      const delta = time(left.capturedAt) - time(right.capturedAt);
      if (delta !== 0) return delta;
      return (replayEventTotal(left) ?? 0) - (replayEventTotal(right) ?? 0);
    });
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const firstTotal = replayEventTotal(first);
    const lastTotal = replayEventTotal(last);
    if (firstTotal === null || lastTotal === null) continue;
    const elapsedMinutes = Math.max((time(last.capturedAt) - time(first.capturedAt)) / 60000, 1);
    points.push({
      quarter,
      first,
      last,
      firstTotal,
      lastTotal,
      pace: Number(((lastTotal - firstTotal) / elapsedMinutes).toFixed(2)),
    });
  }
  return points.sort((left, right) => left.quarter - right.quarter);
}

function oddsPoints(replay: GameReplay): OddsPoint[] {
  return replay.timeline.flatMap((event) => {
    const point = oddsPoint(event);
    return point ? [point] : [];
  }).sort((left, right) => time(left.capturedAt) - time(right.capturedAt));
}

function evidenceForQuarter(point: QuarterPoint, odds: OddsPoint[]): string[] {
  const evidence = [
    `quarter:${point.quarter}:first:${point.firstTotal}@${point.first.capturedAt}`,
    `quarter:${point.quarter}:last:${point.lastTotal}@${point.last.capturedAt}`,
  ];
  const matchingOdds = odds.find((entry) => entry.quarter === point.quarter) ?? null;
  if (matchingOdds) {
    evidence.push(
      `odds:${point.quarter}:${matchingOdds.line ?? "n/a"}:${matchingOdds.overOdds ?? "n/a"}/${matchingOdds.underOdds ?? "n/a"}@${matchingOdds.capturedAt}`,
    );
  }
  return evidence;
}

function confidenceForMomentum(q1: QuarterPoint, q2: QuarterPoint, odds: OddsPoint[]): number {
  let confidence = 0.54;
  if (q1.firstTotal < 20) confidence += 0.08;
  if (q2.firstTotal >= 20) confidence += 0.08;
  if (q1.pace < q2.pace) confidence += 0.12;
  if (q2.pace >= q1.pace * 1.25) confidence += 0.1;
  if (odds.some((entry) => entry.quarter === 1 || entry.quarter === 2)) confidence += 0.04;
  return Number(Math.min(confidence, 0.96).toFixed(2));
}

function buildMomentumPattern(q1: QuarterPoint, q2: QuarterPoint, odds: OddsPoint[]): LiveQuarterPattern | null {
  const underToOver = q1.firstTotal < 20 && q2.firstTotal >= 20;
  const acceleration = q1.pace < q2.pace || q2.pace >= q1.pace * 1.25;
  if (!underToOver || !acceleration) return null;
  return {
    patternId: "q1-slow-q2-fast",
    description: "Q1 started slow and Q2 accelerated from the replay timeline.",
    confidence: confidenceForMomentum(q1, q2, odds),
    evidence: [...evidenceForQuarter(q1, odds), ...evidenceForQuarter(q2, odds)],
    suggestedBias: "OVER",
  };
}

function buildUnderOverPattern(q1: QuarterPoint, q2: QuarterPoint, odds: OddsPoint[]): LiveQuarterPattern | null {
  if (!(q1.firstTotal < 20 && q2.firstTotal >= 20)) return null;
  const confidence = Number(
    Math.min(0.56 + (q1.firstTotal < 16 ? 0.12 : 0) + (q2.firstTotal >= 24 ? 0.12 : 0) + (odds.length > 0 ? 0.08 : 0), 0.94).toFixed(2),
  );
  return {
    patternId: "q1-under-q2-over",
    description: "Quarter 1 opened below the scoring threshold and Quarter 2 moved above it.",
    confidence,
    evidence: [...evidenceForQuarter(q1, odds), ...evidenceForQuarter(q2, odds)],
    suggestedBias: "MONITOR",
  };
}

export function buildLiveQuarterPatterns(replay: GameReplay): LiveQuarterPattern[] {
  const quarters = quarterPoints(replay);
  const odds = oddsPoints(replay);
  const q1 = quarters.find((point) => point.quarter === 1) ?? null;
  const q2 = quarters.find((point) => point.quarter === 2) ?? null;
  const patterns: LiveQuarterPattern[] = [];

  if (q1 && q2) {
    const momentum = buildMomentumPattern(q1, q2, odds);
    if (momentum) patterns.push(momentum);
    const underOver = buildUnderOverPattern(q1, q2, odds);
    if (underOver) patterns.push(underOver);
  }

  return patterns;
}

export function buildLiveQuarterPatternSummary(replay: GameReplay): LiveQuarterPatternSummary {
  return {
    patterns: buildLiveQuarterPatterns(replay),
    quarterCount: replay.timeline.filter((event) => event.kind === "quarter").length,
    oddsCount: replay.timeline.filter((event) => event.kind === "odds").length,
  };
}
