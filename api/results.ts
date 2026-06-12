import type { VercelRequest, VercelResponse } from "@vercel/node";
import * as redis from "../lib/server/results-redis.js";
import {
    legacyResultsMetadata,
    parseResultsMetadata,
    parseStoredResultsMonth,
} from "../lib/server/results-hardening.js";
import * as syncConstants from "../lib/server/results-sync-constants.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const { year, month, division } = req.query;
    if (!year || !month || !division) return res.status(400).json({ error: "Missing params" });

    const parsedYear = Number(year);
    const parsedMonth = Number(month);
    const divisionTag = String(division);
    if (!Number.isInteger(parsedYear) || !Number.isInteger(parsedMonth) || parsedMonth < 1 || parsedMonth > 12) {
        return res.status(400).json({ error: "Invalid year or month" });
    }
    if (
        !syncConstants.isApprovedResultsTag(divisionTag)
        || !syncConstants.resultsSyncTagsForMonth(parsedYear, parsedMonth).includes(divisionTag)
    ) {
        return res.status(400).json({ error: "Unknown or disallowed division for requested month" });
    }

    const key = syncConstants.resultsKvKey(parsedYear, parsedMonth, divisionTag);
    const metadataKey = syncConstants.resultsMetadataKey(parsedYear, parsedMonth, divisionTag);
    try {
        const client = redis.getResultsRedis();
        if (!client) return res.status(503).json({ error: "KV not configured" });

        const [data, metadataRaw] = await Promise.all([
            client.get<unknown>(key),
            client.get<unknown>(metadataKey),
        ]);
        if (!data) return res.status(404).json({ error: "Cold data", key, cold: true });

        const calendar = parseStoredResultsMonth(data);
        if (!calendar) return res.status(500).json({ error: "Stored Results payload is invalid", key });
        const metadata = parseResultsMetadata(metadataRaw)
            ?? legacyResultsMetadata({ map: calendar, year: parsedYear, month: parsedMonth, divisionTag });

        res.setHeader("Cache-Control", "no-store, max-age=0");
        res.setHeader("X-IPBL-Results-Status", metadata.status);
        res.setHeader("X-IPBL-Results-Source", metadata.source);
        if (metadata.updatedAt) res.setHeader("X-IPBL-Results-Updated-At", metadata.updatedAt);
        if (metadata.verifiedThroughDate) res.setHeader("X-IPBL-Results-Verified-Through", metadata.verifiedThroughDate);

        if (String(req.query.meta ?? "") === "1") {
            return res.status(200).json({ calendar, meta: metadata });
        }
        return res.status(200).json(calendar);
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        return res.status(500).json({ error: message });
    }
}
