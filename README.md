# IPBL minimal score viewer

Static **Vite + React + TypeScript** app for the 14 approved live divisions: Pro Men A/B/C/D/L/U/X/Z and Pro Women A/B/C/D/G/K. The live surface stays decision-first, while the dedicated Intelligence surface carries Graphify synthesis, recorder/history health, phase coverage, and deeper evidence review.

Current production deployment:

- `https://ipbl-cleanup-audit.vercel.app`

## API routing

- **Production (Vercel):** `vercel.json` rewrites `/api/ipbl/*` → `https://api.ipbl.pro/*` (same-origin proxy; **no** `Access-Control-Allow-Origin` on the API, so direct browser `fetch` to `api.ipbl.pro` would fail CORS).

- **Development:** `vite.config.ts` mirrors the same `/api/ipbl` proxy.

## Local dev (Linux / WSL)

Use a Linux `npm` (e.g. **corepack**) so installs are not broken by UNC paths:

```bash
export PATH=/usr/bin:/bin:$PATH
corepack npm install
corepack npm run dev
```

Open `http://localhost:5173`.

## Build

```bash
export PATH=/usr/bin:/bin:$PATH
corepack npm run build
```

Output: `dist/`.

## Deploy (Vercel)

```bash
export PATH=/usr/bin:/bin:$PATH
corepack npm exec vercel login
corepack npm exec vercel -- --prod
```

Link the Vercel project to this directory; the rewrite enables API calls from the browser.

## Endpoints used

| Flow | Path |
|------|------|
| Schedule | `GET /calendar?tag&from&to&lang` |
| Live | `GET /calendar/online?tag&lang` |
| Game | `GET /games/game?id&tag&lang` |
| Box score | `GET /box-score?id&tag&lang` |
| Team history | `GET /team/games?teamId&calendarType=1&tag&season` |

`divisions/tree` is not called at runtime (fixed tag whitelist in `src/config/divisions.ts`).

## Surface split

- Live: score, quarter flow, short decision block, and a handoff into Intelligence. The runtime live path is now consolidated through `api/results.ts`.
- Intelligence: Graphify-backed synthesis, analysis-engine status, operator intelligence, recorder health, and phase coverage.
- Backend-only: raw Graphify internals, agnix config details, full replay/H2H dumps, and the backfill-only cron mode folded into `api/cron/cron-sync-results.ts`.

## Repository Map

The repo is intentionally split into runtime code, evidence, and operator surfaces:

- `src/`, `api/`, `lib/`, `workers/`: runtime application code.
- `public/`: shipped static data, including betting memory inputs and derived indexes.
- `scripts/`: maintenance, validation, reconciliation, and build helpers.
- `tests/`: contract coverage and fixture-driven validation.
- `docs/`: phase ledgers, closure plans, and operator runbooks.
- `artifacts/`: durable evidence bundles and validation outputs.
- `graphify-out/`: Graphify graph, extracted nodes, and generated analysis surfaces.
- `.agenteam/`, `.agents/`, `.claude/`, `.codex/`, `.github/`, `.jules/`: agent and workflow metadata.

## Cleanup Notes

- `AGENTS.md` is the canonical root instruction file.
- Build output belongs in `dist/` and is ignored by Git.
- Legacy root helper scripts (`deploy-vercel.sh`, `hydrate_*.ps1`, `netlify.toml`, `ipbl-hunt-live-fixture.json`) were removed because the repo already has the Vercel config, package scripts, and live fixtures it uses today.
- The large evidence directories are part of the repository contract and should be treated as source-adjacent history, not runtime code.

## Audit Report

See [docs/REPO_CLEANUP_REPORT.md](./docs/REPO_CLEANUP_REPORT.md) for the repo inventory, cleanup decisions, and current maintenance boundaries.

## Future Agent Notes

- Read `AGENTS.md` first.
- Use `graphify` for repo-architecture questions; `graphify-out/` is intentional evidence, not junk.
- The Vercel Hobby limit is 12 serverless function files, so keep future route additions folded into existing surfaces when possible.
- The live surface is consolidated through `api/results.ts`; backfill requests route through `api/cron/cron-sync-results.ts?mode=backfill`.
