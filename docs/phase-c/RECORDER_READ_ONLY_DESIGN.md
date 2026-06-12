# Phase C Read-Only Recorder Design

```text
GetSportsShortZip league discovery
→ filter league IDs 2496666 and 2496667
→ extract rotating `G[].I` game IDs
→ validate team identities against the approved 44-team registry
→ GetGameZip for accepted active games
→ normalize score, period, elapsed time, quarter splits, statistics and markets
→ compute in-memory transitions
→ emit local fixture timeline and health metrics
→ no Redis/KV writes
```

## State contracts

- `LeagueSnapshot`: league identity and current game list.
- `LiveGameSnapshot`: game/team/score/period/source fields.
- `StatisticsSnapshot`: named team statistics from `SC.ST`.
- `MarketDefinition`: flattened current market entries from `GE`/subgames.
- `SubscriptionOption`: period/event subscription capability.
- `ScoreHistoryPoint` and `OddsHistorySeries`: types reserved, parser blocked until a Level 4+ source is proven.
- `H2HRecord` and `MelZoneSnapshot`: types reserved, source not observed.

## Failure handling

- Preserve HTTP 406/404/aborted/pending evidence as fixtures or metadata.
- Never infer a missing game, team, quarter, H2H record, or odds point.
- A failed detail poll does not delete the last validated snapshot.
- League discovery controls game lifecycle; IDs are never hardcoded.

## Activation gates

Validated fixtures, parser tests, dry-run cadence measurements, retention policy, write budget, failure policy, cron authorization, and rollback evidence are all required before production writes.
