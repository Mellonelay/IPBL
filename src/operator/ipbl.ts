/**
 * IPBL operator surface — barrel for `import { … } from "./operator/ipbl"`.
 * Implementation lives in `engine.ts`, `data.ts`, and `mock.ts`.
 */
export {
    analyzeQuarterFlow,
    evaluateOperatorDecision,
    getHistoricalContext,
    getScoreboardAnalysis,
    matchupKey,
    normalizeTeam,
    parseH2HQuarterMatrix,
    type OperatorDecision,
    type QuarterFlowAnalysis,
    type QuarterKey,
    type ScoreboardAnalysis,
} from "./engine";

export {
    operatorRules,
    operatorSummary,
    type MetricSummary,
    type RiskEntry,
} from "./data";

export { demoLiveInsight, demoResultInsight, type MockInsight } from "./mock";
