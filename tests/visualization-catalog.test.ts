import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { buildVisualizationCatalog, VISUALIZATION_CATALOG_ARTIFACT_PATH } from "../lib/server/visualization-catalog.ts";

const artifact = JSON.parse(fs.readFileSync(VISUALIZATION_CATALOG_ARTIFACT_PATH, "utf8")) as Record<string, unknown>;
const catalog = buildVisualizationCatalog();

assert.equal(catalog.schema, "ipbl.visualization-catalog.v1");
assert.equal(catalog.phase, 13);
assert.equal(catalog.status, "materialized");
assert.equal(catalog.readOnly, true);
assert.ok(catalog.sources.graphify.graphJson.endsWith(path.join("graphify-out", "graph.json")));
assert.ok(catalog.sources.graphify.graphReport.endsWith(path.join("graphify-out", "GRAPH_REPORT.md")));
assert.ok(catalog.sources.obsidian.directory.endsWith(path.join("graphify-out", "obsidian")));
assert.ok(catalog.sources.obsidian.fileCount > 0);
assert.equal(catalog.targets.graphistry.status, "planned");
assert.equal(catalog.targets.gephi.status, "planned");
assert.equal(catalog.targets.neo4j.status, "optional");
assert.deepEqual(catalog, artifact);

console.log("Visualization catalog tests passed");
