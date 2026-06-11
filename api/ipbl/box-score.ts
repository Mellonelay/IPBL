import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  buildBoxScorePayload,
  fetchOfficialJson,
  resolveCompatGame,
} from "../../lib/server/ipbl-compat.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const id = Number(req.query.id);
  const tag = String(req.query.tag ?? "");
  const season = Number(req.query.season ?? new Date().getUTCFullYear());
  if (!Number.isFinite(id) || !tag) return res.status(400).json({ error: "Missing id or tag" });

  const query = new URLSearchParams({ id: String(id), tag, lang: String(req.query.lang ?? "ru") });
  const official = await fetchOfficialJson("/box-score", query);
  if (official) {
    res.setHeader("X-IPBL-Source", "official");
    return res.status(200).json(official);
  }

  const resolved = await resolveCompatGame(id, tag, season);
  if (!resolved) return res.status(404).json({ error: "Box score not found in official or verified fallback sources", id, tag });
  res.setHeader("X-IPBL-Source", resolved.source);
  res.setHeader("Cache-Control", resolved.source === "bookmaker-live" ? "s-maxage=5, stale-while-revalidate=10" : "s-maxage=300, stale-while-revalidate=3600");
  return res.status(200).json(buildBoxScorePayload(resolved.game, resolved.source));
}
