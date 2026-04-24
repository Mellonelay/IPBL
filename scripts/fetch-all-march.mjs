import { writeFileSync } from "node:fs";

const tags = [
    "ipbl-66-m-pro-a",
    "ipbl-66-m-pro-b",
    "ipbl-66-m-pro-c",
    "ipbl-66-m-pro-d",
    "ipbl-66-m-pro-g",
    "ipbl-66-m-pro-j",
    "ipbl-66-w-pro-a",
    "ipbl-66-w-pro-b",
    "ipbl-66-w-pro-c",
];

function normDate(raw) {
    const trimmed = String(raw ?? "").trim().split("T")[0].split(" ")[0];
    const m = trimmed.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    if (m) return `${m[3]}-${m[2]}-${m[1]}`;
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    return trimmed;
}

const byDay = {};
for (const tag of tags) {
    const u = `https://api.ipbl.pro/calendar?tag=${encodeURIComponent(tag)}&from=01.03.2026&to=01.04.2026&lang=en`;
    const res = await fetch(u, { headers: { Accept: "application/json" } });
    const j = await res.json();
    const items = j.data?.items ?? [];
    for (const row of items) {
        const d = normDate(row.game?.localDate);
        if (!d.startsWith("2026-03")) continue;
        byDay[d] ??= {};
        byDay[d][tag] = (byDay[d][tag] ?? 0) + 1;
    }
    console.log(tag, "items", items.length);
}

const days = Object.keys(byDay).sort();
console.log("\nDistinct March days with any game (any division):", days.length);
for (const d of days) {
    const n = Object.values(byDay[d]).reduce((a, b) => a + b, 0);
    console.log(d, "total", n);
}

const missing = [];
for (let day = 1; day <= 31; day += 1) {
    const key = `2026-03-${String(day).padStart(2, "0")}`;
    if (!byDay[key]) missing.push(key);
}
console.log("\nMarch days with NO games in ANY division:", missing.length, missing.join(", ") || "(none)");
