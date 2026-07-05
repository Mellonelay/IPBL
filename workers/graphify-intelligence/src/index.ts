import { buildGraphifyIntelligencePacket, type GraphifyIntelligenceSignal } from "./orchestrator.js";
import { GraphifyIntelligenceState } from "./state.js";
import { buildDeterministicSynthesis, synthesizeGraphifyIntelligence, type WorkersAIAdapter } from "./worker-ai.js";

export type GraphifyIntelligenceEnv = {
  AI?: WorkersAIAdapter;
};

export type GraphifyIntelligenceRequestBody = {
  generatedAt?: string;
  signals?: readonly GraphifyIntelligenceSignal[];
};

const singletonState = new GraphifyIntelligenceState();

export async function handleGraphifyIntelligenceRequest(request: Request, env: GraphifyIntelligenceEnv, state = singletonState): Promise<Response> {
  if (request.method === "GET") {
    const snapshot = state.read();
    return Response.json(snapshot ?? { ok: true, snapshot: null });
  }

  if (request.method !== "POST") {
    return Response.json({ error: "method_not_allowed" }, { status: 405 });
  }

  const body = await request.json().catch(() => ({})) as GraphifyIntelligenceRequestBody;
  const packet = buildGraphifyIntelligencePacket({
    generatedAt: body.generatedAt ?? new Date().toISOString(),
    signals: body.signals ?? [],
  });
  const synthesis = env.AI ? await synthesizeGraphifyIntelligence(packet, env.AI) : buildDeterministicSynthesis(packet);
  const snapshot = state.write({
    packet,
    synthesis,
    storedAt: new Date().toISOString(),
  });

  return Response.json(snapshot);
}

export default {
  fetch: handleGraphifyIntelligenceRequest,
};
