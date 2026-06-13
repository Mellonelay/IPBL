# Phase C9 PR23 — Official Source Reconciliation and EventsStat Live Reprobe

Captured: `2026-06-13T11:00:41.989611+00:00`

## Scope

First implementation step after PR #22 proof foundation. This does not deploy odds features, does not add divisions, and does not weaken TLS. It records evidence for official-source reconciliation and EventsStat EG/SH/DS live reprobe.

## Production source state

- Production live game count: `0`
- Production live game ids sampled: `[728820121, 728819144, 728819200]`

## Official endpoint probe

| URL | HTTP | Bytes |
|---|---:|---:|
| `https://ipbl.pro/live` | `200` | `81374` |
| `https://api1.ipbl.pro/widget.js` | `404` | `None` |
| `https://api1.ipbl.pro/widget.css` | `404` | `None` |
| `https://api1.ipbl.pro/api/Calendar/GetOnline?lng=en` | `404` | `None` |
| `https://api1.ipbl.pro/api/Divisions/GetTree?lng=en` | `404` | `None` |
| `https://api1.ipbl.pro/api/Standings/Get?lng=en` | `404` | `None` |

## Production endpoint probe

| URL | HTTP | Bytes |
|---|---:|---:|
| `https://ipbl-minimal-viewer.vercel.app/api/results/live` | `200` | `968` |
| `https://ipbl-minimal-viewer.vercel.app/api/recorder/health` | `200` | `1907` |
| `https://ipbl-minimal-viewer.vercel.app/api/recorder/status` | `200` | `1281` |
| `https://ipbl-minimal-viewer.vercel.app/api/recorder/history?limit=5` | `400` | `None` |

## EventsStat live reprobe

- Any EG/SH/DS proven: `False`
- partner=8 EG/SH/DS proven: `False`
- partner=25 EG/SH/DS proven: `False`

| Game ID | Partner | HTTP | EG | SH | DS |
|---:|---:|---:|---:|---:|---|
| `728820121` | `8` | `200` | `5` | `None` | `False` |
| `728820121` | `25` | `200` | `5` | `None` | `False` |
| `728819144` | `8` | `200` | `5` | `None` | `False` |
| `728819144` | `25` | `200` | `5` | `None` | `False` |
| `728819200` | `8` | `200` | `5` | `None` | `False` |
| `728819200` | `25` | `200` | `5` | `None` | `False` |

## Reconciliation classification

EventsStat live EG/SH/DS was not reproven in this run. Continue with source availability and fixture contracts only; do not implement live odds features until live EG/SH/DS is reproven.

Official source remains `PARTIAL` until row-level reconciliation is implemented between official source, Results KV, Recorder status/history, and fallback/live source.

## Next implementation tasks

1. Build deterministic reconciliation script for official/live/recorder/result rows.
2. Add market/selection ID extraction from `eventsstat-live-reprobe.json`.
3. Add timestamp alignment checks for score-history `SH` versus production game clock.
4. Keep odds display/automation disabled until source policy and tests are complete.
