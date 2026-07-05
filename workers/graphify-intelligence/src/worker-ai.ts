import type { GraphifyIntelligencePacket } from "./orchestrator.js";

export type WorkersAIAdapter = {
  run(model: string, payload: { messages: Array<{ role: "system" | "user"; content: string }> }): Promise<unknown>;
};

export type GraphifyIntelligenceSynthesis = {
  summary: string;
  fallback: boolean;
  nextAction: "monitor" | "replay" | "hold";
};

export function buildGraphifyIntelligencePrompt(packet: GraphifyIntelligencePacket): { model: string; messages: Array<{ role: "system" | "user"; content: string }> } {
  return {
    model: "@cf/meta/llama-3.1-8b-instruct",
    messages: [
      {
        role: "system",
        content: "Summarize betting intelligence from graph evidence only. Do not invent data.",
      },
      {
        role: "user",
        content: JSON.stringify(packet),
      },
    ],
  };
}

export function buildDeterministicSynthesis(packet: GraphifyIntelligencePacket): GraphifyIntelligenceSynthesis {
  const topSignal = [...packet.signals].sort((left, right) => right.confidence - left.confidence)[0] ?? null;
  const label = topSignal
    ? `${topSignal.patternId}:${topSignal.suggestedBias ?? "MONITOR"}:${topSignal.confidence.toFixed(2)}`
    : "no-live-signals";
  return {
    summary: `Graphify betting intelligence: ${packet.summary.signalCount} signals, ${packet.summary.strongSignals} strong. Top signal ${label}.`,
    fallback: true,
    nextAction: packet.summary.recommendedBias === "OVER" || packet.summary.recommendedBias === "UNDER" ? "replay" : "monitor",
  };
}

export async function synthesizeGraphifyIntelligence(
  packet: GraphifyIntelligencePacket,
  ai?: WorkersAIAdapter | null,
): Promise<GraphifyIntelligenceSynthesis> {
  if (!ai) return buildDeterministicSynthesis(packet);

  const prompt = buildGraphifyIntelligencePrompt(packet);
  const response = await ai.run(prompt.model, { messages: prompt.messages });
  const text = normalizeResponse(response);
  if (!text) return buildDeterministicSynthesis(packet);

  return {
    summary: text,
    fallback: false,
    nextAction: packet.summary.recommendedBias === "OVER" || packet.summary.recommendedBias === "UNDER" ? "replay" : "monitor",
  };
}

function normalizeResponse(response: unknown): string | null {
  if (typeof response === "string" && response.trim()) return response.trim();
  if (!response || typeof response !== "object") return null;
  const candidate = response as { text?: unknown; output?: unknown; response?: unknown };
  if (typeof candidate.text === "string" && candidate.text.trim()) return candidate.text.trim();
  if (typeof candidate.response === "string" && candidate.response.trim()) return candidate.response.trim();
  if (typeof candidate.output === "string" && candidate.output.trim()) return candidate.output.trim();
  return null;
}
