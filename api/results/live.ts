import type { VercelRequest, VercelResponse } from "@vercel/node";
import { buildLiveFeedEnvelope } from "../../lib/server/live-feed.js";

export { buildLiveFeedEnvelope } from "../../lib/server/live-feed.js";
export {
  LIVE_TAGS,
  fetchLiveTag,
  mergeLiveGamesByFreshness,
  officialGameDetailIsTerminal,
  reconcileLiveGamesWithOfficialDetail,
} from "../../lib/server/live-feed.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("CDN-Cache-Control", "no-store");
  res.setHeader("Vercel-CDN-Cache-Control", "no-store");
  const payload = await buildLiveFeedEnvelope();
  const compat = req.query.compat;
  const compatEnabled = compat === "1" || compat === "true";
  return res
    .status(200)
    .json(
      compatEnabled
        ? {
            ...payload,
            compatibilityEndpoint: "/api/live",
            source: "api/results/live",
          }
        : payload,
    );
}
