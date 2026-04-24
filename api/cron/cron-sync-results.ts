import type { VercelRequest, VercelResponse } from "@vercel/node";
import * as kvAliases from "../admin/server-lib/kv-rest-env-aliases.js";
import * as resultsRedis from "../admin/server-lib/results-redis.js";
import * as syncConstants from "../admin/server-lib/results-sync-constants.js";
import * as writeKv from "../admin/server-lib/write-results-month-kv.js";

export const config = { maxDuration: 120 };

function headerAuthorization(req: VercelRequest): string | undefined {
    const h = req.headers;
    const v = h.authorization ?? (h as any).Authorization;
    return Array.isArray(v) ? v[0] : (typeof v === "string" ? v : undefined);
}

function readBearerToken(req: VercelRequest): string | null {
    const raw = headerAuthorization(req);
    return raw?.match(/^\s*Bearer\s+(\S+)/i)?.[1] ?? null;
}

function authOk(req: VercelRequest): boolean {
    const secret = process.env.CRON_SECRET?.trim();
    if (!secret) return false;
    return readBearerToken(req) === secret;
}

async function run(req: VercelRequest, res: VercelResponse): Promise<void> {
    if (req.method !== "GET" && req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
    if (!authOk(req)) return res.status(401).json({ error: "Unauthorized" });

    if (!kvAliases.isKvRestConfigured()) {
        return res.status(503).json({ ok: false, error: "KV/Redis not configured.", code: "kv_env_missing" });
    }

    try {
        const redis = resultsRedis.requireResultsRedis();
        const slots = syncConstants.RESULTS_SYNC_TAGS.map(tag => ({ year: 2026, month: 4, tag }));
        const prev = await redis.get<string>(syncConstants.SYNC_CURSOR_KEY);
        let cursor = prev ? Number.parseInt(prev, 10) : 0;
        const slot = slots[cursor % slots.length];

        const result = await writeKv.writeResultsMonthToKv({
            year: slot.year,
            month: slot.month,
            divisionTag: slot.tag,
            timeoutMs: 115000,
        });

        await redis.set(syncConstants.SYNC_CURSOR_KEY, String(cursor + 1));
        res.status(200).json({ ok: true, ...result, nextCursor: cursor + 1 });
    } catch (e: any) {
        res.status(500).json({ ok: false, error: e.message });
    }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    await run(req, res).catch(e => {
        if (!res.headersSent) res.status(503).json({ ok: false, error: e.message });
    });
}