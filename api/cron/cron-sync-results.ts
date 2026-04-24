import type { VercelRequest, VercelResponse } from "@vercel/node";
import { timingSafeEqual } from "node:crypto";

export const config = {
    maxDuration: 120,
};

function headerAuthorization(req: VercelRequest): string | undefined {
    const h = req.headers;
    const v = h.authorization ?? (h as { Authorization?: string | string[] }).Authorization;
    if (Array.isArray(v)) return v[0];
    return typeof v === "string" ? v : undefined;
}

function readBearerToken(req: VercelRequest): string | null {
    const raw = headerAuthorization(req);
    if (!raw?.trim()) return null;
    const m = raw.match(/^\s*Bearer\s+(\S+)/i);
    return m ? m[1].trim() : null;
}

function serverCronSecret(): string {
    return String(process.env.CRON_SECRET ?? "").trim();
}

function authOk(req: VercelRequest): boolean {
    const serverCron = serverCronSecret();
    if (!serverCron) return false;

    const providedToken = readBearerToken(req);
    if (!providedToken) return false;

    const a = Buffer.from(providedToken);
    const b = Buffer.from(serverCron);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
}

function monthSlotsUtc(tags: readonly string[]): { year: number; month: number; tag: string }[] {
    const now = new Date();
    const months: { year: number; month: number }[] = [];
    for (let delta = -1; delta <= 2; delta += 1) {
        const t = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + delta, 1));
        months.push({ year: t.getUTCFullYear(), month: t.getUTCMonth() + 1 });
    }
    const slots: { year: number; month: number; tag: string }[] = [];
    for (const { year, month } of months) {
        for (const tag of tags) {
            slots.push({ year, month, tag });
        }
    }
    return slots;
}

async function run(req: VercelRequest, res: VercelResponse): Promise<void> {
    const [{ isKvRestConfigured }, { requireResultsRedis }, sc, { writeResultsMonthToKv }] = await Promise.all([
        import("./admin/server-lib/kv-rest-env-aliases.js"),
        import("./admin/server-lib/results-redis.js"),
        import("./admin/server-lib/results-sync-constants.js"),
        import("./admin/server-lib/write-results-month-kv.js"),
    ]);
    const { RESULTS_SYNC_TAGS, SYNC_CURSOR_KEY } = sc;

    if (req.method !== "GET" && req.method !== "POST") {
        res.status(405).json({ error: "Method not allowed" });
        return;
    }

    if (!authOk(req)) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }

    if (!isKvRestConfigured()) {
        res.status(503).json({
            ok: false,
            error: "KV/Redis REST is not configured.",
            code: "kv_env_missing",
        });
        return;
    }

    const timeoutMs = Number.parseInt(process.env.SYNC_MONTH_TIMEOUT_MS ?? "115000", 10);

    try {
        const redis = requireResultsRedis();
        const slots = monthSlotsUtc(RESULTS_SYNC_TAGS);
        const prev = await redis.get<string>(SYNC_CURSOR_KEY);
        let cursor = prev != null ? Number.parseInt(prev, 10) : 0;
        if (!Number.isFinite(cursor)) cursor = 0;

        const slot = slots[cursor % slots.length];

        const { key, gamesIngested } = await writeResultsMonthToKv({
            year: slot.year,
            month: slot.month,
            divisionTag: slot.tag,
            timeoutMs,
        });

        cursor += 1;
        await redis.set(SYNC_CURSOR_KEY, String(cursor));

        res.status(200).json({
            ok: true,
            key,
            slot,
            gamesIngested,
            nextCursor: cursor,
            slotsTotal: slots.length,
        });
    } catch (e) {
        res.status(500).json({
            ok: false,
            error: e instanceof Error ? e.message : String(e),
        });
    }
}

export default function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
    return run(req, res).catch((e) => {
        const message = e instanceof Error ? e.message : String(e);
        if (!res.headersSent) {
            res.status(503).json({ ok: false, error: message, code: "cron_sync_handler_error" });
        }
    });
}
