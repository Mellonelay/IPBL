# Live Source Failover

## Current incident

The official `api1.ipbl.pro` origin currently presents an invalid hostname certificate and returns a NetAngels disabled-site page. The production live route therefore cannot obtain official JSON from the existing Worker proxy.

## Runtime policy

```text
official Worker/API1 live feed
  -> if at least one verified official live game exists, use official data
  -> if the official feed returns no games because every division request fails, query MelBet IPBL LiveFeed
  -> map only verified team/division identities
  -> return explicit source and fallback provenance
  -> report unmatched events instead of inventing mappings
```

## Temporary fallback

Primary temporary fallback:

- `melbet.com/service-api/LiveFeed`
- IPBL competition identifier: `2496666`
- consumed fields: event ID, teams, score, quarter splits, period, elapsed game seconds, source update time
- odds are not consumed

Clock conversion:

- `SC.TS` is total elapsed game seconds
- `SC.CP` is the current period
- the application converts these values to remaining `MM:SS` for its existing live-clock contract

## Division policy

Historical Results remain on the restored historical registry.

Current Live additionally supports:

- Pro Men H: `ipbl-74-m-pro-h`

Pro Men H is live-only until its historical source coverage is independently reconstructed and validated.

## Identity policy

- Existing 44 verified teams keep their established official team IDs.
- Live-only Pro Men H teams use source event team IDs for live identity.
- Source IDs are never represented as verified official IPBL IDs.
- Unknown teams are excluded and listed in `unmatchedBookmakerEvents`.

## Recovery policy

The official source remains preferred automatically. When API1 returns usable official live games, the fallback is bypassed without a deployment.

## Caveats

- MelBet is an unofficial temporary transport and its public contract may change.
- Official game detail, box score, and H2H routes can remain unavailable while API1 is disabled.
- The fallback restores live score, quarter matrix, current period, and countdown clock; it does not claim official-source equivalence.
