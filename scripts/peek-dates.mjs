import { readFileSync } from "node:fs";
const j = JSON.parse(readFileSync(process.argv[2], "utf8"));
for (const row of j.data?.items ?? []) {
    console.log(row.game?.localDate, row.game?.id);
}
