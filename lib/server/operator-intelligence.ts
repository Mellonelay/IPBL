import { readFileSync } from "node:fs";

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
      overall: {
        bets: number;
        wins: number;
        losses: number;
        win_rate: number;
        stake_total: number;
        payout_total: number;
        net_profit: number;
        avg_odds: number;
        median_stake: number;
        profit_factor: number;
      };
      bestQuarter: {
        name: string;
        bets: number;
        wins: number;
        losses: number;
        win_rate: number;
        stake_total: number;
        payout_total: number;
        net_profit: number;
        avg_odds: number;
        median_stake: number;
        profit_factor: number;
      };
      worstQuarter: {
        name: string;
        bets: number;
        wins: number;
        losses: number;
        win_rate: number;
        stake_total: number;
        payout_total: number;
        net_profit: number;
        avg_odds: number;
        median_stake: number;
        profit_factor: number;
      };
      topRedFlags: readonly string[];
      theoryCall: string;
    };
    rules: {
      safeQuarters: readonly string[];
      dangerousQuarters: readonly string[];
      safeDivisions: readonly string[];
      dangerousDivisions: readonly string[];
      safeOddsRanges: readonly string[];
      dangerousOddsRanges: readonly string[];
      safeHours: readonly number[];
      dangerousHours: readonly number[];
    };
  };
};

const OPERATOR_INTELLIGENCE_ARTIFACT = JSON.parse(
  readFileSync(new URL("../../artifacts/operator-intelligence/operator-intelligence.json", import.meta.url), "utf8")
) as OperatorIntelligenceReport;

export function buildOperatorIntelligenceReport(): OperatorIntelligenceReport {
  return OPERATOR_INTELLIGENCE_ARTIFACT;
}
