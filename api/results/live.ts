import type { VercelRequest, VercelResponse } from "@vercel/node";
import { fetchIpblLiveGames } from "../../src/results/live-source";

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  try {
    const payload = await fetchIpblLiveGames();
    const httpStatus = payload.status.status === "SOURCE_UNAVAILABLE" ? 503 : 200;
    return res.status(httpStatus).json(payload);
  } catch (error) {
    return res.status(500).json({
      games: [],
      status: {
        lastSyncAt: new Date().toISOString(),
        status: "PARSER_ERROR",
        errorCode: "PARSER_ERROR",
        source: "api/results/live",
        latencyMs: 0,
        message: error instanceof Error ? error.message : String(error),
      },
    });
  }
}
