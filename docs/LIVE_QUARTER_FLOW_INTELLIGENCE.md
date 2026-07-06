# Live Quarter-Flow Intelligence

This document describes the betting-intelligence path that watches live quarters, odds movement, and replay evidence.

## Purpose

IPBL's live intelligence layer exists to support betting assistance and prediction:

- live feed monitoring;
- quarter-by-quarter analysis;
- odds movement tracking;
- live recorder and replay evidence;
- betting memory and style tracking;
- H2H, results, and team-stat decision support.

The live path is not repo code analysis. It is a betting evidence pipeline.

## Data Flow

1. The live recorder captures approved live divisions.
2. The replay engine orders quarter and odds events into a single timeline.
3. The live quarter-flow pattern layer extracts deterministic signals such as:
   - `q1-slow-q2-fast`
   - `q1-under-q2-over`
4. The prediction runtime attaches the strongest live signal to each live row.
5. The Graphify worker packages those signals with the repository evidence layer.
6. The packet can also include a betting-record summary so the AI can compare live signals against recent betting history.
7. Workers AI turns the packet into a concise operator-facing summary.

## Graphify Role

Use:

- `graphify-intent` for the why behind live betting rules, recorder behavior, and prediction decisions;
- `graphify-temporal` for evidence ordering and quarter replay sequencing.

Do not use:

- `code-review-graph` as a live betting signal source.

## Worker Role

The worker package lives in:

- `workers/graphify-intelligence/src/index.ts`
- `workers/graphify-intelligence/src/orchestrator.ts`
- `workers/graphify-intelligence/src/worker-ai.ts`
- `workers/graphify-intelligence/src/state.ts`

It is responsible for:

- building the live intelligence packet;
- keeping the worker-side summary deterministic when AI is unavailable;
- storing the latest snapshot in a bounded state container;
- exposing a small fetch surface for refresh and inspection.

## Validation

Run:

```bash
npm run test:live-quarter-flow-docs
npm run test:graphify-intelligence
npm run test:analysis-engine
```

If the live pattern or worker contract changes, update this doc and the corresponding tests together.
