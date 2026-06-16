import assert from "node:assert/strict";
import {
  buildSourceArchaeologyGraph,
  normalizeSourceArchaeologyGraph,
  type SourceArchaeologyGraph,
} from "../lib/server/source-archaeology-graph.ts";

const graph = buildSourceArchaeologyGraph();

assert.equal(graph.nodes.length, 7);
assert.deepEqual(graph.nodes.map((node) => node.kind), [
  "official-source",
  "bookmaker-source",
  "raw-responses",
  "parser-candidates",
  "fixtures",
  "validations",
  "production-proof",
]);

assert.deepEqual(graph.edges.map((edge) => `${edge.from}->${edge.to}:${edge.kind}`), [
  "official-source->raw-responses:documents",
  "bookmaker-source->parser-candidates:documents",
  "raw-responses->fixtures:feeds",
  "parser-candidates->fixtures:feeds",
  "fixtures->validations:proves",
  "validations->production-proof:proves",
  "official-source->production-proof:proves",
]);

assert.deepEqual(graph.nodes.find((node) => node.kind === "production-proof")?.evidence, [
  "docs/PHASE_4_5_EVIDENCE_MANIFEST.md",
  "docs/LIVE_SOURCE_FAILOVER.md",
  "docs/phase-c8/SOURCE_HEALTH_CONTRACT.md",
  "artifacts/phase-c8/source-health-contract.json",
  "artifacts/phase-c8/live-source-health-evaluation.json",
  "artifacts/phase-c8/endpoint-source-registry.json",
  "tests/ipbl-source/division-discovery.test.ts",
  "tests/bookmaker-live.test.ts",
  "tests/source-health.test.ts",
]);

const normalized = normalizeSourceArchaeologyGraph(graph);
assert.deepEqual(normalized, graph);

const typedGraph: SourceArchaeologyGraph = graph;
assert.equal(typedGraph.nodes.length, 7);

console.log("Source archaeology graph tests passed");
