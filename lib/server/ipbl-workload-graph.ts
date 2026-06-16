export const IPBL_WORKLOAD_GRAPH_ARTIFACT_PATH = "artifacts/workload-graph/ipbl-workload-graph.json";

export type IpblWorkloadGraphSubgraphKind =
  | "live-source"
  | "official-source"
  | "bookmaker-source"
  | "results"
  | "team-statistics"
  | "h2h"
  | "recorder"
  | "release"
  | "evidence"
  | "operator-intelligence";

export type IpblWorkloadGraphSubgraph = {
  kind: IpblWorkloadGraphSubgraphKind;
  label: string;
  source: string;
  evidence: readonly string[];
};

export type IpblWorkloadGraph = {
  schema: "ipbl.workload-graph.v1";
  phase: 10;
  status: "active";
  subgraphs: IpblWorkloadGraphSubgraph[];
};

type BuildOptions = {
  subgraphs?: readonly IpblWorkloadGraphSubgraph[];
};

const WORKLOAD_GRAPH: IpblWorkloadGraph = {
  schema: "ipbl.workload-graph.v1",
  phase: 10,
  status: "active",
  subgraphs: [
    {
      kind: "live-source",
      label: "Live Source",
      source: "docs/TEAM_STATISTICS_PHASE_E2.md",
      evidence: ["docs/TEAM_STATISTICS_PHASE_E2.md"],
    },
    {
      kind: "official-source",
      label: "Official Source",
      source: "docs/TEAM_STATISTICS_RECONCILIATION.md",
      evidence: ["docs/TEAM_STATISTICS_RECONCILIATION.md"],
    },
    {
      kind: "bookmaker-source",
      label: "Bookmaker Source",
      source: "docs/GRAPHIFY_INTELLIGENCE_ROADMAP.md",
      evidence: ["docs/GRAPHIFY_INTELLIGENCE_ROADMAP.md"],
    },
    {
      kind: "results",
      label: "Results",
      source: "artifacts/team-statistics/team-statistics-reconciliation-latest.json",
      evidence: ["artifacts/team-statistics/team-statistics-reconciliation-latest.json"],
    },
    {
      kind: "team-statistics",
      label: "Team Statistics",
      source: "artifacts/team-statistics/team-statistics-reconciliation-latest.json",
      evidence: ["artifacts/team-statistics/team-statistics-reconciliation-latest.json"],
    },
    {
      kind: "h2h",
      label: "H2H",
      source: "tests/team-history-results.test.ts",
      evidence: ["tests/team-history-results.test.ts"],
    },
    {
      kind: "recorder",
      label: "Recorder",
      source: "tests/team-history-official-live.test.ts",
      evidence: ["tests/team-history-official-live.test.ts"],
    },
    {
      kind: "release",
      label: "Release",
      source: "scripts/validate-phase-master.sh",
      evidence: ["scripts/validate-phase-master.sh"],
    },
    {
      kind: "evidence",
      label: "Evidence",
      source: "docs/PHASE_10_11_EVIDENCE_MANIFEST.md",
      evidence: ["docs/PHASE_10_11_EVIDENCE_MANIFEST.md"],
    },
    {
      kind: "operator-intelligence",
      label: "Operator Intelligence",
      source: "docs/GRAPHIFY_INTELLIGENCE_ROADMAP.md",
      evidence: ["docs/GRAPHIFY_INTELLIGENCE_ROADMAP.md"],
    },
  ],
};

export function buildIpblWorkloadGraphFromRepository(options?: BuildOptions): IpblWorkloadGraph {
  if (options?.subgraphs?.length) {
    throw new TypeError("read-only workload graph builder does not accept overrides");
  }

  return {
    ...WORKLOAD_GRAPH,
    subgraphs: WORKLOAD_GRAPH.subgraphs.map((subgraph) => ({
      ...subgraph,
      evidence: [...subgraph.evidence],
    })),
  };
}

export function normalizeIpblWorkloadGraph(graph: IpblWorkloadGraph): IpblWorkloadGraph {
  return {
    ...graph,
    subgraphs: graph.subgraphs.map((subgraph) => ({
      ...subgraph,
      evidence: [...subgraph.evidence],
    })),
  };
}
