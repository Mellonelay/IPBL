# Visualization Drilldown Upgrade Plan

Phase 13 is complete, but the visualization package can still be tightened around read-only drill-down fidelity.

## Frontend-owned surfaces

- Navigation into graph and evidence drill-downs.
- Catalog presentation for Graphify, Obsidian, and code-review graph exports.
- Read-only export views and discovery affordances.
- Presentation of relationships, not ownership of canonical truth.

## Backend-owned data contracts

- [artifacts/visualization/visualization-catalog.json](/root/repos/IPBL/artifacts/visualization/visualization-catalog.json)
- [lib/server/visualization-catalog.ts](/root/repos/IPBL/lib/server/visualization-catalog.ts)
- [tests/visualization-catalog.test.ts](/root/repos/IPBL/tests/visualization-catalog.test.ts)
- [artifacts/evidence/evidence-supersession-index.json](/root/repos/IPBL/artifacts/evidence/evidence-supersession-index.json)
- [artifacts/graphify/freshness/graphify-freshness-report.json](/root/repos/IPBL/artifacts/graphify/freshness/graphify-freshness-report.json)
- [artifacts/graphify/freshness/god-node-freshness-report.json](/root/repos/IPBL/artifacts/graphify/freshness/god-node-freshness-report.json)

## Graph / evidence drill-down map

- Graphify graph and report anchor the source layer.
- Evidence supersession index explains what replaced what.
- Workload graph binds live, results, H2H, recorder, and operator intelligence surfaces.
- Visualization catalog exposes those read-only surfaces without taking truth ownership.

## Export fidelity requirements

- Preserve stable artifact paths.
- Preserve schema and phase labels.
- Preserve node and evidence identifiers.
- Do not infer or rewrite source truth in the frontend.
- Keep exports read-only and reproducible.

## UI verification checklist

- `npm run test:visualization-catalog`
- `npm run build`
- Browser inspect the catalog pages if a browser tool is available.
- Confirm the UI surfaces paths and relationships rather than rewriting them.
- Confirm no write actions are exposed through the visualization layer.

