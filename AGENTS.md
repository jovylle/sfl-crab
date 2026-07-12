# AGENTS.md

## Dev commands

```bash
npm run dev          # netlify dev: functions on :8888 + Vite on :5173 (full stack)
npm run dev:vite     # Vite only on :5173; /api proxies to beta.d1g.uk
npm run build        # vite build (used by Netlify deploy)
npm run preview      # netlify build → netlify serve (full prod simulation)
```

Use `npm run dev` when working with Netlify functions (auth, dig-day, practice patterns). Use `npm run dev:vite` for UI-only work. To proxy `/api` to local functions in vite-only mode, set `VITE_API_PROXY_TARGET=http://localhost:8888` in `.env`.

## No test runner or linter

No tests for `src/`, no ESLint, no lint script. Prettier is installed but has no config file. Tests exist only in `src_other/` (legacy game libs) and are not wired into CI or any npm script. The `prerender` npm script references a missing file — ignore it.

## Architecture

- Vue 3 SPA (Composition API, `<script setup>`) + Vite + Tailwind CSS + DaisyUI
- No backend — client fetches from Sunflower Land public API through a Netlify function proxy
- Netlify functions are **CommonJS `.cjs`** with `node_bundler = "esbuild"`; do not use ESM
- **Two Vite entrypoints**: `index.html` and `digging/index.html`. Both load `src/main.js`.
- **British spelling "artefact"** throughout: filenames, function names, data keys, script names (`sync-artefact.js`)
- SPA uses `createWebHistory()` — the catch-all `_redirects` rule (`/* → /index.html`) is required
- **Grid digging mechanics**: see [docs/GRID_MECHANICS.md](docs/GRID_MECHANICS.md) for the 10x10 grid, crab/treasure proximity rules, hint system, formation patterns, practice mode, and data flow.

## Auto-generated data (do not edit)

`src/data/game/` files are synced from the Sunflower Land repo by CI:
- `treasurePrices.json` / `gameConstants.json` — `npm run sync-game-data` (daily CI)
- `seasonalArtefacts.js` — `npm run sync-artefact` (monthly CI)
- `diggingFormations.js` — imported from game data

Three GitHub Actions auto-commit to the repo: `sync-game-data.yml`, `sync-artefact.yml`, `warm-daily-cache.yml`.

## API proxy details

- `sfl-api.cjs` has a 60s in-memory cache for 200 responses. Bypass with `x-sfl-bypass-cache: 1` header or `?bypassCache=1` — the app sends this on every land sync.
- `/visit/*` often returns 401 for third-party tools. The app uses `/community/farms/*` as primary and `/visit/*` as fallback only.
- Prod/test API switching is communicated via `x-sfl-api-env` header. Land data cache keys are prefixed per-environment (`landData_` vs `landData_test_`).
- Practice patterns are CDN-cached until UTC midnight (`CDN-Cache-Control` headers).

## Env setup

Two example files: `env.example` (detailed) and `.env.example` (terse). For `netlify dev`, copy one to `.env` and set:

| Var | Purpose |
|---|---|
| `SFL_API_KEY` / `SFL_API_KEY_DEV` | Server-side SFL API keys |
| `HUB_API_BASE` | Dig-day/hub-auth backend URL |
| `HUB_WRITE_SECRET` | Guest dig-day write secret |
| `ADMIN_PASSWORD` | `/admin` page auth |
| `VITE_*` vars | Client-side, safe to expose |

## Hot-deploy detection

`main.js` bakes `__APP_VERSION__` (git SHA from `COMMIT_REF`) via Vite `define`. After mount it polls `/` with `cache: no-cache` to compare with the live version and force-reloads on mismatch. Relies on Netlify injecting `COMMIT_REF` at build time.

## Key directories

| Dir | Purpose |
|---|---|
| `src/` | Main app (views, composables, services, components) |
| `netlify/functions/` | Serverless functions (`.cjs`) |
| `scripts/` | Data sync + asset check scripts |
| `public/world/` | Treasure/artefact images (`.webp`) |
| `src_other/` | Legacy SFL game libs (types, ABIs, i18n, React hooks); aliased as `assets`/`lib` but largely unused |
