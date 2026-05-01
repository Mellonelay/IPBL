import type { VercelRequest, VercelResponse } from "@vercel/node";
import { RESULTS_SYNC_TAGS } from "./server-lib/results-sync-constants.js";

export const config = { maxDuration: 300 };

async function run(req: VercelRequest, res: VercelResponse): Promise<void> {
  const { isKvRestConfigured } = await import("./server-lib/kv-rest-env-aliases.js");
  const { writeResultsMonthToKv } = await import("./server-lib/write-results-month-kv.js");

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const serverCron = process.env.CRON_SECRET?.trim();
  const auth = req.headers.authorization?.match(/^\s*Bearer\s+(\S+)/i)?.[1];
  if (!serverCron || auth !== serverCron) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  if (!isKvRestConfigured()) {
    res.status(503).json({ error: "KV not configured" });
    return;
  }

  try {
    const { year, month, division, allApprovedDivisions } = req.body;

    if (allApprovedDivisions) {
      console.log(`Starting bulk backfill for ${year}-${month}`);
      const results = [];
      for (const tag of RESULTS_SYNC_TAGS) {
        try {
          console.log(`Ingesting ${tag}...`);
          const result = await writeResultsMonthToKv({ year, month, divisionTag: tag });
          console.log(`  Done: ${result.gamesIngested} games.`);
          results.push(result);
        } catch (e: any) {
          console.error(`Failed backfill for ${tag}: ${e.message}`);
        }
      }
      res.status(200).json({ ok: true, results });
      return;
    }

    const result = await writeResultsMonthToKv({ year, month, divisionTag: division });
    res.status(200).json({ ok: true, ...result });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message });
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await run(req, res);
}
