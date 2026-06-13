# Phase E2 — Team Statistics and Quarter Profiles

## Status

Reconciled for the 12 approved IPBL live divisions and 46 verified current teams.

## Canonical architecture

```text
Official calendar evidence
  → normalized monthly Results KV
  → /api/teams/history
  → existing TeamHistoryGame parser contract
  → Team Statistics and H2H
```

Monthly Results remain the historical score backbone. Team Statistics does not maintain a second score database; it consumes the same `/api/teams/history` model as H2H, which now overlays current official online rows and recent official daily calendar windows when Results KV has not caught up.

## Active divisions

- Pro Men A, B, C, D, U, Z
- Pro Women A, B, C, D, G, K

The bootstrap team registry contains four verified current teams for each mature division and two currently verified teams for the new Pro Men Z boundary. Runtime match and statistics truth comes from `/api/teams/history` using stable official team IDs.

## Teams tab

The Teams tab provides:

- division and team selection;
- Last 5, Last 10, Last 30, and All available ranges;
- newest-first match history in Myanmar time;
- win/loss counts and average combined final total;
- average combined total for Q1–Q4;
- Q1→Q2, Q2→Q3, and Q3→Q4 increase frequencies;
- evidence counts and average point changes for every transition;
- links into the existing Game Details and H2H drawer;
- stable deep links using `tab`, `division`, `team`, and `range` query parameters.

## Evidence rules

- Percentages are computed from verified records in the selected range.
- Every percentage displays numerator and sample size.
- Partial quarter matrices contribute only to quarters/transitions actually present.
- No missing quarter is invented.
- No betting probability is asserted from a raw percentage without later backtesting.

## H2H integration

Both Team Statistics and H2H now use `/api/teams/history`, which aggregates available season months from Results KV, overlays current official online rows and recent official daily calendar windows, filters by official team ID and division, deduplicates by game ID, and returns the existing official-compatible history shape.

The unstable `api1.ipbl.pro/team/games` path is only a compatibility fallback. It is not the normal production source while its TLS hostname is invalid.

## Graphify role

Graphify maps and validates this dependency path:

```text
Results KV
  → Team history API
  → Team profile statistics
  → Teams UI
  → Game/H2H drawer
```

Graphify is not yet the runtime betting-intelligence calculator. Graph-driven matchup clustering and backtested recommendations remain later Phase E3/F/H work.

## Phase E2 reconciliation status

The reconciliation command is `npm run reconcile:team-statistics`. It verifies the 12-division registry, 46 verified teams, per-division team counts, production history endpoint status, history sample counts, quarter-matrix availability, and the shared no-odds policy.
