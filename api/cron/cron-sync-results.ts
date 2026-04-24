import type { VercelRequest, VercelResponse } from "@vercel/node";

export const config = { maxDuration: 120 };

async function run(req: VercelRequest, res: VercelResponse): Promise<void> {
    const kv = await import("../admin/server-lib/kv-rest-env-aliases.js");
    const redis = await import("../admin/server-lib/results-redis.js");
    const sync = await import("../admin/server-lib/results-sync-constants.js");
    const writer = await import("../admin/server-lib/write-results-month-kv.js");

    if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }

    if (!kv.isKvRestConfigured()) {
        res.status(503).json({ ok: false, error: "KV not configured" });
        return;
    }

    try {
        const client = redis.requireResultsRedis();
        const slots = sync.RESULTS_SYNC_TAGS.map(tag => ({ year: 2026, month: 4, tag }));
        const prev = await client.get<string>(sync.SYNC_CURSOR_KEY);
        let cursor = prev ? Number.parseInt(prev, 10) : 0;
        const slot = slots[cursor % slots.length];

        const result = await writer.writeResultsMonthToKv({
            year: slot.year,
            month: slot.month,
            divisionTag: slot.tag,
            timeoutMs: 115000,
        });

        await client.set(sync.SYNC_CURSOR_KEY, String(cursor + 1));
        res.status(200).json({ ok: true, ...result });
    } catch (e: any) {
        res.status(500).json({ ok: false, error: e.message });
    }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await run(req, res);
}