import type { VercelRequest, VercelResponse } from "@vercel/node";

/**
 * No static imports from `./server-lib/*` — Vercel fails those at cold start for this route.
 * Load helpers via dynamic `import(… .js)` then run the same logic as before.
 */
export const config = {
    maxDuration: 300,
};

function headerAuthorization(req: VercelRequest): string | undefined {
    const h = req.headers;
    const v = h.authorization ?? (h as { Authorization?: string | string[] }).Authorization;
    if (Array.isArray(v)) return v[0];
    return typeof v === "string" ? v : undefined;
}

/** Parse `Authorization: Bearer <token>` (trim; tolerate array header). */
function readBearerToken(req: VercelRequest): string | null {
    const raw = headerAuthorization(req);
    if (!raw?.trim()) return null;
    const m = raw.match(/^\s*Bearer\s+(\S+)/i);
    return m ? m[1].trim() : null;
}

function serverCronSecret(): string {
    return String(process.env.CRON_SECRET ?? "").trim();
}

type BackfillBody = {
    year?: number;
    month?: number;
    division?: string;
    allApprovedDivisions?: boolean;
};

async function run(req: VercelRequest, res: VercelResponse): Promise<void> {
    const [{ isKvRestConfigured }, { RESULTS_SYNC_TAGS }, { writeResultsMonthToKv }] = await Promise.all([
        import("./server-lib/kv-rest-env-aliases.js"),
        import("../../lib/results-constants.js"),
        import("./server-lib/write-results-month-kv.js"),
    ]);

    if (req.method !== "POST") {
        res.status(405).json({ error: "Method not allowed" });
        return;
    }

    const serverCron = serverCronSecret();
    if (!serverCron) {
        res.status(503).json({
            error: "CRON_SECRET is not set on this deployment",
            code: "cron_secret_missing",
        });
        return;
    }
    const bearer = readBearerToken(req);
    if (bearer !== serverCron) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }

    if (!isKvRestConfigured()) {
        res.status(503).json({
            ok: false,
            error:
                "KV/Redis REST is not configured. Set KV_REST_API_URL + KV_REST_API_TOKEN, or UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN.",
            code: "kv_env_missing",
        });
        return;
    }

    let body: BackfillBody = {};
    try {
        if (typeof req.body === "string") {
            body = JSON.parse(req.body) as BackfillBody;
        } else if (req.body && typeof req.body === "object") {
            body = req.body as BackfillBody;
        }
    } catch {
        res.status(400).json({ error: "Invalid JSON body" });
        return;
    }

    const year = typeof body.year === "number" ? body.year : Number(body.year);
    const month = typeof body.month === "number" ? body.month : Number(body.month);

    if (!Number.isFinite(year) || year < 2000 || year > 2100) {
        res.status(400).json({ error: "Invalid year" });
        return;
    }
    if (!Number.isFinite(month) || month < 1 || month > 12) {
        res.status(400).json({ error: "Invalid month (1–12)" });
        return;
    }

    const all = Boolean(body.allApprovedDivisions);
    const division = typeof body.division === "string" ? body.division.trim() : "";

    if (!all && !division) {
        res.status(400).json({ error: "Provide division or allApprovedDivisions: true" });
        return;
    }

    const tags = all ? [...RESULTS_SYNC_TAGS] : [division];
    const timeoutMs = Number.parseInt(process.env.BACKFILL_DIVISION_TIMEOUT_MS ?? "120000", 10);

    const written: { key: string; gamesIngested: number; divisionTag: string }[] = [];
    const errors: { divisionTag: string; error: string }[] = [];

    for (const tag of tags) {
        try {
            const result = await writeResultsMonthToKv({
                year,
                month,
                divisionTag: tag,
                timeoutMs,
            });
            written.push(result);
        } catch (e) {
            errors.push({
                divisionTag: tag,
                error: e instanceof Error ? e.message : String(e),
            });
        }
    }

    const ok = errors.length === 0;
    res.status(ok ? 200 : 207).json({
        ok,
        year,
        month,
        written,
        errors,
        keysWritten: written.map((w) => w.key),
    });
}

export default function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
    return run(req, res).catch((e) => {
        const message = e instanceof Error ? e.message : String(e);
        if (!res.headersSent) {
            res.status(503).json({ ok: false, error: message, code: "backfill_handler_error" });
        }
    });
}
