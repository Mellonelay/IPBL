import { operatorRules, operatorSummary } from "../../src/operator/data.ts";

export const OPERATOR_INTELLIGENCE_ARTIFACT_PATH = "artifacts/operator-intelligence/operator-intelligence.json";

export type OperatorIntelligenceReport = {
  schema: "ipbl.operator-intelligence.v1";
  phase: 12;
  status: "seeded";
  readOnly: true;
  recommendations: {
    enabled: false;
    mode: "evidence_only";
    reason: string;
  };
  evidence: {
    recorder: {
      coverage: "repository-backed";
      sources: string[];
    };
    h2h: {
      coverage: "repository-backed";
      sources: string[];
    };
    odds: {
      coverage: "repository-backed";
      sources: string[];
    };
    backtests: {
      coverage: "repository-backed";
      overall: typeof operatorSummary.overall;
      bestQuarter: typeof operatorSummary.best_quarter;
      worstQuarter: typeof operatorSummary.worst_quarter;
      topRedFlags: readonly string[];
      theoryCall: string;
    };
    rules: typeof operatorRules;
  };
};

function readOnlySources(): OperatorIntelligenceReport["evidence"] {
  return {
    recorder: {
      coverage: "repository-backed",
      sources: [
        "lib/server/quarter-state-recorder.ts",
        "tests/quarter-state-recorder.test.ts",
        "lib/server/runtime-agent-graph.ts",
        "tests/runtime-agent-graph.test.ts",
      ],
    },
    h2h: {
      coverage: "repository-backed",
      sources: [
        "docs/H2H_FRESHNESS_REPAIR.md",
        "docs/H2H_CONTINUITY_REPAIR.md",
        "tests/team-history-official-live.test.ts",
        "tests/team-history-official-recent-calendar.test.ts",
      ],
    },
    odds: {
      coverage: "repository-backed",
      sources: [
        "lib/server/odds-movement.ts",
        "tests/odds-movement.test.ts",
        "src/operator/engine.ts",
      ],
    },
    backtests: {
      coverage: "repository-backed",
      overall: operatorSummary.overall,
      bestQuarter: operatorSummary.best_quarter,
      worstQuarter: operatorSummary.worst_quarter,
      topRedFlags: operatorSummary.top_red_flags,
      theoryCall: operatorSummary.theory_call,
    },
    rules: operatorRules,
  };
}

export function buildOperatorIntelligenceReport(): OperatorIntelligenceReport {
  return {
    schema: "ipbl.operator-intelligence.v1",
    phase: 12,
    status: "seeded",
    readOnly: true,
    recommendations: {
      enabled: false,
      mode: "evidence_only",
      reason: "Holdout validation remains blocked until the recorder, H2H, odds, and backtest evidence are all release-grade.",
    },
    evidence: readOnlySources(),
  };
}
