import type { VercelRequest, VercelResponse } from "@vercel/node";


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
  if (req.headers["x-vercel-cron"] === "1") return true;
  const serverCron = serverCronSecret();
  if (!serverCron) return false;
  return readBearerToken(req) === serverCron;
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
