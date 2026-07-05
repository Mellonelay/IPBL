import { buildAnalysisEngineFromRepository } from "../../../lib/server/analysis-engine.js";
import type { BettingRecordSummary } from "../../../lib/server/betting-record-summary.js";

export type GraphifySkillName = "graphify-intent" | "graphify-temporal";

export type GraphifyIntelligenceSignal = {
  gameId: number;
  patternId: string;
  description: string;
  confidence: number;
  evidence: readonly string[];
  suggestedBias: "OVER" | "UNDER" | "MONITOR" | null;
};

export type GraphifyIntelligencePacket = {
  layer: "graphify-betting-intelligence";
  generatedAt: string;
  analysisEngineContract: string;
  skills: readonly GraphifySkillName[];
  bettingRecord: BettingRecordSummary | null;
  signals: readonly GraphifyIntelligenceSignal[];
  summary: {
    signalCount: number;
    strongSignals: number;
    recommendedBias: "OVER" | "UNDER" | "MONITOR" | "HOLD";
  };
};

export type BuildGraphifyIntelligencePacketInput = {
  generatedAt: string;
  bettingRecord?: BettingRecordSummary | null;
  signals: readonly GraphifyIntelligenceSignal[];
};

export function buildGraphifyIntelligencePacket(input: BuildGraphifyIntelligencePacketInput): GraphifyIntelligencePacket {
  const analysisEngine = buildAnalysisEngineFromRepository();
  const skills = analysisEngine.skills
    .map((skill) => skill.name)
    .filter((name): name is GraphifySkillName => name === "graphify-intent" || name === "graphify-temporal");
  const strongSignals = input.signals.filter((signal) => signal.confidence >= 0.8).length;
  const recommendedBias = signalBias(input.signals);

  return {
    layer: "graphify-betting-intelligence",
    generatedAt: input.generatedAt,
    analysisEngineContract: analysisEngine.outputs.contract,
    skills,
    bettingRecord: input.bettingRecord ?? null,
    signals: [...input.signals],
    summary: {
      signalCount: input.signals.length,
      strongSignals,
      recommendedBias,
    },
  };
}

function signalBias(signals: readonly GraphifyIntelligenceSignal[]): "OVER" | "UNDER" | "MONITOR" | "HOLD" {
  if (!signals.length) return "HOLD";
  let over = 0;
  let under = 0;
  let monitor = 0;
  for (const signal of signals) {
    if (signal.suggestedBias === "OVER") over += signal.confidence;
    else if (signal.suggestedBias === "UNDER") under += signal.confidence;
    else monitor += signal.confidence * 0.5;
  }
  if (over >= under && over >= monitor) return "OVER";
  if (under >= over && under >= monitor) return "UNDER";
  return "MONITOR";
}
