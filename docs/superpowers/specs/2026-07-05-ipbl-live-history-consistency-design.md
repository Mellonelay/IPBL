# IPBL Live History Consistency Design

## Goal

Make the IPBL app consistent across live, results, and team-history surfaces by:

- treating 14 divisions as the canonical approved registry;
- rebuilding historical results from the official IPBL schedule page from June 1, 2026 through the current date;
- keeping H2H and Team Statistics newest-first and anchored to verified match history;
- showing a per-card live source badge without mixing source presentation into the history repair flow.

## Architecture

This change is an umbrella design for four tightly related but independently testable slices:

1. canonical division registry;
2. official daily backfill for results history;
3. history consumer ordering and H2H freshness;
4. live source badge presentation.

The data path should be:

official IPBL schedule pages -> daily backfill -> Results KV monthly history -> `/api/teams/history` -> Team Statistics and H2H.

The live path remains separate:

official live rows + bookmaker mirror rows -> freshness merge -> live cards.

The live source badge is a UI concern that reads provenance from the live row that won the freshness merge; it must not change the merge algorithm itself.

## Tech Stack

- TypeScript
- Vercel API routes
- Results KV
- existing IPBL schedule/calendar parser and history merge helpers
- browser verification via the existing Playwright scripts
- repo validation scripts and graphify-backed repo checks

## Global Constraints

- Canonical division registry contains 14 divisions: `Pro Men A`, `Pro Men B`, `Pro Men C`, `Pro Men D`, `Pro Men G`, `Pro Men U`, `Pro Men Z`, `Pro Men L`, `Pro Women A`, `Pro Women B`, `Pro Women C`, `Pro Women D`, `Pro Women G`, and `Pro Women K`.
- `Pro Men G` is visible in the approved registry; it is not treated as an invisible historical-only exception.
- Historical results backfill starts at `2026-06-01` and runs through the current date.
- Historical coverage must be derived from the official IPBL schedule/calendar source, one day at a time, not by trusting broad-range aggregation alone.
- H2H and Team Statistics must sort histories newest-first by scheduled time, then game id.
- Live source presentation stays separate from results history repair.
- No betting prediction, c9, agnix, or unrelated roadmap work belongs in this change.

## Data Model

### Canonical division registry

The division registry must be the single source of truth for:

- live division lists;
- results division lists;
- team-statistics division lists;
- validation expectations.

The registry must include the 14 approved tags and labels above, and tests should fail if that list drifts.

### Results metadata

Backfilled result months should carry metadata that can express:

- `status: ok | source_unavailable | legacy`;
- `checkedAt`;
- `updatedAt`;
- `verifiedThroughDate`;
- `fetchedRows`;
- `acceptedRows`;
- `mergedRows`;
- `duplicatesCollapsed`;
- `rejectedNonFinished`;
- `partialPeriodRows`;
- `quarantinedPeriodRows`.

The metadata needs to make it obvious whether a month is:

- fully verified from the official schedule source;
- partially reconstructed;
- or preserved because the source was temporarily unavailable.

### Live source provenance

Each live card should be able to display a small source badge derived from the live row that won the freshness merge:

- `IPBL` for official live rows;
- `Melbet` for melbet mirror rows;
- `1xBet` for 1xbet mirror rows.

If the winning row cannot be classified cleanly, the UI should fall back to a neutral `Source` badge rather than inventing provenance.

## Components

### 1. Canonical division registry

Update the division configuration so every consumer sees the same 14 approved tags.

Responsibilities:

- expose the canonical 14-tag list;
- keep human-readable labels centralized;
- keep month-specific validity rules only where they are historically necessary;
- make the live and results selectors reuse the same registry.

### 2. Daily official history backfill

Introduce a backfill workflow that iterates from June 1, 2026 to the current date and fetches the official IPBL schedule/calendar source one day at a time for each approved division.

Responsibilities:

- query each day separately so day-level gaps do not vanish inside a broad range;
- deduplicate by game id;
- keep only finished/confirmed rows for history storage;
- persist monthly buckets into Results KV;
- update metadata with the last date that was verified.

### 3. History consumer normalization

Keep `/api/teams/history` as the single public history API, but make it read from:

- Results KV months;
- current official online rows;
- recent official daily calendar windows.

Responsibilities:

- merge by game id;
- preserve newest-first ordering;
- ensure H2H and Team Statistics see the same history order;
- reject rows that do not match the requested approved team/division pair;
- never backfill with bookmaker-only data.

### 4. Live source badge UI

Add a small badge to each live card.

Responsibilities:

- display source provenance from the live row that won the freshness merge;
- keep badge text concise;
- keep card layout readable on both men and women live sections;
- match the existing theme palette instead of hardcoding a white badge or page treatment.

### 5. Validation harness and runtime evidence

The repository already has validation scripts and browser verification helpers. Extend them so this change has a repeatable proof path.

Responsibilities:

- fail fast if the 14-division registry drifts;
- prove history ordering is newest-first;
- prove June-forward backfill coverage exists for the official schedule source;
- prove the H2H drawer still resolves after the history changes;
- leave a browser/runtime evidence trail for the known June gap example.

## Data Flow

### Results history flow

1. The backfill job walks the official schedule source day by day from `2026-06-01` to today.
2. Verified rows are normalized into monthly Results KV buckets.
3. `/api/teams/history` reads Results KV and overlays fresh official rows when needed.
4. Team Statistics and H2H consume the same ordered result history.

### Live flow

1. Official live rows and bookmaker mirror rows are fetched separately.
2. Freshness merge chooses the best row for each matchup.
3. The chosen row keeps source provenance.
4. The live card renders the provenance badge alongside the match card.

## Error Handling

- If a daily official schedule fetch fails, mark that day as unavailable and continue with the rest of the range.
- If a monthly backfill is incomplete, preserve the verified portion and advertise the verification boundary in metadata.
- If a live source cannot be classified, fall back to a neutral source badge rather than blanking the card or inventing a source.
- If Results KV is missing for a month, `/api/teams/history` should still expose current official overlay rows where available.
- If a row does not match the requested approved division or team, discard it before it reaches H2H or Team Statistics.

## Testing

The spec is satisfied only if the following are covered:

- registry tests for the 14 approved divisions;
- sync-policy tests for June-forward result tags;
- team-history tests that assert newest-first ordering and deduplication;
- browser verification of the H2H drawer against a known June example;
- live-feed tests that keep freshness merge behavior intact while source badges are added.

## Non-Goals

- Betting prediction changes.
- c9 or agnix feature work.
- Reworking the bookmaker parser beyond what is needed to preserve live source provenance.
- New analytics dashboards or unrelated UI redesigns.

## Open Decision

The design assumes `Pro Men G` is part of the canonical visible 14-division registry. If a future product decision removes it again, that change must be explicit and accompanied by a matching test update.

