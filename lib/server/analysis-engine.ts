export const ANALYSIS_ENGINE_ARTIFACT_PATH = "artifacts/analysis-engine/ipbl-analysis-engine.json";

export type AnalysisEngineReport = {
  schema: "ipbl.analysis-engine.v1";
  status: "materialized";
  readOnly: true;
  scope: "backend_analysis_boundary";
  summary: string;
  skills: readonly {
    name: "graphify-intent" | "graphify-temporal" | "code-review-graph";
    surface: "backend_analysis";
    purpose: string;
    evidence: readonly string[];
  }[];
  inputs: {
    graphify: {
      graphReport: string;
      intelligenceRoadmap: string;
      phaseRoadmap: string;
      godNodeLedger: string;
    };
    c9: {
      implementationScope: string;
      proofSummary: string;
      planManifest: string;
    };
    operatorIntelligence: {
      artifact: string;
      refreshPlan: string;
    };
    codeReviewGraph: {
      database: string;
      visualizationCatalog: string;
    };
  };
  outputs: {
    artifact: string;
    contract: string;
  };
};

const ANALYSIS_ENGINE_REPORT: AnalysisEngineReport = {
  schema: "ipbl.analysis-engine.v1",
  status: "materialized",
  readOnly: true,
  scope: "backend_analysis_boundary",
  summary:
    "Read-only backend analysis layer that formalizes how repository evidence, Graphify reasoning, C9 scope, and operator intelligence are composed behind live ingestion.",
  skills: [
    {
      name: "graphify-intent",
      surface: "backend_analysis",
      purpose: "Capture why the repository is being analyzed and tie the analysis layer to Graphify's reasoning substrate.",
      evidence: [
        "docs/GRAPHIFY_INTELLIGENCE_ROADMAP.md",
        "artifacts/graphify/god-node-ledger.json",
        "artifacts/graphify/phase-roadmap.json",
      ],
    },
    {
      name: "graphify-temporal",
      surface: "backend_analysis",
      purpose: "Anchor analysis against time-stamped repository evidence and phase progression without touching live ingestion.",
      evidence: [
        "docs/PHASE_MASTER_INDEX.md",
        "docs/PHASE_CLOSURE_CURRENT_STATE.md",
        "artifacts/phase-c9/history-graph-proof.json",
      ],
    },
    {
      name: "code-review-graph",
      surface: "backend_analysis",
      purpose: "Bind patch-risk and repo-structure analysis to the code-review graph rather than the production fetch path.",
      evidence: [
        ".code-review-graph/graph.db",
        "docs/GRAPHIFY_FRESHNESS_RUNBOOK.md",
        "docs/VISUALIZATION_DRILLDOWN_UPGRADE_PLAN.md",
      ],
    },
  ],
  inputs: {
    graphify: {
      graphReport: "graphify-out/GRAPH_REPORT.md",
      intelligenceRoadmap: "docs/GRAPHIFY_INTELLIGENCE_ROADMAP.md",
      phaseRoadmap: "artifacts/graphify/phase-roadmap.json",
      godNodeLedger: "artifacts/graphify/god-node-ledger.json",
    },
    c9: {
      implementationScope: "docs/phase-c9/C9_IMPLEMENTATION_PR23_SCOPE.md",
      proofSummary: "artifacts/phase-c9/c9-source-proof-summary.json",
      planManifest: "artifacts/phase-c9/c9-plan-manifest.json",
    },
    operatorIntelligence: {
      artifact: "artifacts/operator-intelligence/operator-intelligence.json",
      refreshPlan: "artifacts/operator-intelligence/operator-intelligence-refresh-plan.json",
    },
    codeReviewGraph: {
      database: ".code-review-graph/graph.db",
      visualizationCatalog: "artifacts/visualization/visualization-catalog.json",
    },
  },
  outputs: {
    artifact: "artifacts/analysis-engine/ipbl-analysis-engine.json",
    contract: "ipbl.analysis-engine.v1",
  },
};

export function buildAnalysisEngineFromRepository(): AnalysisEngineReport {
  return ANALYSIS_ENGINE_REPORT;
}
