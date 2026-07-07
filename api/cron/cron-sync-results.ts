import type { VercelRequest, VercelResponse } from "@vercel/node";
import { runOfficialBackfillRange } from "../../lib/server/results-official-backfill.js";

export const config = { maxDuration: 120 };

function queryValue(value: string | string[] | undefined): string | undefined {
    return Array.isArray(value) ? value[0] : value;
}

function toOptionalNumber(value: unknown): number | undefined {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim()) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : undefined;
    }
    return undefined;
}

async function run(req: VercelRequest, res: VercelResponse): Promise<void> {
    const kv = await import("../../lib/server/kv-rest-env-aliases.js");
    const redis = await import("../../lib/server/results-redis.js");
    const sync = await import("../../lib/server/results-sync-constants.js");
    const writer = await import("../../lib/server/write-results-month-kv.js");

        if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }

        if (!kv.isKvRestConfigured()) {
            res.status(503).json({ ok: false, error: "KV not configured" });
            return;
        }

    try {
        const body = req.body && typeof req.body === "object" && !Array.isArray(req.body) ? req.body as Record<string, unknown> : {};
        const mode = queryValue(req.query.mode);
        const wantsBackfill = req.method === "POST" && (
            mode === "backfill"
            || body.from !== undefined
            || body.to !== undefined
            || body.year !== undefined
            || body.month !== undefined
            || body.division !== undefined
            || body.allApprovedDivisions !== undefined
        );

        if (wantsBackfill) {
            const from = typeof body.from === "string" ? body.from : undefined;
            const to = typeof body.to === "string" ? body.to : undefined;
            const year = toOptionalNumber(body.year);
            const month = toOptionalNumber(body.month);
            const division = typeof body.division === "string" ? body.division : undefined;
            const allApprovedDivisions = Boolean(body.allApprovedDivisions);

            if (from || to || !Number.isFinite(year) || !Number.isFinite(month)) {
                const result = await runOfficialBackfillRange(
                    {
                        from,
                        to,
                        divisionTags: allApprovedDivisions || !division ? undefined : [division],
                    },
                    { now: () => new Date() }
                );
                res.status(200).json({ ok: true, ...result });
                return;
            }

            if (allApprovedDivisions) {
                const results = [];
                for (const tag of sync.resultsSyncTagsForMonth(year!, month!)) {
                    const result = await writer.writeResultsMonthToKv({
                        year: year!,
                        month: month!,
                        divisionTag: tag,
                        timeoutMs: 115000,
                    });
                    results.push(result);
                }
                res.status(200).json({ ok: true, results });
                return;
            }

            const result = await writer.writeResultsMonthToKv({
                year: year!,
                month: month!,
                divisionTag: division ?? sync.resultsSyncTagsForMonth(year!, month!)[0],
                timeoutMs: 115000,
            });
            res.status(200).json({ ok: true, ...result });
            return;
        }

        const client = redis.requireResultsRedis();
        const slots = sync.resultsSyncSlots();
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
