import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const RUNTIME_AGENT_GRAPH_ARTIFACT_PATH = "artifacts/runtime-agent-graph/runtime-agent-graph.json";

const MODULE_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(MODULE_DIR, "../..");

export type RuntimeAgentNodeKind =
  | "agent"
  | "workflow"
  | "job"
  | "artifact"
  | "audit"
  | "recovery";

type BaseRuntimeAgentEvent = {
  id: string;
  label: string;
  source: string;
};

export type RuntimeAgentEvent =
  | (BaseRuntimeAgentEvent & {
      kind: "agent";
    })
  | (BaseRuntimeAgentEvent & {
      kind: "workflow";
      agentId: string;
    })
  | (BaseRuntimeAgentEvent & {
      kind: "job";
      agentId: string;
      workflowId: string;
    })
  | (BaseRuntimeAgentEvent & {
      kind: "artifact";
      jobId: string;
    })
  | (BaseRuntimeAgentEvent & {
      kind: "audit";
      targetKind: "agent" | "workflow" | "job" | "artifact";
      targetId: string;
      verdict: string;
    })
  | (BaseRuntimeAgentEvent & {
      kind: "recovery";
      jobId: string;
      action: string;
    });

export type RuntimeAgentNode = RuntimeAgentEvent & {
  key: string;
  evidence?: readonly string[];
};

export type RuntimeAgentEdgeKind = "owns" | "contains" | "produces" | "reviews" | "recovers";

export type RuntimeAgentEdge = {
  kind: RuntimeAgentEdgeKind;
  from: string;
  to: string;
  source: string;
};

export type RuntimeAgentGraph = {
  nodes: RuntimeAgentNode[];
  edges: RuntimeAgentEdge[];
};

type OptionalJson<T> = T | null;

function readJson<T>(relativePath: string): OptionalJson<T> {
  try {
    return JSON.parse(readFileSync(resolve(REPO_ROOT, relativePath), "utf8")) as T;
  } catch (error) {
    if (error instanceof Error && "code" in error && (error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

function nodeKey(kind: RuntimeAgentNodeKind, id: string): string {
  return `${kind}:${id}`;
}

function cloneNode(event: RuntimeAgentEvent): RuntimeAgentNode {
  return { ...event, key: nodeKey(event.kind, event.id) };
}

function requireEvent(value: Partial<RuntimeAgentEvent>, message: string): asserts value is RuntimeAgentEvent {
  if (value.kind === "workflow" && !value.agentId) throw new TypeError(`${message}: agentId`);
  if (value.kind === "job" && (!value.agentId || !value.workflowId)) throw new TypeError(`${message}: agentId, workflowId`);
  if (value.kind === "artifact" && !value.jobId) throw new TypeError(`${message}: jobId`);
  if (value.kind === "audit" && (!value.targetId || !value.targetKind || !value.verdict)) {
    throw new TypeError(`${message}: targetKind, targetId, verdict`);
  }
  if (value.kind === "recovery" && !value.jobId) throw new TypeError(`${message}: jobId`);
}

function buildEdges(event: RuntimeAgentEvent): RuntimeAgentEdge[] {
  if (event.kind === "agent") return [];
  if (event.kind === "workflow") {
    return [
      {
        kind: "owns",
        from: nodeKey("agent", event.agentId),
        to: nodeKey("workflow", event.id),
        source: event.source,
      },
    ];
  }
  if (event.kind === "job") {
    return [
      {
        kind: "owns",
        from: nodeKey("agent", event.agentId),
        to: nodeKey("job", event.id),
        source: event.source,
      },
      {
        kind: "contains",
        from: nodeKey("workflow", event.workflowId),
        to: nodeKey("job", event.id),
        source: event.source,
      },
    ];
  }
  if (event.kind === "artifact") {
    return [
      {
        kind: "produces",
        from: nodeKey("job", event.jobId),
        to: nodeKey("artifact", event.id),
        source: event.source,
      },
    ];
  }
  if (event.kind === "audit") {
    return [
      {
        kind: "reviews",
        from: nodeKey("audit", event.id),
        to: nodeKey(event.targetKind, event.targetId),
        source: event.source,
      },
    ];
  }
  return [
    {
      kind: "recovers",
      from: nodeKey("recovery", event.id),
      to: nodeKey("job", event.jobId),
      source: event.source,
    },
  ];
}

export function buildRuntimeAgentGraph(events: readonly RuntimeAgentEvent[]): RuntimeAgentGraph {
  const nodesByKey = new Map<string, RuntimeAgentNode>();
  const edges: RuntimeAgentEdge[] = [];

  for (const event of events) {
    requireEvent(event as Partial<RuntimeAgentEvent>, `invalid runtime agent event: ${event.kind}`);
    const node = cloneNode(event);
    nodesByKey.set(node.key, node);
    edges.push(...buildEdges(event));
  }

  return {
    nodes: [...nodesByKey.values()],
    edges,
  };
}

function buildNode<K extends RuntimeAgentNodeKind>(
  kind: K,
  id: string,
  label: string,
  source: string,
  evidence: readonly string[],
  extra?: Omit<RuntimeAgentEvent, "kind" | "id" | "label" | "source">,
): RuntimeAgentNode {
  return {
    kind,
    id,
    label,
    source,
    evidence,
    ...(extra ?? {}),
    key: nodeKey(kind, id),
  } as RuntimeAgentNode;
}

export function buildRuntimeAgentGraphFromRepository(): RuntimeAgentGraph {
  const schedulerProvenance = readJson<{
    runtime?: { service?: string; timer?: string };
    repository?: { trigger?: string };
    evidence?: { sourceCounts?: Record<string, number> };
  }>("artifacts/phase-c8/scheduler-provenance.json");

  const workflowProfile = readJson<{
    profile?: string;
    classification?: { productionDeployment?: string };
    preferredProductionFlow?: string[];
  }>("artifacts/ops/vercel-workflow-profile.json");

  const reconciliationSummary = readJson<{
    status?: string;
    tracks?: Record<string, string>;
    proofs?: Record<string, boolean>;
  }>("artifacts/phase-c9/pr23/reconciliation-summary.json");

  const workloadGraph = readJson<{ schema?: string }>("artifacts/workload-graph/ipbl-workload-graph.json");
  const identityAudit = readJson<{ summary?: Record<string, unknown> }>("artifacts/identity_audit_report.json");
  const completionReport = readJson<{ status?: string; recovery?: { state?: string } }>("artifacts/phase-c8/completion-report.json");

  const nodes: RuntimeAgentNode[] = [
    buildNode(
      "agent",
      "recorder-trigger",
      schedulerProvenance?.repository?.trigger ?? "Recorder Trigger",
      "artifacts/phase-c8/scheduler-provenance.json",
      ["artifacts/phase-c8/scheduler-provenance.json"],
    ),
    buildNode(
      "workflow",
      "record-live",
      workflowProfile?.profile ?? "Vercel Execution Fabric Workflow",
      "artifacts/ops/vercel-workflow-profile.json",
      ["artifacts/ops/vercel-workflow-profile.json"],
    ),
    buildNode(
      "job",
      "record-live-run",
      reconciliationSummary?.tracks?.C9A ?? "Phase C9 Reconciliation Job",
      "artifacts/phase-c9/pr23/reconciliation-summary.json",
      ["artifacts/phase-c9/pr23/reconciliation-summary.json"],
    ),
    buildNode(
      "artifact",
      "phase-c8-completion-report",
      "IPBL Workload Graph Manifest",
      "artifacts/workload-graph/ipbl-workload-graph.json",
      ["artifacts/workload-graph/ipbl-workload-graph.json"],
    ),
    buildNode(
      "audit",
      "identity-audit-report",
      "Identity Audit Report",
      "artifacts/identity_audit_report.json",
      ["artifacts/identity_audit_report.json"],
    ),
    buildNode(
      "recovery",
      "phase-c8-monitor",
      completionReport?.recovery?.state ?? "Phase C8 Recovery Monitor",
      "artifacts/phase-c8/completion-report.json",
      ["artifacts/phase-c8/completion-report.json"],
    ),
  ];

  return {
    nodes,
    edges: [
      {
        kind: "owns",
        from: nodeKey("agent", "recorder-trigger"),
        to: nodeKey("workflow", "record-live"),
        source: "artifacts/phase-c8/scheduler-provenance.json",
      },
      {
        kind: "contains",
        from: nodeKey("workflow", "record-live"),
        to: nodeKey("job", "record-live-run"),
        source: "artifacts/ops/vercel-workflow-profile.json",
      },
      {
        kind: "produces",
        from: nodeKey("job", "record-live-run"),
        to: nodeKey("artifact", "phase-c8-completion-report"),
        source: "artifacts/phase-c9/pr23/reconciliation-summary.json",
      },
      {
        kind: "reviews",
        from: nodeKey("audit", "identity-audit-report"),
        to: nodeKey("job", "record-live-run"),
        source: "artifacts/identity_audit_report.json",
      },
      {
        kind: "recovers",
        from: nodeKey("recovery", "phase-c8-monitor"),
        to: nodeKey("job", "record-live-run"),
        source: "artifacts/phase-c8/completion-report.json",
      },
    ],
  };
}

export function normalizeRuntimeAgentGraph(graph: RuntimeAgentGraph): RuntimeAgentGraph {
  return {
    nodes: graph.nodes.map((node) => ({ ...node, evidence: [...node.evidence] })),
    edges: graph.edges.map((edge) => ({ ...edge })),
  };
}
