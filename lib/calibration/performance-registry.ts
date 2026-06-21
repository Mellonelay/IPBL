import type { EvaluationResult } from "../backtesting/evaluator";
import { detectPredictionDrift, type DriftReport } from "./prediction-drift";

export interface PerformanceSnapshot {
  id: string;
  capturedAt: string;
  evaluation: EvaluationResult;
}

const snapshots: PerformanceSnapshot[] = [];

export function recordPerformance(id: string, evaluation: EvaluationResult): PerformanceSnapshot {
  const snapshot = {
    id,
    capturedAt: new Date().toISOString(),
    evaluation,
  };
  snapshots.push(snapshot);
  return snapshot;
}

export function listPerformanceSnapshots(): PerformanceSnapshot[] {
  return [...snapshots];
}

export function latestDriftReport(): DriftReport {
  if (snapshots.length < 2) {
    return { state: "insufficient_data", baselineAccuracy: 0, recentAccuracy: 0, delta: 0 };
  }

  const baseline = snapshots[0]?.evaluation ?? null;
  const recent = snapshots[snapshots.length - 1]?.evaluation ?? null;
  return detectPredictionDrift(baseline, recent);
}

export function clearPerformanceRegistry(): void {
  snapshots.length = 0;
}
