import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const sql = readFileSync(
  new URL("../supabase/migrations/20260731153933_seed_official_team_aliases.sql", import.meta.url),
  "utf8"
);

const aliases = [...sql.matchAll(
  /^\s*\((\d+), '([^']+)', '([^']+)'\),?$/gm
)];
const teamIds = aliases.map((match) => Number(match[1]));
const divisionTags = aliases.map((match) => match[3]);

assert.equal(aliases.length, 54, "expected all 54 official team aliases");
assert.equal(new Set(teamIds).size, 54, "official team IDs must be unique");
assert.equal(new Set(divisionTags).size, 14, "all 14 divisions must be covered");
assert.match(sql, /insert into public\.team_aliases/i);
assert.match(sql, /on conflict \(source, division_id, source_team_id\)/i);
assert.doesNotMatch(sql, /\b(drop|truncate)\b/i);
assert.doesNotMatch(sql, /supabase[_-]?(secret|service_role)|postgres(?:ql)?:\/\//i);

console.log("Supabase official alias seed contract tests passed");
