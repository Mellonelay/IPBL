# Phase C Endpoint Corpus Classification

Generated: 2026-06-12T16:56:54.006746+00:00

## Verified checkpoint

- Source catalog: `/root/runtime-audits/melbet-eventsstat-rotating-catalog-20260612T154054Z`
- Exact endpoints: 626
- Normalized patterns: 582
- Fresh verification: `/root/runtime-audits/ipbl-phase-c-contract-verification-20260612T165339Z`
- Production KV writes: **none**
- Cron activation: **not performed**
- Deployment: **not performed**

## Corpus families

| Family | Unique endpoints | Observations |
|---|---:|---:|
| analytics_ad | 59 | 89 |
| cdn_static | 423 | 1882 |
| external_static | 7 | 12 |
| first_party_config | 5 | 24 |
| first_party_livefeed | 11 | 32 |
| first_party_other | 1 | 6 |
| first_party_other_api | 15 | 125 |
| first_party_page_shell | 24 | 24 |
| first_party_results | 5 | 12 |
| first_party_static | 54 | 299 |
| first_party_subscription | 4 | 6 |
| support_widget | 18 | 104 |

## Contract conclusions

1. `GetSportsShortZip` is the verified replayable league-discovery contract. Its nested structure is `Value[] -> L[] -> G[]`.
2. `GetGameZip` is verified for dynamically discovered Men and Women game IDs and exposes scores, periods, team IDs, league IDs, statistics, and current market groups.
3. `GetSubsOptionsForGame` is verified and returns `sport` plus subscription `options`.
4. `GetTopGamesStatZip` is valid JSON but is not an IPBL-specific discovery source.
5. `Get1x2_VZip` was captured successfully in Chromium but fresh direct replay returned HTTP 406. It remains browser-context-dependent until request-header differences are proven.
6. The documented `GetHistoryGraphExt` path returned HTTP 404 for two current games. No score-history or odds-history parser is deployable from this path.
7. No H2H, MelZone, standings, player, or lineup API contract was observed. These remain explicitly unproven.

## Recorder boundary

The read-only recorder design uses `GetSportsShortZip` for current-game discovery and `GetGameZip` for active snapshots. It does not write Redis/KV and does not activate cron. Proposed polling values are dry-run hypotheses and must be measured before production authorization.
