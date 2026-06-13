import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getResultsRedis } from "../../lib/server/results-redis.js";
import { IPBL_API_BASE, RESULTS_LANG, isApprovedResultsTag, resultsKvKey } from "../../lib/server/results-sync-constants.js";
import {
  mergeTeamHistoryItems,
  officialOnlineTeamHistoryItems,
  parseStoredResultsMonth,
  teamHistoryItemsFromMonths,
} from "../../lib/server/team-history-from-results.js";

export const config = { maxDuration: 60 };


async function fetchOfficialOnlineHistoryRows(teamId: number, tag: string): Promise<{ items: ReturnType<typeof officialOnlineTeamHistoryItems>; ok: boolean; error: string | null }> {
  const url = `${IPBL_API_BASE}/calendar/online?tag=${encodeURIComponent(tag)}&lang=${encodeURIComponent(RESULTS_LANG)}`;
  try {
    const response = await fetch(url, { headers: { Accept: "application/json" } });
    if (!response.ok) return { items: [], ok: false, error: `HTTP ${response.status}` };
    const raw = await response.json() as unknown;
    return { items: officialOnlineTeamHistoryItems(raw, teamId, tag), ok: true, error: null };
  } catch (error) {
    return { items: [], ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

function scalar(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const teamId = Number(scalar(req.query.teamId));
  const tag = scalar(req.query.tag);
  const season = Number(scalar(req.query.season));
  if (!Number.isInteger(teamId) || teamId <= 0 || !Number.isInteger(season) || season < 2020 || !tag) {
    return res.status(400).json({ error: "Invalid teamId, tag, or season" });
  }
  if (!isApprovedResultsTag(tag)) return res.status(400).json({ error: "Unsupported division tag" });

  const redis = getResultsRedis();
  if (!redis) return res.status(503).json({ error: "KV not configured" });

  try {
    const keys = Array.from({ length: 12 }, (_, index) => resultsKvKey(season, index + 1, tag));
    const values = await Promise.all(keys.map((key) => redis.get<unknown>(key)));
    const months = values.map(parseStoredResultsMonth);
    const storedItems = teamHistoryItemsFromMonths(months, teamId, tag);
    const officialOnline = await fetchOfficialOnlineHistoryRows(teamId, tag);
    const items = mergeTeamHistoryItems(storedItems, officialOnline.items);
    const loadedMonths = months
      .map((month, index) => month ? index + 1 : null)
      .filter((month): month is number => month !== null);

    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
    return res.status(200).json({
      data: { items, totalCount: items.length },
      coverage: { season, divisionTag: tag, loadedMonths, currentOfficialOnline: { ok: officialOnline.ok, itemCount: officialOnline.items.length, error: officialOnline.error } },
      source: officialOnline.items.length ? "results-kv+official-online" : "results-kv",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ error: message });
  }
}
