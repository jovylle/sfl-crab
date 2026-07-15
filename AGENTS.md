# AGENTS.md

> **Start here.** This is the canonical, current reference for developers and AI assistants working on **sfl-crab / d1g.uk** — a visual Desert Digging Assistant for Sunflower Land players.

## Documentation map

Read in this order; each doc is kept accurate. If anything here conflicts with older prose, **this file and the `docs/` files win**.

| Doc | When to read it |
|---|---|
| **AGENTS.md** (this file) | Dev commands, conventions, env, API-proxy quirks, dead-code register |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Full architecture: directories, routes, startup, data flow, composables/services, grid-builders, entrypoints, `src_other` |
| [docs/GRID_MECHANICS.md](docs/GRID_MECHANICS.md) | The 10×10 grid engine: tiles, hints, formations, practice mode |
| [docs/DIG_DAY_SYNC.md](docs/DIG_DAY_SYNC.md) | Dig-day Hub sync: debounce, ETag, merge-by-seq, the layers |
| [docs/HUB_CONSUMPTION_SPEC.md](docs/HUB_CONSUMPTION_SPEC.md) | Hub-side ETag/idempotency contract |
| [netlify/functions/README.md](netlify/functions/README.md) | Per-function reference for the `.cjs` proxies |
| [src/data/game/README.md](src/data/game/README.md) | Auto-synced game data files |
| [SEASON_UPDATE_GUIDE.md](SEASON_UPDATE_GUIDE.md) / [API_KEY_SETUP.md](API_KEY_SETUP.md) | Seasonal artefact updates / SFL API keys |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Fork + PR workflow |

## Solver debug tools

Ways to test / verify the treasure solver (`src/utils/treasureSolver.js`) against real data — no browser screenshots, no bookmarklets.

### CLI: `scripts/debug-solver.js`

Runs under plain `node`, sub-second, no browser. Uses `scripts/lib/resolve-alias-loader.mjs` to resolve `@/` imports without Vite.

**Snapshot format** — the file must be a `landData_<id>` JSON blob:
```json
{ "visitedFarmState": { "desert": { "digging": { "patterns": [...], "grid": [...] } } } }
```

Snapshots go in `scripts/fixtures/` (gitignored — contains real player data).

```bash
# Print 10x10 board + guaranteed-cell list for a single snapshot
node scripts/debug-solver.js --file scripts/fixtures/<land>.json

# Soundness regression oracle: guaranteed cells in <earlier> must not appear as
# sand/crab in <later>. Prints FAIL loudly and exits nonzero on any false positive.
node scripts/debug-solver.js --diff scripts/fixtures/<earlier>.json scripts/fixtures/<later>.json
```

### Vitest test suite

```bash
npm test              # run all 3 test files once
npm run test:watch    # watch mode
```

**Three test files** — run `npm test` before pushing any change to `treasureSolver.js` or `gridTileTransform.js`:

| File | What it guards |
|---|---|
| `tests/solver.oracle.test.js` | **Soundness oracle** — 600 random boards with known ground-truth; every `guaranteed` cell must be a real treasure. Catches false positives introduced by solver logic changes. Uses deterministic PRNG (xorshift32, seeded) so failures are reproducible. |
| `tests/solver.scenarios.test.js` | **Hand-crafted scenarios** — one test per algorithm path (Pass 1 treasure-anchor, Pass 2 single-instance forcing, 3-of-4 reveal, edge cases). Intent readable from the board. Catches gross breakage and documents expected solver behaviour. |
| `tests/gridTileTransform.test.js` | **Transform contract** — locks the string format between `gridArrayToTiles` (emitter) and `treasureSolver` (consumer). Changing `"treasure actual-treasure"` or the `tileImage:` prefix in either file without updating the other silently breaks the solver with zero errors. |

**Key constraints when writing new solver tests**:
- Use only **non-seasonal formations**: `HIEROGLYPH`, `OLD_BOTTLE`, `COCKLE`, `WOODEN_COMPASS`, `CLAM_SHELLS`, `SEAWEED`, `SEA_CUCUMBERS`. Seasonal formations reference `CURRENT_SEASONAL_ARTEFACT` which changes monthly and breaks test assertions.
- The solver's **critical invariant** is soundness (no false positives) — it is intentionally conservative. A cell in `guaranteed` means it is safe to dig; a cell absent from `guaranteed` means nothing either way.
- Already-revealed treasure tiles ARE included in `guaranteed` (they are provably treasures); the UI filters them for display.
- Do NOT use a differential oracle (compare two solver implementations). The production solver runs iterative pseudo-reveal propagation that no single-pass oracle can reproduce correctly. Use **ground-truth comparison** instead: generate a board with known treasure positions and assert every `guaranteed` cell is in that truth set.

### Raw API shape (stable)

```
desert.digging = {
  patterns: string[],              // formation keys still on the board
  completedPatterns: string[],     // fully-dug patterns
  grid: [{ x, y, items: { <TreasureName>|Crab|Sand: count } }]
}
```

The `grid` array contains only **dug** tiles. Undug tiles are absent. `x`/`y` are 0-based (0–9). Item keys are display names as returned by the SFL API — exactly as used in `DIGGING_FORMATIONS` plot names.

**Primary way to feed AI assistants real data**: paste the raw `desert.digging` JSON directly into the chat.

## Dev commands

```bash
npm run dev          # netlify dev: functions on :8888 + Vite on :5173 (full stack)
npm run dev:vite     # Vite only on :5173; /api proxies to beta.d1g.uk
npm run build        # vite build (used by Netlify deploy)
npm run preview      # netlify build → netlify serve (full prod simulation)
```

Use `npm run dev` when working with Netlify functions (auth, dig-day, practice patterns). Use `npm run dev:vite` for UI-only work. To proxy `/api` to local functions in vite-only mode, set `VITE_API_PROXY_TARGET=http://localhost:8888` in `.env`.

## Linter / formatter

No ESLint, no lint script. Prettier is installed but has no config file. Tests in `src_other/` (legacy game libs) are not wired into CI.

## Verifying changes end-to-end

For changes to the solver or grid transform: **run `npm test` first** (17 tests, ~1s). For everything else the real check is **build + drive the app in a browser and observe**. Tool-agnostic (works with Playwright, Puppeteer, or manual clicking).

```bash
npx vite build                                # ~8s; also catches template/compile errors
npx vite preview --port 4319 --strictPort     # serves dist/ with SPA fallback
```

Routes: `/`, `/digging`, `/practice`, `/:landId/digging`, `/:landId/practice`.

- **`vite preview` does NOT run the Netlify functions** (`/api/*` 404). "Today's Patterns" then falls back to a Random Round — fine for verifying client behavior. For function-backed flows use `npm run dev` (netlify dev).
- **Digging a tile is two clicks + delay**: first click arms confirm, second digs after `DIG_DELAY_MS` (350ms). When scripting: click a `.tile` twice, then wait ~500ms.
- Grid is 100 `.tile` divs. "Digs:" / "Round N" / "Shared Grid" read from spans/`.badge`.
- In-progress practice round persists to `localStorage['practice:in-progress-round:1']`.
- Practice board link (`?board=`) is self-contained: base64url + JSON of `[[key,ox,oy],...]`. Same board ⇒ identical code; same patterns/new layout ⇒ same key multiset, different code.
- Ignore `cloudflareinsights.com/cdn-cgi/rum` CORS console errors — external RUM analytics, not app code.

## Architecture

- Vue 3 SPA (Composition API, `<script setup>`) + Vite + Tailwind CSS + DaisyUI
- **No app backend of its own**, but it is not backend-less: the client proxies through Netlify functions to two external systems — the **Sunflower Land public API** (`sfl-api.cjs`) and the **SFL Digging Hub** (`HUB_API_BASE`, auth/dig-day/practice). Env vars ARE required for these (see Env setup).
- Netlify functions are **CommonJS `.cjs`** with `node_bundler = "esbuild"`; do not use ESM
- **Two Vite entrypoints**: `index.html` and `digging/index.html`. Both load `src/main.js` and boot the *same* app (only difference: analytics beacon). See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
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
| `src_other/` | Legacy SFL game libs (types, ABIs, i18n, React hooks); aliased as `assets`/`lib` but effectively **dead** — no running app code imports it |

## Dead code / gotchas

Documented so you don't waste time or "fix" load-bearing weirdness. Full table in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#dead-code--gotchas-register).

- `npm run prerender` / `scripts/prerender.js` — **broken**, missing file, ignore.
- `netlify/functions/projectmate-feedback.cjs` — **dead** (Web3Forms blocks server calls), still referenced by `_redirects`/`netlify.toml`.
- `netlify/functions/_digDayStore.cjs` — **dead** legacy Netlify Blobs path, superseded by the Hub proxy; kept only as a reference impl.
- `src/views/Home.vue`, `src/utils/artefactIcons.ts` — present but **unreferenced**.
- Grid tiles are `string[]` of CSS classes (not objects) — fragile by design; read GRID_MECHANICS.md first.
