import type { PredictionOutput } from "../prediction/prediction-engine";

const predictions = new Map<string, PredictionOutput>();

export function savePrediction(prediction: PredictionOutput): void {
  predictions.set(String(prediction.gameId), prediction);
}

export function getPrediction(gameId: string | number): PredictionOutput | undefined {
  return predictions.get(String(gameId));
}

export function getPredictions(): PredictionOutput[] {
  return Array.from(predictions.values());
}

export function clearPredictions(): void {
  predictions.clear();
}
