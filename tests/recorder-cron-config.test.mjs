import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const config=JSON.parse(readFileSync("vercel.json","utf8"));
assert.equal((config.crons||[]).filter(x=>x.path==="/api/cron/record-live").length,0);
console.log("Vercel Hobby daily recorder disabled");
