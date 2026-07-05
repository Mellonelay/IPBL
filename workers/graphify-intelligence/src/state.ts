import type { GraphifyIntelligencePacket } from "./orchestrator.js";
import type { GraphifyIntelligenceSynthesis } from "./worker-ai.js";

export type GraphifyIntelligenceSnapshot = {
  packet: GraphifyIntelligencePacket;
  synthesis: GraphifyIntelligenceSynthesis;
  storedAt: string;
};

export class GraphifyIntelligenceState {
  private snapshot: GraphifyIntelligenceSnapshot | null = null;

  read(): GraphifyIntelligenceSnapshot | null {
    return this.snapshot;
  }

  write(snapshot: GraphifyIntelligenceSnapshot): GraphifyIntelligenceSnapshot {
    this.snapshot = snapshot;
    return snapshot;
  }
}
