## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, invoke the `skill` tool with `skill: "graphify"` before doing anything else.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).

## Closure Workflows

- `graphify-source-archaeology`: use when the task is about Graphify evidence, graph relationships, or source archaeology.
- `live-source-repair`: use when the task touches `api/results/live.ts`, bookmaker parsing, recorder freshness, or Vercel live runtime behavior.
- `vercel-verification`: use when the task needs production deployment proof, browser-side verification, or live API checks.
- `evidence-finalization`: use when phase manifests, supersession indexes, or durable proof bundles need to be normalized.
- `gen-planning`: use when the task is about operator intelligence, roadmap closure, or phase packaging rather than runtime behavior.
