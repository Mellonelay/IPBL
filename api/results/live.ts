import type { VercelRequest, VercelResponse } from "@vercel/node";
import { buildLiveFeedEnvelope } from "../../lib/server/live-feed.ts";

export { buildLiveFeedEnvelope } from "../../lib/server/live-feed.ts";

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("CDN-Cache-Control", "no-store");
  res.setHeader("Vercel-CDN-Cache-Control", "no-store");
  return res.status(200).json(await buildLiveFeedEnvelope());
}
