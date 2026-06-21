import type { VercelRequest, VercelResponse } from "@vercel/node";
import { buildLiveFeedEnvelope } from "../../lib/server/live-feed.js";
import { buildPredictionRuntimeEnvelope, type PredictionRuntimeOptions } from "../../lib/runtime/prediction-runtime.js";

export type PredictionLiveDependencies = PredictionRuntimeOptions & {
  buildLiveFeedEnvelope?: typeof buildLiveFeedEnvelope;
  now?: () => Date;
};

export function createPredictionLiveHandler(deps: PredictionLiveDependencies = {}) {
  const buildLiveFeed = deps.buildLiveFeedEnvelope ?? buildLiveFeedEnvelope;

  return async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== "GET") return res.status(405).json({ error: "method_not_allowed" });

    const liveEnvelope = await buildLiveFeed();
    const runtime = buildPredictionRuntimeEnvelope(liveEnvelope, {
      generatedAt: deps.now?.() ?? new Date(),
      baselineEvaluation: deps.baselineEvaluation ?? null,
      recentEvaluation: deps.recentEvaluation ?? null,
    });

    res.setHeader("Cache-Control", "no-store, max-age=0");
    res.setHeader("CDN-Cache-Control", "no-store");
    res.setHeader("Vercel-CDN-Cache-Control", "no-store");
    return res.status(200).json(runtime);
  };
}

export default createPredictionLiveHandler();
