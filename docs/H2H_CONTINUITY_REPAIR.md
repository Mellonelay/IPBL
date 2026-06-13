# H2H Continuity Repair

The H2H block can be fresher than Results KV when official confirmed results are available in `/calendar` but the monthly Results KV cache has not yet caught up.

`/api/teams/history` now merges two official overlays into Results KV history:

1. current `/calendar/online` rows for live games;
2. recent `/calendar?from=<date>&to=<date>` confirmed rows for the last several days.

Rows are still accepted only when they match the requested approved division and requested team ID, have a real official game ID, and have a score. Dedupe remains by game ID, and sorting remains newest-first.

This specifically fixes the case where Novokuznetsk vs Izhevsk displayed `13.06` and then jumped back to `10.06` while official confirmed calendar data contained `12.06`.

## Daily window hotfix

The official `/calendar` endpoint can omit intermediate confirmed rows when queried with one broad range. The implementation therefore queries recent one-day windows and deduplicates by official game ID before merging into Results KV.
