import type { VercelRequest, VercelResponse } from "@vercel/node";


/**
 * No static imports from `./server-lib/*` â€” Vercel fails those at cold start for this route.
 * Load helpers via dynamic `import(â€¦ .js)` then run the same logic as before.
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
    import("./server-lib/results-sync-constants.js"),
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
