import type { VercelRequest, VercelResponse } from "@vercel/node";
import { buildOperatorIntelligenceReport } from "../lib/server/operator-intelligence.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "method_not_allowed" });
  }

  return res.status(200).json(buildOperatorIntelligenceReport());
}
