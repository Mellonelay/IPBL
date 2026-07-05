import type { BettingRecordSummary } from "./betting-record-summary.js";
import type { GraphifyIntelligencePacket, GraphifyIntelligenceSignal } from "../../workers/graphify-intelligence/src/orchestrator.js";

export type GraphifyIntelligenceWorkerSnapshot = {
  packet: GraphifyIntelligencePacket;
  synthesis: {
    summary: string;
    fallback: boolean;
    nextAction: "monitor" | "replay" | "hold";
  };
  storedAt: string;
};

export type GraphifyIntelligenceRequest = {
  generatedAt?: string;
  bettingRecord?: BettingRecordSummary | null;
  signals?: readonly GraphifyIntelligenceSignal[];
};

const DEFAULT_WORKER_URL = "https://ipbl-graphify-intelligence.melloenfrwrk.workers.dev";
const WORKER_URL_ENV_KEYS = ["IPBL_GRAPHIFY_INTELLIGENCE_URL", "GRAPHIFY_INTELLIGENCE_URL"];

export function getGraphifyIntelligenceWorkerUrl(env: NodeJS.ProcessEnv = process.env): string {
  for (const key of WORKER_URL_ENV_KEYS) {
    const value = env[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return DEFAULT_WORKER_URL;
}

export async function requestGraphifyIntelligence(
  input: GraphifyIntelligenceRequest,
  fetchImpl: typeof fetch = fetch,
  env: NodeJS.ProcessEnv = process.env,
): Promise<GraphifyIntelligenceWorkerSnapshot> {
  const response = await fetchImpl(getGraphifyIntelligenceWorkerUrl(env), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      generatedAt: input.generatedAt ?? new Date().toISOString(),
      bettingRecord: input.bettingRecord ?? null,
      signals: input.signals ?? [],
    }),
  });

  if (!response.ok) {
    throw new Error(`Graphify intelligence worker failed (${response.status})`);
  }

  return response.json() as Promise<GraphifyIntelligenceWorkerSnapshot>;
}
