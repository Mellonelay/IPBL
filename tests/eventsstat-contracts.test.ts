import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { parseEventsStatHistoryGraph } from "../lib/server/eventsstat-contracts.ts";

const fixture = JSON.parse(await readFile(new URL("./fixtures/phase-c9/eventsstat-history-graph-ext.json", import.meta.url), "utf8"));
const parsed = parseEventsStatHistoryGraph(fixture);
assert.ok(parsed.markets.length > 0, "expected EG market series");
assert.ok(parsed.odds.length > 0, "expected odds movement points");
assert.ok(parsed.scoreHistory.length > 0, "expected SH score history points");
assert.ok(parsed.markets.some((market) => market.marketType !== null || market.marketGroup !== null), "expected market metadata");
assert.ok(parsed.odds.every((point) => Number.isFinite(point.price)), "expected finite odds prices");
await assert.rejects(async () => parseEventsStatHistoryGraph({ Success: false }), /eventsstat_history_graph_unsuccessful/);
await assert.rejects(async () => parseEventsStatHistoryGraph({ Success: true, Value: { EG: [], SH: [] } }), /eventsstat_history_graph_empty/);
console.log("EventsStat history graph contract tests passed");
