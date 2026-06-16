import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import * as ipblWorkloadGraph from "../lib/server/ipbl-workload-graph.ts";

assert.equal(typeof ipblWorkloadGraph.buildIpblWorkloadGraphFromRepository, "function");
assert.equal(
  ipblWorkloadGraph.IPBL_WORKLOAD_GRAPH_ARTIFACT_PATH,
  "artifacts/workload-graph/ipbl-workload-graph.json",
);

const graph = ipblWorkloadGraph.buildIpblWorkloadGraphFromRepository();

assert.deepEqual(graph, {
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
});

const artifactPath = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  "..",
  ipblWorkloadGraph.IPBL_WORKLOAD_GRAPH_ARTIFACT_PATH,
);

assert.equal(fs.existsSync(artifactPath), true, "workload graph artifact should exist");
assert.deepEqual(JSON.parse(fs.readFileSync(artifactPath, "utf8")), graph);

assert.throws(
  () =>
    ipblWorkloadGraph.buildIpblWorkloadGraphFromRepository({
      subgraphs: [{ kind: "results", label: "Results", source: "missing", evidence: [] }],
    }),
  /read-only|invalid/i,
);

console.log("IPBL workload graph tests passed");
