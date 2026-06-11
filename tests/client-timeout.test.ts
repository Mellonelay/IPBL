import assert from "node:assert/strict";
import fs from "node:fs";
const source = fs.readFileSync(new URL("../src/api/client.ts", import.meta.url), "utf8");
assert.match(source, /const REQUEST_TIMEOUT_MS = 20_000;/);
assert.match(source, /controller\.abort\(\), REQUEST_TIMEOUT_MS/);
assert.doesNotMatch(source, /controller\.abort\(\), 8000/);
console.log("client request timeout regression passed");
