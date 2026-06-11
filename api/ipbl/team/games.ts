import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  buildTeamGamesPayload,
  fetchOfficialJson,
  filterTeamGames,
  loadStoredGames,
} from "../../../lib/server/ipbl-compat.js";
import { isApprovedResultsTag } from "../../../lib/server/results-sync-constants.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const teamId = Number(req.query.teamId);
  const tag = String(req.query.tag ?? "");
  const season = Number(req.query.season ?? new Date().getUTCFullYear());
  if (!Number.isFinite(teamId) || !tag || !Number.isFinite(season)) {
    return res.status(400).json({ error: "Missing teamId, tag, or season" });
  }
  if (!isApprovedResultsTag(tag)) return res.status(404).json({ error: "Division is outside the approved Results registry", tag });

  const query = new URLSearchParams({
    teamId: String(teamId),
    calendarType: String(req.query.calendarType ?? 1),
    tag,
    season: String(season),
  });
  const official = await fetchOfficialJson("/team/games", query);
  if (official) {
    res.setHeader("X-IPBL-Source", "official");
    return res.status(200).json(official);
  }

  const games = filterTeamGames(await loadStoredGames(tag, season), teamId);
  res.setHeader("X-IPBL-Source", "stored-results");
  res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
  return res.status(200).json(buildTeamGamesPayload(games, "stored-results"));
}
