import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const routeSource = readFileSync(new URL("../../api/results/live.ts", import.meta.url), "utf8");
assert.match(routeSource, /official:api1\.ipbl\.pro/, "Live route must identify the official source");
assert.match(routeSource, /worker\.mloneslot99\.com\/ipbl-proxy/, "Live route must use the TLS-safe Worker proxy");
assert.match(routeSource, /ipbl-66-m-pro-u/, "Live route must include current Men U");
assert.match(routeSource, /ipbl-66-w-pro-g/, "Live route must include current Women G");
assert.doesNotMatch(routeSource, /1xlite|GetSportsShortZip/, "Live route must not use the outage-era source");
assert.match(routeSource, /Asia\/Yangon/, "Live route must return Myanmar display time");
