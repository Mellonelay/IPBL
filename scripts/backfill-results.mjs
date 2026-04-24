#!/usr/bin/env node
import { loadEnvLocal } from "./load-env-local.mjs";

loadEnvLocal();

/**
 * POST to /api/admin/backfill-results with CRON_SECRET.
 *
 * Env:
 *   BACKFILL_URL — e.g. https://your-app.vercel.app (no trailing slash)
 *   CRON_SECRET — same as Vercel
 *
 * Examples:
 *   node scripts/backfill-results.mjs --year 2026 --month 3 --all
 *   node scripts/backfill-results.mjs --year 2026 --month 4 --division ipbl-66-m-pro-a
 */

function parseArgs(argv) {
    let year;
    let month;
    let division;
    let all = false;
    let url;
    for (let i = 0; i < argv.length; i += 1) {
        const a = argv[i];
        if (a === "--year") year = Number(argv[++i]);
        else if (a === "--month") month = Number(argv[++i]);
        else if (a === "--division") division = argv[++i];
        else if (a === "--all") all = true;
        else if (a === "--url") url = argv[++i];
    }
    return { year, month, division, all, url };
}

const { year, month, division, all, url: urlFlag } = parseArgs(process.argv.slice(2));

if (!Number.isFinite(year) || !Number.isFinite(month)) {
    console.error("Usage: node scripts/backfill-results.mjs --year YYYY --month M [--division TAG | --all] [--url https://...]");
    process.exit(1);
}

if (!all && !division) {
    console.error("Provide --division TAG or --all");
    process.exit(1);
}

let base =
    urlFlag?.replace(/\/$/, "") ||
    process.env.BACKFILL_URL?.replace(/\/$/, "") ||
    process.env.VERCEL_URL?.replace(/\/$/, "");

if (base && !/^https?:\/\//i.test(base)) {
    base = `https://${base}`;
}

if (!base) {
    console.error("Set BACKFILL_URL or pass --url https://<deployment>.vercel.app");
    process.exit(1);
}

const secret = process.env.CRON_SECRET;
if (!secret) {
    console.error("Set CRON_SECRET in the environment");
    process.exit(1);
}

const target = `${base}/api/admin/backfill-results`;
const body = all
    ? { year, month, allApprovedDivisions: true }
    : { year, month, division };

const res = await fetch(target, {
    method: "POST",
    headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify(body),
});

const text = await res.text();
let json;
try {
    json = JSON.parse(text);
} catch {
    console.error(res.status, text);
    process.exit(1);
}

console.log(JSON.stringify(json, null, 2));
if (!res.ok || json.ok === false) {
    process.exit(1);
}
