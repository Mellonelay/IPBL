import { readFileSync } from "node:fs";

const path = process.argv[2] || "/tmp/cal.json";
const j = JSON.parse(readFileSync(path, "utf8"));
const items = j.data?.items ?? [];
const byDay = {};
for (const row of items) {
    const raw = String(row.game?.localDate ?? "").trim();
    const d = raw.split("T")[0].split(" ")[0];
    if (!d) continue;
    byDay[d] = (byDay[d] ?? 0) + 1;
}
const march = Object.keys(byDay)
    .filter((k) => k.startsWith("2026-03"))
    .sort();
console.log("Total items:", items.length);
console.log("March days with >=1 game:", march.length);
for (const k of march) console.log(k, byDay[k]);
const expected = 31;
const missing = [];
for (let day = 1; day <= expected; day += 1) {
    const key = `2026-03-${String(day).padStart(2, "0")}`;
    if (!byDay[key]) missing.push(key);
}
console.log("March days with ZERO games in API response:", missing.length);
if (missing.length) console.log(missing.join(", "));
