# IPBL Canonical Data Contract

## Truth layers

1. **Raw observation:** immutable payload received from an external source.
2. **Normalized evidence:** source-specific payload mapped to canonical division, team, game, score, period, and time fields.
3. **Canonical game state:** strongest accepted evidence after identity, chronology, and integrity checks.
4. **Read model:** bounded, screen-specific projection for Live, Results, H2H, team form, or quarter analysis.
5. **Interpretation:** statistical or AI output tied to an explicit evidence cutoff and version set.

Graphify may relate evidence and provenance. It cannot create official facts. AI may interpret versioned evidence. It cannot modify source observations or canonical records.

## Canonical entities

- `divisions`
- `teams`
- `team_aliases`
- `games`
- `game_periods`
- `source_observations`
- `current_live_state`
- `source_health`
- `backfill_runs`
- `backfill_segments`
- `backfill_failures`

## Required temporal fields

Every accepted game or observation must preserve the relevant subset of:

- `source_event_at`
- `received_at`
- `canonicalized_at`
- `source_updated_at`
- `created_at`
- `updated_at`

## Identity rules

- Official game ID is the idempotency key for canonical games.
- Canonical team IDs are internal UUIDs.
- Official and bookmaker team IDs/names are aliases with explicit source and division scope.
- Ambiguous aliases are quarantined; they do not create teams automatically.
- A game stores `pair_low_id` and `pair_high_id` derived from the two canonical team IDs.
- Teams on a game must be distinct and belong to the requested division evidence context.

## Game integrity

- Finished-game ingestion requires a supported finished status and non-negative scores.
- Complete period scores must reconcile with the final score.
- Partial period evidence is stored as partial, not fabricated or padded.
- Older observations cannot overwrite newer canonical state.
- Scores cannot decrease without an explicit correction event.
- Period progression cannot regress without an explicit correction event.
- Stronger verified evidence cannot be replaced by weaker evidence.
- Reprocessing the same official game creates no duplicate canonical row.

## Versioning

Canonical and derived records carry:

- `evidence_version`
- `normalizer_version`
- canonical source
- verification state
- correction version where applicable

Future predictions must additionally store `evidence_cutoff_at`, model version, feature version, and calibration version so backtests cannot read future evidence.

## Read models

Read models are screen-specific and bounded:

- `team_history_games`: canonical game rows shaped for team history and H2H loading.
- `h2h_matchup_summary`: direct-pair sample size, date range, and completeness.
- `team_recent_form`: newest verified finished games and outcomes for one team.
- `quarter_tendency_summary`: period sample counts and averages with missingness.
- `source_agreement_summary`: source coverage and disagreement for one game.

Every summary must expose sample size, complete-period count, missing evidence, observed date range, last update, and source coverage where applicable.

## Access rules

- Production writes are server-side only.
- Secret/service-role keys must never enter browser bundles.
- Anonymous and authenticated roles receive no direct mutation privileges.
- Vercel API routes expose bounded application responses rather than raw database access.
- Row-level security remains enabled on canonical tables even when server code uses a secret key.

## Retention rules

Raw observations are append-only except for explicit retention policy. Canonical rows may be corrected only through versioned reconciliation. Backfill run and segment records remain durable release evidence. Upstash data is preserved until canonical reconciliation is complete.
