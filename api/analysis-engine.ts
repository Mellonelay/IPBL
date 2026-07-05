import type { VercelRequest, VercelResponse } from "@vercel/node";
import { buildAnalysisEngineFromRepository } from "../lib/server/analysis-engine.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "method_not_allowed" });
  }

  return res.status(200).json(buildAnalysisEngineFromRepository());
}
