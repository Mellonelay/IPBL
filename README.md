# IPBL minimal score viewer

Static **Vite + React + TypeScript** app for the 14 approved live divisions: Pro Men A/B/C/D/L/U/X/Z and Pro Women A/B/C/D/G/K. The live surface stays decision-first, while the dedicated Intelligence surface carries Graphify synthesis, recorder/history health, phase coverage, and deeper evidence review.

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

- Live: score, quarter flow, short decision block, and a handoff into Intelligence.
- Intelligence: Graphify-backed synthesis, analysis-engine status, operator intelligence, recorder health, and phase coverage.
- Backend-only: raw Graphify internals, agnix config details, and full replay/H2H dumps.
