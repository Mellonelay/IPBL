# IPBL Intelligence Surface Split Design

## Goal

Keep the live betting workflow fast while moving analysis, Graphify synthesis, recorder/history detail, and phase coverage into a dedicated `Intelligence` path that the operator can inspect on demand.

## Product Purpose

IPBL exists for betting assistance and prediction. The live surface should help decide what to do now. The intelligence surface should explain why, show which backend layers are healthy, and expose the analysis chain without flooding the live drawer with detail.

## Architecture

This design preserves the existing live/results/team-history/recording stack as the source of truth, then adds one dedicated operator tab for synthesis. The live tab stays decision-first: score, quarter flow, short live decision, and a compact handoff into the deeper intelligence view.

The new `Intelligence` path is the public summary surface for:

- Graphify-backed betting analysis;
- Cloudflare Worker AI synthesis;
- analysis-engine and operator-intelligence phase summaries;
- recorder and history health;
- selected evidence links back into Live, Results, Teams, and Betting Record.

Raw Graphify internals, agnix config state, and full replay/H2H dumps remain backend or drill-down surfaces only. They are still present in the repo for auditability, but they are not the primary frontend experience.

## Proposed UI Split

### Live

The live card and drawer should keep only the decision-critical content:

- score block;
- current quarter and live clock;
- live decision block;
- a short historical risk summary;
- a button or link into `Intelligence`.

Remove the long evidence blocks from the drawer by default:

- odds movement timelines;
- full H2H lists;
- team-risk lists;
- matchup-risk lists.

### Intelligence

The new tab should show:

- the latest Graphify Worker AI packet;
- recommended bias, confidence, and next action;
- analysis-engine and operator-intelligence status;
- recorder and history freshness;
- compact phase/ledger coverage;
- links back to the live and evidence surfaces.

## Backend Exposure Policy

Expose these to the frontend:

- `api/results/live`
- `api/predictions/live`
- `api/recorder`
- `api/teams/history`
- `api/gen-analysis`
- read-only summary routes for `analysis-engine` and `operator-intelligence`

Keep these backend-only or drill-down only:

- raw Graphify graph internals;
- agnix config details;
- worker prompt text;
- artifact JSON payloads as primary UI content;
- full replay lists inside the default live drawer.

## Data Flow

1. Live match data updates.
2. Recorder and history APIs keep evidence current.
3. `api/gen-analysis` packages betting history plus signals and asks the Graphify Worker for synthesis.
4. The frontend `Intelligence` tab fetches the summary routes and renders one consolidated operator view.
5. The live drawer links to that synthesis view instead of duplicating it.
6. Phase documentation and artifacts stay as the audit trail behind the UI.

## Non-Goals

- Rewriting the recorder.
- Replacing existing results or team-history contracts.
- Moving Graphify into the browser.
- Showing raw backend artifacts as the main UI.
- Adding new betting logic.

## Testing

The design is satisfied only if:

- the new summary routes return the expected read-only reports;
- the `Intelligence` tab renders the synthesis surface from those reports;
- the live drawer no longer exposes the removed evidence dumps by default;
- the build and validation scripts still pass.

