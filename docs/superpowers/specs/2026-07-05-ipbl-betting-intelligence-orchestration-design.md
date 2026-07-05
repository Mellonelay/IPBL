# IPBL Betting Intelligence Orchestration Design

## Goal

Replace static bet-history pattern mining with a live quarter-flow intelligence layer that watches recorder timelines, odds movement, and replay evidence, then feeds the current betting runtime with deterministic signals and Cloudflare Worker AI summaries.

## Product Purpose

IPBL exists to support betting assistance and prediction, not generic repo analysis. The core surfaces are:

- live feed monitoring;
- odds and quarter-by-quarter analysis;
- live recorder and historical replay;
- betting memory and style tracking;
- H2H, results, and team statistics for decision support.

That means the intelligence layer must learn from betting artifacts and evidence, then turn them into signals for the operator surface.

## Architecture

This design extends the existing IPBL betting stack rather than replacing it. The current live recorder, replay engine, odds timeline, H2H, Team Statistics, and prediction runtime remain the source of truth for evidence. A new live pattern layer consumes those timelines and turns quarter-by-quarter score changes, minute-window shifts, and odds movement into reusable signals.

Graphify participates as a reasoning substrate, not as a codebase-maintenance tool. `graphify-intent` extracts the why behind betting rules and recorder behavior, while `graphify-temporal` orders evidence across time so quarter transitions, stale rows, and replay chains can be reasoned about consistently. Workers AI sits on top of those Graphify outputs and the live evidence stream to produce summaries, risk labels, and current-match recommendations. `agnix` stays in the config-validation lane and does not decide live betting logic.

What to keep from Graphify:

- `graphify-intent` for the why behind betting rules, recorder behavior, quarter logic, and prediction decisions.
- `graphify-temporal` for quarter timelines, odds movement, replay ordering, and event sequencing.
- Graphify as the graph substrate for IPBL betting evidence.
- source-archaeology style analysis for official versus bookmaker versus fallback lineage.

What to drop from the product path:

- `code-review-graph` as a runtime feature; it stays maintenance-only and out of the betting intelligence path.

Graphify upgrade policy:

- pin the current behavior first;
- run graph contract tests;
- upgrade in a controlled branch;
- re-run the same tests before adoption.

## Tech Stack

- TypeScript
- Existing Vercel API routes and runtime modules
- Cloudflare Workers, Workers AI, Durable Objects, and Workflows
- Existing IPBL live recorder, replay, odds, and prediction modules
- Graphify outputs and repo artifacts
- `agnix` validation
- Existing Node-based test harness

## Global Constraints

- The canonical 14 approved live divisions remain unchanged.
- Live recorder and history contracts remain intact.
- Pattern discovery must be driven from live quarter timelines and odds movement, not from static bet-history aggregation.
- Workers AI is used only for the Graphify intelligence layer and prediction synthesis.
- No VM executor belongs in the production analysis path.
- Graphify community skill integration is limited to `graphify-intent` and `graphify-temporal` for the live intelligence path.
- `code-review-graph` is excluded from the betting runtime and remains a maintenance-only tool.
- Graphify upgrades must be gated by artifact/schema contract tests before adoption.
- `agnix` validates agent, skill, and config wiring only.
- All intelligence outputs remain read-only artifacts or runtime responses derived from repository and live evidence.

## Components

### 1. Live Quarter-Flow Pattern Layer

This component replaces the current static aggregate-only pattern mining path with a live timeline analyzer.

Responsibilities:

- read quarter snapshots from the recorder timeline;
- read odds snapshots from the odds timeline;
- detect transitions such as `Q1 under -> Q2 over`, early slow start followed by late acceleration, and late-quarter scoring spikes;
- emit deterministic pattern records with stable identifiers, evidence references, and confidence;
- keep legacy bet-history pattern mining separate so it can remain available for backtests without polluting live signals.

### 2. Prediction Runtime Integration

This component turns live pattern records into the runtime prediction envelope already consumed by the live UI and API surfaces.

Responsibilities:

- attach live pattern signals to prediction rows;
- preserve the existing prediction calibration and drift logic;
- fall back to deterministic scoring when the live pattern layer has insufficient evidence;
- keep the prediction response cache policy unchanged.

### 3. Cloudflare Intelligence Orchestrator

This component is a worker-side analysis service that runs Graphify-assisted betting intelligence jobs.

Responsibilities:

- accept a request or scheduled trigger to refresh live intelligence;
- coordinate job state with Durable Objects;
- run multi-step workflows for backfill, replay refresh, and signal regeneration;
- call Workers AI only for synthesis, summarization, ranking, and current-signal language generation;
- persist latest intelligence snapshots separately from the live product API.

### 4. Graphify and agnix Guardrails

This component keeps the repo’s intelligence stack stable and upgradeable.

Responsibilities:

- treat `graphify-intent` as the reasoning pass for betting rules, recorder behavior, and phase rationale;
- treat `graphify-temporal` as the ordering pass for live evidence and replay chains;
- keep `code-review-graph` out of the live runtime path;
- validate agent and skill wiring with `agnix`;
- pin and audit Graphify changes through artifact and schema tests before any version bump is adopted.

### 5. Validation Harness

This component proves the new behavior without depending on production-only systems.

Responsibilities:

- test live quarter-flow transitions from recorder/replay fixtures;
- test odds movement participation in signal generation;
- test prediction runtime integration;
- test Cloudflare worker contract behavior with deterministic mocks;
- test Graphify artifact compatibility and agnix config validation.

## Data Flow

1. The live recorder captures quarter snapshots and odds snapshots from the approved live divisions.
2. The replay engine merges quarter and odds timelines into one ordered evidence stream.
3. The live quarter-flow pattern layer detects scoring transitions, pace changes, and quarter-specific trends.
4. Graphify intent and temporal passes turn repository and evidence notes into structured reasoning artifacts.
5. The Cloudflare orchestrator uses those artifacts plus the live evidence stream to generate current intelligence packets with Workers AI.
6. The prediction runtime consumes those packets and exposes them to the live app.
7. The UI continues to render the live feed, results, and history surfaces without owning source truth.

## Error Handling

- If a live game has too little quarter data, the pattern layer emits no signal instead of inventing one.
- If odds movement is unavailable, the pattern layer continues from score and quarter timing evidence only.
- If a worker-side intelligence job fails, the orchestrator keeps the last known good snapshot and logs the failure state.
- If Workers AI is unavailable, the orchestrator falls back to deterministic extraction and summarization.
- If Graphify artifacts drift from the expected schema, the build fails closed before the worker path is enabled.
- If `agnix` reports config drift, the repository remains in validation-failed state until the wiring is corrected.

## Testing

The design is satisfied only if the following are covered:

- live quarter-flow pattern tests for under-to-over and slow-to-fast transitions;
- replay engine tests that preserve score and odds event ordering;
- prediction runtime tests that include live pattern signals in the runtime envelope;
- Cloudflare worker/orchestrator unit tests with mocked Workers AI and durable state;
- Graphify contract tests for the expected intent/temporal artifact inputs;
- `agnix` validation for the relevant config and agent files.

## Non-Goals

- Reworking the live recorder contract.
- Rebuilding H2H, Team Statistics, or results history from scratch.
- Adding VM executor logic to the production runtime path.
- Using `code-review-graph` as a live betting signal source.
- Replacing deterministic recorder evidence with model-only inference.

## Open Decision

The new live pattern layer should be introduced as a separate module rather than overwriting the existing historical `pattern-discovery.ts`. That keeps backtests and live flow analysis isolated and makes the migration easier to validate.
