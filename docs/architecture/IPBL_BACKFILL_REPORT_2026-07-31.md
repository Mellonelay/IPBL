# IPBL Supabase Backfill Report — 2026-07-31

## Scope

- Canonical project: `Ipbl-data` (`hdrkrtfpcuzsbegytrei`).
- Source: official IPBL calendar through the existing production source route.
- Required window: 2026-05-01 through 2026-07-31, inclusive.
- Divisions: all 14 approved IPBL divisions, respecting verified `validFrom` boundaries.
- Execution: bounded Vercel Preview calls with durable Supabase segment leases.

Two verified runs form the complete requested window:

- `828f3cdf-f7ea-4eec-80b5-074c2ecad084`: 2026-05-01 through 2026-07-01.
- `0da3888e-66ea-4625-9c33-ac5a35293e04`: 2026-07-02 through 2026-07-31.

The January discovery run `65466362-c1f2-4663-a069-15538b2b1789` was cancelled after the required scope was narrowed. Its rows are excluded from every count in this report and were not destructively deleted.

## Terminal state

| Metric | Result |
|---|---:|
| Total segments | 1,175 |
| Verified with source rows | 686 |
| Confirmed empty | 489 |
| Pending / running / retryable | 0 |
| Quarantined segments | 0 |
| Unresolved failures | 0 |
| Canonical games | 3,494 |
| Period rows | 13,968 |

Both required runs reached `verified`. Source failure was never converted into a confirmed-empty segment.

## Division coverage

| Division | Segments | Games | Earliest | Latest | Empty segments |
|---|---:|---:|---|---|---:|
| Pro Men A | 92 | 396 | 2026-05-01 | 2026-07-31 | 18 |
| Pro Men B | 92 | 396 | 2026-05-01 | 2026-07-31 | 18 |
| Pro Men C | 92 | 345 | 2026-05-01 | 2026-07-31 | 1 |
| Pro Men D | 92 | 493 | 2026-05-01 | 2026-07-31 | 18 |
| Pro Men G | 92 | 76 | 2026-05-01 | 2026-05-19 | 73 |
| Pro Men L | 48 | 78 | 2026-06-14 | 2026-07-26 | 35 |
| Pro Men U | 67 | 156 | 2026-05-26 | 2026-07-27 | 16 |
| Pro Men Z | 49 | 84 | 2026-06-13 | 2026-07-26 | 35 |
| Pro Women A | 92 | 396 | 2026-05-01 | 2026-07-31 | 26 |
| Pro Women B | 92 | 396 | 2026-05-01 | 2026-07-31 | 26 |
| Pro Women C | 92 | 262 | 2026-05-01 | 2026-07-31 | 26 |
| Pro Women D | 92 | 156 | 2026-05-03 | 2026-07-30 | 66 |
| Pro Women G | 91 | 104 | 2026-05-02 | 2026-07-29 | 65 |
| Pro Women K | 92 | 156 | 2026-05-03 | 2026-07-30 | 66 |

## Quarter evidence

| Classification | Games |
|---|---:|
| Complete period evidence reconciling to final score | 3,423 |
| Partial official period evidence | 61 |
| No official period rows | 10 |
| Quarantined conflicting period payloads | 1 |

Partial or missing periods do not invalidate a verified final result. They are excluded from complete-quarter analytics.

## Integrity gates

- Duplicate official game IDs: 0.
- Invalid or self-referential team pairs: 0.
- Complete-period totals conflicting with canonical final scores: 0.
- Open segments: 0.
- Quarantined segments: 0.
- Unresolved failure records: 0.
- Legacy Upstash was not modified or deleted.

## Representative H2H coverage

Within the requested May–July window:

- Voronezh vs Plavsk: 56 canonical direct meetings.
- Yaroslavl vs Tomsk: 66 canonical direct meetings.

The Vercel Preview history route reads the direct Supabase project first while preserving official-IPBL and Upstash fallbacks.

## Evidence exceptions

Official game `1077458` reported final score `127:116` but period string `26:27,31:29,29:27,39:33`, which sums to `125:116`. The final result is canonical; the contradictory period string remains quarantined and produces no `game_periods` rows.

Official evidence also proved missing Pro Men Z identities `76053` (Revda) and `76056` (Ufa). They were added through a forward migration and affected segments were reprocessed successfully.
