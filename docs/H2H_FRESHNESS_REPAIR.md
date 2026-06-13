# H2H Freshness Repair

H2H and Team Statistics history normally read finished games from Results KV through `/api/teams/history`.

The current-day official live source can be fresher than Results KV. To avoid stale H2H drawers, `/api/teams/history` now merges current official `/calendar/online` rows for the requested approved division and team into the Results-backed history response.

Rules:

- Results KV remains the historical source of truth.
- Official online rows are accepted only when the row matches the requested approved `divisionTag` and `teamId`.
- Rows must have a real official game ID and score.
- Dedupe is by game ID; current official rows override stale stored rows for the same game ID.
- Sorting remains newest-first by scheduled time, then game ID.
- No odds data is deployed or inferred.

This fixes cases where H2H displayed only historical results such as `10.06` while official IPBL already had a current `13.06` live game.
