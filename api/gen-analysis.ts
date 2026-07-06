import type { VercelRequest, VercelResponse } from "@vercel/node";
import { readFile } from "node:fs/promises";

import { buildBettingRecordSummary } from "../lib/server/betting-record-summary.js";
import { buildAnalysisEngineFromRepository } from "../lib/server/analysis-engine.js";
import type { BetHistoryRow } from "../lib/server/betting-intelligence.js";
import { buildOperatorIntelligenceReport } from "../lib/server/operator-intelligence.js";
import { requestGraphifyIntelligence, type GraphifyIntelligenceRequest } from "../lib/server/graphify-intelligence-client.js";

async function loadBettingHistory(req: VercelRequest) {
  const host = typeof req.headers.host === "string" && req.headers.host.trim() ? req.headers.host.trim() : "127.0.0.1";
  const proto = typeof req.headers["x-forwarded-proto"] === "string" && req.headers["x-forwarded-proto"].trim()
    ? req.headers["x-forwarded-proto"].trim()
    : "https";
  const url = new URL("/bet_history_clean.json", `${proto}://${host}`);
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load betting history (${response.status})`);
    }
    return response.json() as Promise<BetHistoryRow[]>;
  } catch (_error) {
    const fallback = new URL("../public/bet_history_clean.json", import.meta.url);
    return JSON.parse(await readFile(fallback, "utf8")) as BetHistoryRow[];
  }
}

function parseSignals(body: unknown): GraphifyIntelligenceRequest["signals"] {
  if (!body || typeof body !== "object") return [];
  const candidate = body as { signals?: unknown };
  return Array.isArray(candidate.signals) ? (candidate.signals as GraphifyIntelligenceRequest["signals"]) : [];
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("CDN-Cache-Control", "no-store");
  res.setHeader("Vercel-CDN-Cache-Control", "no-store");

  try {
    const bets = await loadBettingHistory(req);
    const bettingRecord = buildBettingRecordSummary(bets);
    const generatedAt = typeof req.query?.generatedAt === "string" ? req.query.generatedAt : new Date().toISOString();

    let requestBody: GraphifyIntelligenceRequest = {
      generatedAt,
      bettingRecord,
      signals: [],
    };

    if (req.method === "POST") {
      requestBody = {
        generatedAt,
        bettingRecord,
        signals: parseSignals(req.body),
      };
    }

    const workerSnapshot = await requestGraphifyIntelligence(requestBody);
    return res.status(200).json({
      source: "api/gen-analysis",
      generatedAt,
      bettingRecord,
      worker: workerSnapshot,
      analysisEngine: buildAnalysisEngineFromRepository(),
      operatorIntelligence: buildOperatorIntelligenceReport(),
    });
  } catch (error) {
    console.error("gen-analysis failed", error);
    const message = error instanceof Error ? error.message : "analysis_failed";
    return res.status(500).json({ error: message });
  }
}
