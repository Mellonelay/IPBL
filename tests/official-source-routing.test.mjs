import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const paths = ["vercel.json", "vite.config.ts", "lib/results-constants.ts", "lib/server/results-sync-constants.ts", "lib/server/live-feed.ts"];
for (const path of paths) assert.ok(!readFileSync(path, "utf8").includes("worker.mloneslot99.com"), `${path} must not use retired Cloudflare Worker`);
const vercel = JSON.parse(readFileSync("vercel.json", "utf8"));
assert.ok(vercel.rewrites.some(({ source, destination }) => source === "/api/ipbl/(.*)" && destination === "https://api1.ipbl.pro/$1"));
assert.ok(readFileSync("lib/server/results-sync-constants.ts", "utf8").includes('IPBL_API_BASE = "https://api1.ipbl.pro"'));
console.log("Official source routing uses direct IPBL API without retired Cloudflare Worker");
