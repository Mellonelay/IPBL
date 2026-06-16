import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import * as runtimeAgentGraph from "../lib/server/runtime-agent-graph.ts";

assert.equal(typeof runtimeAgentGraph.buildRuntimeAgentGraphFromRepository, "function");
assert.equal(
  runtimeAgentGraph.RUNTIME_AGENT_GRAPH_ARTIFACT_PATH,
  "artifacts/runtime-agent-graph/runtime-agent-graph.json"
);

const graph = runtimeAgentGraph.buildRuntimeAgentGraphFromRepository();

assert.equal(graph.nodes.length, 6);
assert.deepEqual(graph.nodes.map((node) => node.kind), [
  "agent",
  "workflow",
  "job",
  "artifact",
  "audit",
  "recovery",
]);

assert.deepEqual(graph.edges.map((edge) => `${edge.from}->${edge.to}:${edge.kind}`), [
  "agent:recorder-trigger->workflow:record-live:owns",
  "workflow:record-live->job:record-live-run:contains",
  "job:record-live-run->artifact:phase-c8-completion-report:produces",
  "audit:identity-audit-report->job:record-live-run:reviews",
  "recovery:phase-c8-monitor->job:record-live-run:recovers",
]);

assert.deepEqual(graph.nodes.find((node) => node.kind === "agent")?.evidence, [
  "artifacts/phase-c8/scheduler-provenance.json",
]);

assert.deepEqual(graph.nodes.find((node) => node.kind === "workflow")?.evidence, [
  "artifacts/ops/vercel-workflow-profile.json",
]);

assert.deepEqual(graph.nodes.find((node) => node.kind === "job")?.evidence, [
  "artifacts/phase-c9/pr23/reconciliation-summary.json",
]);

assert.deepEqual(graph.nodes.find((node) => node.kind === "artifact")?.evidence, [
  "artifacts/workload-graph/ipbl-workload-graph.json",
]);

assert.deepEqual(graph.nodes.find((node) => node.kind === "audit")?.evidence, [
  "artifacts/identity_audit_report.json",
]);

assert.deepEqual(graph.nodes.find((node) => node.kind === "recovery")?.evidence, [
  "artifacts/phase-c8/completion-report.json",
]);

const normalized = runtimeAgentGraph.normalizeRuntimeAgentGraph(graph);
assert.deepEqual(normalized, graph);

const artifactPath = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  "..",
  runtimeAgentGraph.RUNTIME_AGENT_GRAPH_ARTIFACT_PATH
);
assert.equal(fs.existsSync(artifactPath), true, "runtime agent graph artifact should exist");
const artifactGraph = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
assert.deepEqual(artifactGraph, graph);

assert.throws(
  () =>
    runtimeAgentGraph.buildRuntimeAgentGraph([
      { kind: "job", id: "job:broken", label: "Broken", source: "runner" },
    ]),
  /agentId|workflowId/
);

console.log("Runtime agent graph tests passed");
