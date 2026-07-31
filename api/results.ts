import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { ResultsMonthMetadata } from "../lib/server/results-types.js";
import * as redis from "../lib/server/results-redis.js";
import { buildLiveFeedEnvelope } from "../lib/server/live-feed.js";
import {
    legacyResultsMetadata,
    parseResultsMetadata,
    parseStoredResultsMonth,
} from "../lib/server/results-hardening.js";
import * as syncConstants from "../lib/server/results-sync-constants.js";

const RESULTS_BROWSER_CACHE_SECONDS = 60;
const RESULTS_CDN_CACHE_SECONDS = 15 * 60;
const RESULTS_STALE_WINDOW_SECONDS = 24 * 60 * 60;

export function metadataOnlyResultsEnvelope(metadataRaw: unknown, wantsMetadata: boolean) {
    if (!wantsMetadata) return null;
    const metadata = parseResultsMetadata(metadataRaw);
    return metadata?.status === "source_unavailable" ? { calendar: {}, meta: metadata } : null;
}

export function setResultsCacheHeaders(res: VercelResponse): void {
    res.setHeader("Cache-Control", `public, max-age=${RESULTS_BROWSER_CACHE_SECONDS}`);
    res.setHeader(
        "Vercel-CDN-Cache-Control",
        `public, s-maxage=${RESULTS_CDN_CACHE_SECONDS}, stale-while-revalidate=${RESULTS_STALE_WINDOW_SECONDS}, stale-if-error=${RESULTS_STALE_WINDOW_SECONDS}`,
    );
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

async function handleLiveMode(query: VercelRequest["query"], res: VercelResponse) {
    const payload = await buildLiveFeedEnvelope();
    const compat = firstQueryValue(query.compat);
    const compatEnabled = compat === "1" || compat === "true";
    return res
        .status(200)
        .json(
            compatEnabled
                ? {
                      ...payload,
                      compatibilityEndpoint: "/api/live",
                      source: "api/results/live",
                  }
                : payload,
        );
}

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const host = Array.isArray(req.headers.host) ? req.headers.host[0] : req.headers.host;
    const base = `https://${host || "ipbl-minimal-viewer.vercel.app"}`;
    const query = queryFromSearchParams(new URL(req.url || "/api/results", base).searchParams);
    if (firstQueryValue(query.mode) === "live") return handleLiveMode(query, res);
    const resolved = resolveResultsQuery(query);
    if (!resolved.ok) return res.status(resolved.status).json({ error: resolved.error });
    const { year: parsedYear, month: parsedMonth, divisionTag, wantsMetadata, defaultedYearMonth, usedTagAlias } = resolved;

    const key = syncConstants.resultsKvKey(parsedYear, parsedMonth, divisionTag);
    const metadataKey = syncConstants.resultsMetadataKey(parsedYear, parsedMonth, divisionTag);
    try {
        const client = redis.getResultsRedis();
        if (!client) return res.status(503).json({ error: "KV not configured" });

        const [data, metadataRaw] = await client.mget<unknown>(key, metadataKey);
        const storedMetadata = parseResultsMetadata(metadataRaw);
        if (!data) {
            const metadataOnly = metadataOnlyResultsEnvelope(metadataRaw, wantsMetadata);
            if (metadataOnly || wantsMetadata || defaultedYearMonth || usedTagAlias) {
                const metadata = metadataOnly?.meta ?? storedMetadata ?? coldResultsMetadata(parsedYear, parsedMonth, divisionTag);
                setResultsCacheHeaders(res);
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

        setResultsCacheHeaders(res);
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
        res.setHeader("Cache-Control", "no-store, max-age=0");

        if (message.includes("ERR max requests limit exceeded")) {
            res.setHeader("Retry-After", "3600");
            return res.status(503).json({
                error: "results_storage_quota_exceeded",
                retryable: true,
            });
        }

        return res.status(500).json({ error: "results_storage_failure" });
    }
}
