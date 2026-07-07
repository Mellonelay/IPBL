import type { VercelRequest, VercelResponse } from "@vercel/node";
import { buildLiveFeedEnvelope } from "./live-feed.js";

export type LiveCompatDependencies = {
  buildLiveFeedEnvelope?: typeof buildLiveFeedEnvelope;
};

export function createLiveCompatHandler(deps: LiveCompatDependencies = {}) {
  const buildLiveFeed = deps.buildLiveFeedEnvelope ?? buildLiveFeedEnvelope;

  return async function handler(_req: VercelRequest, res: VercelResponse) {
    try {
      const data = await buildLiveFeed();
      res.setHeader("Cache-Control", "no-store, max-age=0");
      res.setHeader("CDN-Cache-Control", "no-store");
      res.setHeader("Vercel-CDN-Cache-Control", "no-store");
      return res.status(200).json({
        ...data,
        compatibilityEndpoint: "/api/live",
        source: "api/results/live",
      });
    } catch (_error) {
      return res.status(500).json({
        error: "live-compat-failed",
        compatibilityEndpoint: "/api/live",
      });
    }
  };
}

export default createLiveCompatHandler();
