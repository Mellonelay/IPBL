# C9 — Official IPBL Revival + 1xBet-family / EventsStat Intelligence Integration

## Purpose

C9 upgrades IPBL from live-score fallback into a source-backed game intelligence system. The new evidence proves two major changes:

1. `ipbl.pro/live` and `api1.ipbl.pro` official resources are reachable again from VM probes.
2. `GetHistoryGraphExt?gameId=<id>&coefView=3&lng=en&partner=8` returns EventsStat `EG` odds graph data and `SH` score history for current Melbet/IPBL games.

## Track A: Official IPBL revival

Official IPBL is the canonical sport-data layer: schedule, divisions, team IDs, game IDs, box score, player/team statistics, standings, division tree and metadata.

The first C9 proof captured HTTP 200 from official endpoints including `ipbl.pro/live`, widget assets, `/calendar/online`, `/games/game`, `/box-score`, `/team/games`, `/standings/actual`, and `/divisions/tree`. Worker proxy probes also returned HTTP 200 for tested calendar paths.

The approved 11-division boundary remains unchanged. Extra official divisions are evidence only and are not added to production.

## Track B: EventsStat intelligence

1xBet-family / Melbet EventsStat is the betting-market intelligence layer: odds movement, score-history graph, market series, source cross-checking and future odds-vs-score divergence features.

The proven endpoint shape is:

```text
https://melbet.com/service-api/LiveFeed/GetHistoryGraphExt?gameId=<gameId>&coefView=3&lng=en&partner=8
```

The response envelope contains `Value.EG` and `Value.SH`:

- `EG`: odds/event graph series. Each series includes market metadata under `E` and odds prices under `C`.
- `SH`: score history series. Exact score timestamp semantics require deeper schema extraction before production ingestion.

## Initial C9 types

- `OddsMovementPoint`
- `ScoreHistoryPoint`
- `MarketSeries`
- `SelectionSeries` (planned)
- `ScoreDeltaEvent` (planned)
- `LeadChangeEvent` (planned)
- `QuarterRunEvent` (planned)
- `MovementDivergence` (planned)
- `MarketVolatility` (planned)
- `SourceHealthAttachedSnapshot` (planned)
- `IdentityConfidence` (planned)

## Safety gates

No production odds features are deployed in this proof. Before production ingestion, require fixtures, parser tests, source policy review, Graphify evidence, retention/write-budget design and UI/API review.

Do not fabricate probabilities. Do not map unverified teams. Do not disable TLS. Do not add divisions.
