# Phase C8.5 Bounded Monitoring and Recovery

## Official proxy diagnosis

`api1.ipbl.pro` currently serves a certificate for `*.netangels.ru`; strict TLS clients correctly reject it and Cloudflare returns HTTP 526. `api.ipbl.pro` has a valid certificate but does not expose the compatible `/calendar/online` route. TLS verification must not be disabled.

The bounded response is to retain the last-known active set, record source failure, alert after three consecutive failed recorder runs, and continue one-minute probes. Recovery requires two consecutive non-failed runs.

## Melbet quarantine

Unknown Melbet teams are not assigned invented canonical IDs or divisions. Unmatched records now include source league/team IDs and payload state. At the incident checkpoint:

- Chita–Khabarovsk: complete scored payload; both teams absent from the approved June 2026 registry; quarantined as unverified roster candidates.
- Kaliningrad–Plavsk: both teams verified in Pro Men C; score missing at source; deferred as `live-score-pending`.
- Grozny (Women)–Nizhnekamsk (Women): pre-match payload; both teams absent from the approved registry; quarantined.

## Alert policy

- One or two consecutive `FAIL` runs: warning.
- Three consecutive `FAIL` runs: critical sustained-source incident.
- Five consecutive `PARTIAL` runs: warning.
- Heartbeat older than 300 seconds: critical scheduler/endpoint incident.
- Recovery is declared after two consecutive non-failed runs.

The tracked systemd monitor emits only health-state transitions to journald and stores a mode-0600 fingerprint under `/var/lib/ipbl-recorder-monitor`. It is intentionally not installed until `/api/recorder/health` is merged to production.
