import { buildGraphifyIntelligencePacket, type GraphifyIntelligenceSignal } from "./orchestrator.js";
import { GraphifyIntelligenceState } from "./state.js";
import { buildDeterministicSynthesis, synthesizeGraphifyIntelligence, type WorkersAIAdapter } from "./worker-ai.js";
import type { BettingRecordSummary } from "../../../lib/server/betting-record-summary.js";

export type GraphifyIntelligenceEnv = {
  AI?: WorkersAIAdapter;
};

export type GraphifyIntelligenceRequestBody = {
  generatedAt?: string;
  bettingRecord?: BettingRecordSummary | null;
  signals?: readonly GraphifyIntelligenceSignal[];
};

const singletonState = new GraphifyIntelligenceState();

export { GraphifyIntelligenceState };

export async function handleGraphifyIntelligenceRequest(request: Request, env: GraphifyIntelligenceEnv): Promise<Response> {
  if (request.method === "GET") {
    const snapshot = singletonState.read();
    return Response.json(snapshot ?? { ok: true, snapshot: null });
  }

  if (request.method !== "POST") {
    return Response.json({ error: "method_not_allowed" }, { status: 405 });
  }

  const body = await request.json().catch(() => ({})) as GraphifyIntelligenceRequestBody;
  const packet = buildGraphifyIntelligencePacket({
    generatedAt: body.generatedAt ?? new Date().toISOString(),
    bettingRecord: body.bettingRecord ?? null,
    signals: body.signals ?? [],
  });
  const synthesis = env.AI ? await synthesizeGraphifyIntelligence(packet, env.AI) : buildDeterministicSynthesis(packet);
  const snapshot = singletonState.write({
    packet,
    synthesis,
    storedAt: new Date().toISOString(),
  });

  return Response.json(snapshot);
}

export default {
  fetch: handleGraphifyIntelligenceRequest,
};
