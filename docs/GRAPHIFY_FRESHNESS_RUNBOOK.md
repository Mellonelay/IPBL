# Graphify Freshness Runbook

This runbook keeps the repo-local Graphify artifacts and God Node/community surfaces fresh after closure-package updates.

Current graph artifact paths:
- [graphify-out/graph.json](/root/repos/IPBL/graphify-out/graph.json)
- [graphify-out/GRAPH_REPORT.md](/root/repos/IPBL/graphify-out/GRAPH_REPORT.md)
- [graphify-out/graph.html](/root/repos/IPBL/graphify-out/graph.html)
- [graphify-out/obsidian/](/root/repos/IPBL/graphify-out/obsidian/)
- [graphify-out/.graphify_analysis.json](/root/repos/IPBL/graphify-out/.graphify_analysis.json)
- [graphify-out/.graphify_ast.json](/root/repos/IPBL/graphify-out/.graphify_ast.json)

Current God Node and community artifact paths:
- [artifacts/graphify/god-node-ledger.json](/root/repos/IPBL/artifacts/graphify/god-node-ledger.json)
- [artifacts/graphify/phase-roadmap.json](/root/repos/IPBL/artifacts/graphify/phase-roadmap.json)
- [artifacts/graphify/freshness/graphify-freshness-report.json](/root/repos/IPBL/artifacts/graphify/freshness/graphify-freshness-report.json)
- [artifacts/graphify/freshness/god-node-freshness-report.json](/root/repos/IPBL/artifacts/graphify/freshness/god-node-freshness-report.json)
- [.code-review-graph/graph.db](/root/repos/IPBL/.code-review-graph/graph.db)

## Freshness risks

- Graphify output can lag behind documentation updates after closure packaging.
- God Node and phase-roadmap summaries can drift from the latest graph extraction.
- Community structure can become stale after large doc or code edits.
- The evidence index can drift from the graph if supersession links are not refreshed.

## Regenerate

1. Update the graph snapshot after repo edits:
   - `graphify update .`
2. Re-run targeted graph queries:
   - `graphify query "phase closure evidence supersession"`
   - `graphify path "live-source" "operator-intelligence"`
   - `graphify explain "God Node"`
3. Refresh the evidence manifests that cite graph outputs.

## Verify

- Parse `graphify-out/graph.json` with `python -m json.tool`.
- Confirm `graphify-out/GRAPH_REPORT.md` still lists the expected communities and hubs.
- Check the God Node ledger for the current materialization status.
- Run the targeted repo tests that depend on Graphify-backed surfaces:
  - `npm run test:source-archaeology-graph`
  - `npm run test:runtime-agent-graph`
  - `npm run test:visualization-catalog`

## Detect drift

- If `graphify-out/graph.json` changes but the God Node ledger does not, refresh the ledger.
- If the phase roadmap or evidence index references a missing artifact path, treat it as drift.
- If graph validation passes but the doc claims a different phase state, treat the doc as stale.
- If a community or hub label disappears unexpectedly, rerun the extraction before closing the package.

