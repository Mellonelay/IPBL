export type SourceArchaeologyNodeKind =
  | "official-source"
  | "bookmaker-source"
  | "raw-responses"
  | "parser-candidates"
  | "fixtures"
  | "validations"
  | "production-proof";

export type SourceArchaeologyNode = {
  kind: SourceArchaeologyNodeKind;
  id: string;
  label: string;
  status: "active" | "evidence" | "validated" | "proof";
  evidence: readonly string[];
};

export type SourceArchaeologyEdgeKind = "documents" | "feeds" | "proves";

export type SourceArchaeologyEdge = {
  kind: SourceArchaeologyEdgeKind;
  from: string;
  to: string;
  source: string;
};

export type SourceArchaeologyGraph = {
  nodes: SourceArchaeologyNode[];
  edges: SourceArchaeologyEdge[];
};

const nodes: SourceArchaeologyNode[] = [
  {
    kind: "official-source",
    id: "official-source",
    label: "Official Source",
    status: "active",
    evidence: [
      "docs/LIVE_SOURCE_FAILOVER.md",
      "docs/phase-c8/SOURCE_HEALTH_CONTRACT.md",
      "docs/PHASE_4_5_EVIDENCE_MANIFEST.md",
    ],
  },
  {
    kind: "bookmaker-source",
    id: "bookmaker-source",
    label: "Bookmaker Source",
    status: "active",
    evidence: [
      "tests/bookmaker-live.test.ts",
      "tests/live-feed-freshness.test.ts",
      "docs/PHASE_4_5_EVIDENCE_MANIFEST.md",
    ],
  },
  {
    kind: "raw-responses",
    id: "raw-responses",
    label: "Raw Responses",
    status: "evidence",
    evidence: [
      "artifacts/phase-c8/source-health-contract.json",
      "artifacts/phase-c8/live-source-health-evaluation.json",
      "artifacts/phase-c9/current-melbet-events.json",
    ],
  },
  {
    kind: "parser-candidates",
    id: "parser-candidates",
    label: "Parser Candidates",
    status: "evidence",
    evidence: [
      "tests/ipbl-source/live-source.test.ts",
      "tests/ipbl-source/live-route-nested-score.test.ts",
      "tests/recorder-live-feed.test.ts",
    ],
  },
  {
    kind: "fixtures",
    id: "fixtures",
    label: "Fixtures",
    status: "validated",
    evidence: [
      "fixtures",
      "artifacts/phase-c8/endpoint-source-registry.json",
      "artifacts/phase-c9/history-graph-proof.json",
    ],
  },
  {
    kind: "validations",
    id: "validations",
    label: "Validations",
    status: "validated",
    evidence: [
      "tests/ipbl-source/division-discovery.test.ts",
      "tests/source-health.test.ts",
      "tests/frontend-api-query-contracts.test.mjs",
    ],
  },
  {
    kind: "production-proof",
    id: "production-proof",
    label: "Production Proof",
    status: "proof",
    evidence: [
      "docs/PHASE_4_5_EVIDENCE_MANIFEST.md",
      "docs/LIVE_SOURCE_FAILOVER.md",
      "docs/phase-c8/SOURCE_HEALTH_CONTRACT.md",
      "artifacts/phase-c8/source-health-contract.json",
      "artifacts/phase-c8/live-source-health-evaluation.json",
      "artifacts/phase-c8/endpoint-source-registry.json",
      "tests/ipbl-source/division-discovery.test.ts",
      "tests/bookmaker-live.test.ts",
      "tests/source-health.test.ts",
    ],
  },
];

const edges: SourceArchaeologyEdge[] = [
  { kind: "documents", from: "official-source", to: "raw-responses", source: "docs/LIVE_SOURCE_FAILOVER.md" },
  { kind: "documents", from: "bookmaker-source", to: "parser-candidates", source: "tests/bookmaker-live.test.ts" },
  { kind: "feeds", from: "raw-responses", to: "fixtures", source: "artifacts/phase-c8/source-health-contract.json" },
  { kind: "feeds", from: "parser-candidates", to: "fixtures", source: "tests/ipbl-source/live-source.test.ts" },
  { kind: "proves", from: "fixtures", to: "validations", source: "tests/source-health.test.ts" },
  { kind: "proves", from: "validations", to: "production-proof", source: "docs/PHASE_4_5_EVIDENCE_MANIFEST.md" },
  { kind: "proves", from: "official-source", to: "production-proof", source: "docs/LIVE_SOURCE_FAILOVER.md" },
];

export function buildSourceArchaeologyGraph(): SourceArchaeologyGraph {
  return {
    nodes: nodes.map((node) => ({ ...node, evidence: [...node.evidence] })),
    edges: edges.map((edge) => ({ ...edge })),
  };
}

export function normalizeSourceArchaeologyGraph(graph: SourceArchaeologyGraph): SourceArchaeologyGraph {
  return {
    nodes: graph.nodes.map((node) => ({ ...node, evidence: [...node.evidence] })),
    edges: graph.edges.map((edge) => ({ ...edge })),
  };
}
