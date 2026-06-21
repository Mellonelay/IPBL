import type { VercelRequest, VercelResponse } from "@vercel/node";
import { buildPredictionRuntimeEnvelope, type PredictionRuntimeOptions } from "../../lib/runtime/prediction-runtime.ts";

export type PredictionLiveDependencies = PredictionRuntimeOptions & {
  buildLiveFeedEnvelope?: () => Promise<Awaited<ReturnType<typeof loadLiveFeedEnvelope>>>;
  now?: () => Date;
};

async function loadLiveFeedEnvelope() {
  const liveModule = await import("../results/live.ts");
  return liveModule.buildLiveFeedEnvelope();
}

export function createPredictionLiveHandler(deps: PredictionLiveDependencies = {}) {
  const buildLiveFeed = deps.buildLiveFeedEnvelope ?? loadLiveFeedEnvelope;

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
