import type { DriftReport } from "../calibration/prediction-drift";

export type RemediationAction = "none" | "monitor" | "reduce_confidence" | "recalibrate_weights";

export interface RemediationPlan {
  action: RemediationAction;
  confidenceMultiplier: number;
  message: string;
}

export function createDriftRemediationPlan(drift: DriftReport): RemediationPlan {
  if (drift.state === "insufficient_data") {
    return { action: "monitor", confidenceMultiplier: 1, message: "Insufficient backtest history for remediation." };
  }

  if (drift.state === "stable") {
    return { action: "none", confidenceMultiplier: 1, message: "Prediction accuracy is stable." };
  }

  if (drift.state === "watch") {
    return { action: "reduce_confidence", confidenceMultiplier: 0.94, message: "Prediction accuracy is weakening; confidence should be reduced." };
  }

  return { action: "recalibrate_weights", confidenceMultiplier: 0.88, message: "Prediction drift detected; recalibrate signal weights." };
}
