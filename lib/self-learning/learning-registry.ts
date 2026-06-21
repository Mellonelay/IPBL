import type { DriftReport } from "../calibration/prediction-drift";
import type { SignalWeights } from "../calibration/signal-weighting";

export interface LearningSnapshot {
  id: string;
  capturedAt: string;
  weights: SignalWeights;
  drift: DriftReport;
  notes: string[];
}

const snapshots: LearningSnapshot[] = [];

export function recordLearningSnapshot(snapshot: Omit<LearningSnapshot, "capturedAt">): LearningSnapshot {
  const entry: LearningSnapshot = {
    ...snapshot,
    capturedAt: new Date().toISOString(),
  };
  snapshots.push(entry);
  return entry;
}

export function listLearningSnapshots(): LearningSnapshot[] {
  return [...snapshots];
}

export function latestLearningSnapshot(): LearningSnapshot | undefined {
  return snapshots.at(-1);
}

export function clearLearningRegistry(): void {
  snapshots.length = 0;
}
