import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { ResultsMonthMetadata } from "../lib/server/results-types.js";
import * as redis from "../lib/server/results-redis.js";
import { buildLiveFeedEnvelope } from "../lib/server/live-feed.js";
import { createLiveCompatHandler } from "../lib/server/live-compat.js";
import { writeResultsMonthToKv } from "../lib/server/write-results-month-kv.js";
import {
    legacyResultsMetadata,
    parseResultsMetadata,
    parseStoredResultsMonth,
    verifiedThroughDateForMonth,
} from "../lib/server/results-hardening.js";
import * as syncConstants from "../lib/server/results-sync-constants.js";

export function metadataOnlyResultsEnvelope(metadataRaw: unknown, wantsMetadata: boolean) {
    if (!wantsMetadata) return null;
    const metadata = parseResultsMetadata(metadataRaw);
    return metadata?.status === "source_unavailable" ? { calendar: {}, meta: metadata } : null;
}

function firstQueryValue(value: string | string[] | undefined): string | undefined {
    return Array.isArray(value) ? value[0] : value;
}

function queryFromSearchParams(search: URLSearchParams): VercelRequest["query"] {
    const query: Record<string, string> = {};
    for (const [key, value] of search.entries()) {
        if (!(key in query)) query[key] = value;
    }
    return query;
}

const liveCompatHandler = createLiveCompatHandler({ buildLiveFeedEnvelope });
export type ResultsRouteDependencies = {
    getResultsRedis?: typeof redis.getResultsRedis;
    writeResultsMonthToKv?: typeof writeResultsMonthToKv;
    buildLiveFeedEnvelope?: typeof buildLiveFeedEnvelope;
};

function setNoStoreHeaders(res: VercelResponse) {
    res.setHeader("Cache-Control", "no-store, max-age=0");
    res.setHeader("CDN-Cache-Control", "no-store");
    res.setHeader("Vercel-CDN-Cache-Control", "no-store");
}

function keyForResultsMonth(year: number, month: number, divisionTag: string) {
    return {
        key: syncConstants.resultsKvKey(year, month, divisionTag),
        metadataKey: syncConstants.resultsMetadataKey(year, month, divisionTag),
    };
}

async function attemptResultsMonthBackfill(
    client: NonNullable<ReturnType<typeof redis.getResultsRedis>>,
    year: number,
    month: number,
    divisionTag: string,
    writer: typeof writeResultsMonthToKv
): Promise<void> {
    await writer(
        { year, month, divisionTag, timeoutMs: 115000 },
        { redis: client as never }
    );
}

function shouldAttemptResultsRepair(
    metadata: ResultsMonthMetadata | null,
    year: number,
    month: number
): boolean {
    const targetVerifiedThrough = verifiedThroughDateForMonth(year, month);
    if (!targetVerifiedThrough) return false;
    if (!metadata) return true;
    if (metadata.status !== "ok") return true;
    if (!metadata.verifiedThroughDate) return true;
    return metadata.verifiedThroughDate < targetVerifiedThrough;
}

export function createResultsHandler(deps: ResultsRouteDependencies = {}) {
    const getResultsRedis = deps.getResultsRedis ?? redis.getResultsRedis;
    const backfillMonth = deps.writeResultsMonthToKv ?? writeResultsMonthToKv;
    const liveEnvelope = deps.buildLiveFeedEnvelope ?? buildLiveFeedEnvelope;

    return async function handler(req: VercelRequest, res: VercelResponse) {
        const host = Array.isArray(req.headers.host) ? req.headers.host[0] : req.headers.host;
        const base = `https://${host || "ipbl-minimal-viewer.vercel.app"}`;
        const query = queryFromSearchParams(new URL(req.url || "/api/results", base).searchParams);
        if (firstQueryValue(query.mode) === "live") {
            const compat = firstQueryValue(query.compat);
            if (compat === "1" || compat === "true") return liveCompatHandler(req, res);
            setNoStoreHeaders(res);
            const payload = await liveEnvelope();
            return res.status(200).json(payload);
        }

        const resolved = resolveResultsQuery(query);
        if (!resolved.ok) return res.status(resolved.status).json({ error: resolved.error });
        const { year: parsedYear, month: parsedMonth, divisionTag, wantsMetadata, defaultedYearMonth, usedTagAlias } = resolved;

        const client = getResultsRedis();
        if (!client) return res.status(503).json({ error: "KV not configured" });

        const { key, metadataKey } = keyForResultsMonth(parsedYear, parsedMonth, divisionTag);
        try {
            let [data, metadataRaw] = await Promise.all([
                client.get<unknown>(key),
                client.get<unknown>(metadataKey),
            ]);
            let storedMetadata = parseResultsMetadata(metadataRaw);
            const shouldRepair = !data || shouldAttemptResultsRepair(storedMetadata, parsedYear, parsedMonth);
            if (shouldRepair) {
                try {
                    await attemptResultsMonthBackfill(client, parsedYear, parsedMonth, divisionTag, backfillMonth);
                    [data, metadataRaw] = await Promise.all([
                        client.get<unknown>(key),
                        client.get<unknown>(metadataKey),
                    ]);
                    storedMetadata = parseResultsMetadata(metadataRaw);
                } catch {
                    // Preserve the existing cold-data response if official backfill fails.
                }
            }
            if (!data) {
                const metadataOnly = metadataOnlyResultsEnvelope(metadataRaw, wantsMetadata);
                if (metadataOnly || wantsMetadata || defaultedYearMonth || usedTagAlias) {
                    const metadata = metadataOnly?.meta ?? storedMetadata ?? coldResultsMetadata(parsedYear, parsedMonth, divisionTag);
                    setNoStoreHeaders(res);
                    res.setHeader("X-IPBL-Results-Status", metadata.status);
                    res.setHeader("X-IPBL-Results-Source", metadata.source);
                    if (metadata.updatedAt) res.setHeader("X-IPBL-Results-Updated-At", metadata.updatedAt);
                    if (metadata.verifiedThroughDate) res.setHeader("X-IPBL-Results-Verified-Through", metadata.verifiedThroughDate);
                    return res.status(200).json({ calendar: {}, meta: metadata });
                }
                return res.status(404).json({ error: "Cold data", key, cold: true });
            }

            const calendar = parseStoredResultsMonth(data);
            if (!calendar) return res.status(500).json({ error: "Stored Results payload is invalid", key });
            const metadata = storedMetadata
                ?? legacyResultsMetadata({ map: calendar, year: parsedYear, month: parsedMonth, divisionTag });

            setNoStoreHeaders(res);
            res.setHeader("X-IPBL-Results-Status", metadata.status);
            res.setHeader("X-IPBL-Results-Source", metadata.source);
            if (metadata.updatedAt) res.setHeader("X-IPBL-Results-Updated-At", metadata.updatedAt);
            if (metadata.verifiedThroughDate) res.setHeader("X-IPBL-Results-Verified-Through", metadata.verifiedThroughDate);

            if (wantsMetadata) {
                return res.status(200).json({ calendar, meta: metadata });
            }
            return res.status(200).json(calendar);
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : String(e);
            return res.status(500).json({ error: message });
        }
    };
}

export default createResultsHandler();

export function defaultResultsYearMonth(now = new Date()): { year: number; month: number } {
    const parts = Object.fromEntries(
        new Intl.DateTimeFormat("en-CA", {
            timeZone: "Asia/Yangon",
            year: "numeric",
            month: "2-digit",
        }).formatToParts(now).map((part) => [part.type, part.value])
    );
    return { year: Number(parts.year), month: Number(parts.month) };
}

export type ResolvedResultsQuery = {
    ok: true;
    year: number;
    month: number;
    divisionTag: string;
    wantsMetadata: boolean;
    defaultedYearMonth: boolean;
    usedTagAlias: boolean;
} | { ok: false; status: number; error: string };

export function resolveResultsQuery(query: VercelRequest["query"], now = new Date()): ResolvedResultsQuery {
    const yearRaw = firstQueryValue(query.year);
    const monthRaw = firstQueryValue(query.month);
    const defaults = defaultResultsYearMonth(now);
    const parsedYear = yearRaw ? Number(yearRaw) : defaults.year;
    const parsedMonth = monthRaw ? Number(monthRaw) : defaults.month;
    const defaultedYearMonth = !yearRaw || !monthRaw;
    const requestedDivision = firstQueryValue(query.division) ?? firstQueryValue(query.tag) ?? firstQueryValue(query.divisionTag) ?? "";
    const normalizedDivision = syncConstants.normalizeResultsDivisionTag(requestedDivision);
    const fallbackDivision = syncConstants.resultsSyncTagsForMonth(parsedYear, parsedMonth)[0] ?? syncConstants.DEFAULT_RESULTS_DIVISION_TAG;
    const divisionTag = normalizedDivision ?? fallbackDivision;

    if (!Number.isInteger(parsedYear) || !Number.isInteger(parsedMonth) || parsedMonth < 1 || parsedMonth > 12) {
        return { ok: false, status: 400, error: "Invalid year or month" };
    }
    if (!syncConstants.resultsSyncTagsForMonth(parsedYear, parsedMonth).includes(divisionTag)) {
        return { ok: false, status: 400, error: "Unknown or disallowed division for requested month" };
    }
    return {
        ok: true,
        year: parsedYear,
        month: parsedMonth,
        divisionTag,
        wantsMetadata: String(firstQueryValue(query.meta) ?? "") === "1",
        defaultedYearMonth,
        usedTagAlias: !firstQueryValue(query.division) && Boolean(firstQueryValue(query.tag)),
    };
}

function coldResultsMetadata(year: number, month: number, divisionTag: string): ResultsMonthMetadata {
    return {
        schemaVersion: 1,
        status: "source_unavailable",
        source: "results-kv",
        checkedAt: new Date().toISOString(),
        updatedAt: null,
        verifiedThroughDate: null,
        year,
        month,
        divisionTag,
        error: "Cold data",
    };
}
