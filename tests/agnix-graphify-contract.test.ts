import assert from "node:assert/strict";
import fs from "node:fs";

const agnix = fs.readFileSync(".agnix.toml", "utf8");
const agents = fs.readFileSync("AGENTS.md", "utf8");
const roadmap = fs.readFileSync("docs/GRAPHIFY_INTELLIGENCE_ROADMAP.md", "utf8");

assert.match(agnix, /tools\s*=\s*\['claude-code'\]/);
assert.match(agents, /graphify query/i);
assert.match(agents, /graphify explain/i);
assert.match(roadmap, /Graphify -> Skill Forge -> agnix/i);
assert.match(roadmap, /graphify-intent/i);
assert.match(roadmap, /graphify-temporal/i);
assert.match(roadmap, /agnix/i);

console.log("agnix graphify contract tests passed");
