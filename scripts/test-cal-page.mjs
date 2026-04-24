const u = new URL(process.argv[2] || "https://api.ipbl.pro/calendar");
const res = await fetch(u, { headers: { Accept: "application/json" } });
if (!res.ok) {
    console.error("HTTP", res.status, await res.text());
    process.exit(1);
}
const j = await res.json();
if (j.error) {
    console.error("API error", j);
    process.exit(1);
}
const items = j.data?.items ?? [];
console.log("url", u.toString());
console.log("items len", items.length, "totalCount", j.data?.totalCount, "index", j.data?.index);
console.log("first localDate", items[0]?.game?.localDate);
console.log("last localDate", items.at(-1)?.game?.localDate);
