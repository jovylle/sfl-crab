# Architecture

> Canonical, verified architecture reference for **sfl-crab / d1g.uk**. Read [AGENTS.md](../AGENTS.md) first for dev commands and conventions. This document goes deep on structure, routing, data flow, and subsystems. It replaces the old (stale, deleted) `overview.md`.

## What this app is

**d1g.uk** is a visual **Desert Digging Assistant** for [Sunflower Land](https://sunflower-land.com) players. Enter a Land ID and it renders a live 10×10 dig grid with crab/sand/treasure hints, today's treasure patterns, a practice mode, and shareable dig-day replays.

- **Vue 3 SPA** (Composition API, `<script setup>`) + Vite + Tailwind + DaisyUI
- **No app backend of its own.** The client talks to two external systems through thin **Netlify Function proxies** (`.cjs`, CommonJS):
  1. **Sunflower Land public API** — live farm/dig data (`sfl-api.cjs`)
  2. **SFL Digging Hub** (`HUB_API_BASE`, default `https://beta.api.d1g.uk`) — auth, dig-day snapshots, practice runs/patterns
- Deployed on **Netlify**. SPA uses `createWebHistory()`; the `_redirects` catch-all (`/* → /index.html`) is required.

> Note: the app *does* require env vars for the Netlify functions (SFL API keys, hub secrets, admin password). See [../env.example](../env.example). The old overview.md claim of "no backend / no env vars" was wrong.

## Game mechanics context

The 10×10 grid is the heart of the app. Full spec lives in [GRID_MECHANICS.md](./GRID_MECHANICS.md). Quick orientation:

- Grid is a flat array, `index = y * 10 + x`. Each tile is a `string[]` of CSS classes (**not** a typed object).
- **Crab** tiles are always orthogonally adjacent to a treasure. **Sand** is empty. **Treasure** tiles are surrounded by crabs. The hint engine exploits this invariant.
- Treasures appear in predefined **formation patterns** (`src/data/game/diggingFormations.js`). The API tells you which patterns are on a farm today; the app maps pattern keys → coordinate formations.
- A **seasonal artefact** (changes ~every 3 months) is resolved by `getCurrentSeasonalArtefact()` in `seasonalArtefacts.js`.

## Directory map

| Path | Purpose |
|---|---|
| `src/views/` | Page-level components (one per route target) |
| `src/components/` | Reusable UI (grids, pickers, modals, layout) |
| `src/composables/` | State + logic (Vue composables; app uses these instead of Vuex/Pinia) |
| `src/services/` | Network layer — calls the `/api/*` Netlify proxies |
| `src/utils/` | Pure helpers (grid builders, caches, codecs, asset resolution) |
| `src/router/` | Routes (`routes/digging.js`, `routes/public.js`, `routes/auth.js`) + guard |
| `src/config/` | `api.js` (env switching, hosts, endpoints), `support.js` |
| `src/constants/` | `storageKeys.js` — every localStorage key in one place |
| `src/data/game/` | **Auto-synced** game data (do not hand-edit) — formations, prices, constants, seasonal artefacts |
| `src/data/app/` | App constants (`constants.js`) |
| `src/features/` | `auth/` (login/callback views), `hub/hubClient.js` (auth headers) |
| `netlify/functions/` | Serverless proxies — see [../netlify/functions/README.md](../netlify/functions/README.md) |
| `scripts/` | Data sync + asset-check scripts (run by CI) |
| `public/world/` | Treasure/artefact sprites (`.webp`) |
| `src_other/` | **Vendored, effectively dead** — see [src_other section](#src_other-vendored-and-dead) |

## Routes

Assembled in `src/router/index.js` as `[...diggingRoutes, ...authRoutes, ...publicRoutes]`. History is `createWebHistory()` in the browser (`createMemoryHistory()` under SSR). One global guard: `router.beforeEach((to) => syncApiEnvFromRoute(to))` (`src/utils/landRoutes.js`) — reads `?testnet` from the URL and forces API env to `test`, else `production`. **There are no auth guards**; every route is public (`meta.public: true`).

### Digging routes (`src/router/routes/digging.js`)
| Path | Name | Renders |
|---|---|---|
| `/` | `Home` | redirect → `/digging` |
| `/digging` | `GuestDigging` | `GuestDigging.vue` |
| `/:landId(\d+)/digging` | `Digging` | `Digging.vue` |
| `/:landId(\d+)` | `DiggingAsHome` | redirect → `/:landId/digging` (keeps query + hash) |
| `/details` | `LandDetailsNoId` | `LandDetails.vue` |
| `/:landId(\d+)/details` | `LandDetailsWithId` | `LandDetails.vue` |
| `/todays-checklist` | `TodaysChecklist` | `TodaysChecklist.vue` |
| `/:landId(\w+)/todays-checklist` | `TodaysChecklistWithId` | `TodaysChecklist.vue` |
| `/practice` | `Practice` | `PracticeDigging.vue` |
| `/:landId(\d+)/practice` | `PracticeWithId` | `PracticeDigging.vue` |

### Auth routes (`src/router/routes/auth.js`)
| Path | Name | Renders |
|---|---|---|
| `/login` | `Login` | `features/auth/LoginView.vue` (`meta.hideChrome`) |
| `/auth/callback` | `AuthCallback` | `features/auth/AuthCallbackView.vue` (`meta.hideChrome`) |

### Public routes (`src/router/routes/public.js`)
| Path | Name | Renders |
|---|---|---|
| `/feedbacks` | `FeedbackGallery` | `FeedbackGallery.vue` |
| `/admin` | `Admin` | `Admin.vue` (`meta.hideChrome`) |
| `/account` | `Account` | `Account.vue` |
| `/practice/run/:id` | `PublicPracticeRun` | `PublicPracticeRun.vue` |
| `/:landId(\d+)/dig-day` | `PublicDigDay` | `PublicDigDay.vue` |
| `/test/:pathMatch(.*)*` | `LegacyTestPath` | redirect via `legacyTestPathRedirect` → canonical path + `?testnet` |
| `/:pathMatch(.*)*` | (catch-all) | redirect → `/` |

`meta.hideChrome` hides the app nav/drawer chrome (login, callback, admin).

## Two Vite entrypoints

`vite.config.js` registers two Rollup inputs: `index.html` and `digging/index.html`. **Both load the exact same `/src/main.js` and the same Vue app** — there is no code-level difference in behavior. The only real deltas:

- `index.html` includes the Cloudflare Web Analytics beacon; `digging/index.html` does not.

The second physical entry exists so a direct hit to `/digging/` resolves to a real static HTML document that still boots the SPA (belt-and-suspenders alongside the `_redirects` catch-all). Treat them as the same app.

## Startup sequence (`src/main.js`)

1. **`initHubSession()`** runs *before* the app is created — migrates legacy nickname → display name, loads token/user from localStorage, ensures an anonymous UUID, refreshes the session if a token exists, and re-refreshes on window focus.
2. `createApp(App)` + `@vueuse/head` (`createHead()`) + router, mount to `#app`.
3. `initChatWidget()` after mount.
4. `useReliableAssets().autoRetryCriticalAssets` runs ~1s later to re-fetch critical CSS if it failed.
5. **Hot-deploy check** (`checkForUpdates()`): compares baked `__APP_VERSION__` (git SHA from `COMMIT_REF`, injected via Vite `define`) against the SHA in a fresh `no-cache` fetch of `/`. On mismatch it clears all CacheStorage and hard-reloads. Runs **once** at startup (not a repeating interval).

## API environment switching (`src/config/api.js`)

The app can target the SFL **production** or **test** API. This is orthogonal to the Hub.

- Hosts: production → `api.sunflower-land.com`; test → `api-dev.sunflower-land.com`.
- Persisted in localStorage `sfl-api-environment` (default `production`). `setApiEnvironment()` fires a `sfl-api-environment-changed` window event; `useApiEnvironment.js` keeps a reactive `ref` in sync.
- Endpoints go through the proxy: primary `/.netlify/functions/sfl-api/community/farms/`, fallback `/.netlify/functions/sfl-api/visit/` (visit often 401s for third-party tools).
- **`x-sfl-api-env: test`** header is added by `getApiHeaders()` only in test mode — that's how the `sfl-api` proxy knows to hit the api-dev host.
- **Cache-key prefixing** keeps prod/test data from mixing: `landData_${id}` vs `landData_test_${id}` (and `landCooldownEnd_...`). Empty id → `..._guest`.
- URL `?testnet` toggles env via the router guard. "Testnet" lands are heuristically all-digit IDs ≥13 digits (`src/utils/testnet.js`).

## localStorage keys (`src/constants/storageKeys.js`)

All keys live here — one source of truth. Fixed keys:

| Key | Purpose |
|---|---|
| `sfl-hub-session` | Hub auth JWT (Bearer) |
| `sfl-hub-user` | Cached hub user profile JSON |
| `sfl-hub-display-name` | Display name for dig-day / hub attribution |
| `sfl-hub-anonymous-id` | Stable anonymous UUID (practice pre-login) |
| `sfl-practice-nickname` | **@deprecated** — migrated → display-name on boot |
| `sfl-practice-save-scores` | Practice score submission toggle (`1`/`0`) |
| `sfl-api-environment` | SFL API target: `production` \| `test` |
| `theme` | DaisyUI theme name |
| `todays-checklist:landId` / `todays-checklist:selectedNpcIds` | Checklist page state |

Parameterized key builders: `landDataKey(id, testApi)`, `landCooldownKey(id, testApi)`, `gridCustomHintsKey(id)` → `gridCustomHints_${id}`, `markJournalKey(id, utcDate)` → `markJournal_${id}_${utcDate}`, `landUiPrefKey(id, pref)` → `${pref}-${id}`.

## Data flow (live land)

1. **Fetch** — `landApiService.js` → `/.netlify/functions/sfl-api/community/farms/:id` → SFL API. The app sends `bypassCache` to skip the proxy's own 60s cache on manual syncs.
2. **Response shape** — `{ visitedFarmState: { desert: { digging: { grid, patterns, completedPatterns } } } }`. Grid tiles are `{ x, y, items: { Crab | Sand | <TreasureName> }, dugAt, tool }`.
3. **Store** — `useLandData.js` holds reactive land data + localStorage cache, keyed per land + API env, UTC-date-stamped (stale after the UTC date changes).
4. **Render** — `useGridEngine.js` converts API tiles → CSS class arrays and rebuilds neighbor hints (`near-*`). See [GRID_MECHANICS.md](./GRID_MECHANICS.md).
5. **Cooldowns** — 15s between successful refreshes, 30s after failures (`useLandSync.js`).

## Key composables

| Composable | Role |
|---|---|
| `useGridEngine.js` ⭐ | Core 10×10 grid + auto neighbor-hint propagation |
| `useGridManager.js` | User marks / manual hint cycling |
| `useLandData.js` ⭐ | Central land-data store + localStorage cache |
| `useLandSync.js` | Refresh cooldowns, `bypassCache` |
| `useDigDayStore.js` | Hub dig-day sync (debounce/ETag/merge) — see [DIG_DAY_SYNC.md](./DIG_DAY_SYNC.md) |
| `usePracticeEngine.js` / `usePracticePatterns.js` | Practice mode grid generation + daily patterns |
| `useHintsStorage.js` | Per-land per-UTC-day hint persistence |
| `useMarkJournal.js` / `usePatternMarks.js` / `markJournalBridge.js` | Mark event journal (feeds dig-day sync + replays) |
| `useDigReplay.js` | Read-only step-by-step replay player |
| `useHubSession.js` | Auth session bootstrap + refresh |
| `useApiEnvironment.js` | Reactive prod/test API env |
| `useReliableAssets.js` / `useSoftReload.js` | Critical asset retry + soft reloads |
| `useTodayTreasureNames.js` | Pattern keys → treasure names |

## Services (`src/services/`)

All hit the `/api/*` Netlify proxies. `landApiService.js`, `landSyncService.js`, `digDayApiService.js`, `hubAuthService.js`, `hubProfileService.js`, `practiceHubService.js`, `practicePatternService.js`, `practiceRunApiService.js`, `adminBlobService.js`. Hub calls attach `Authorization: Bearer <token>` via `src/features/hub/hubClient.js` when a session exists.

## Grid builder utils (the 4 overlapping files)

These form a **producer/consumer pipeline** around a common `DigStep[]` shape (`{ order, dugAt, tiles: [{ x, y, items, tool }] }`). This overlap is intentional — do not "dedupe" them blindly.

**Producers of `DigStep[]`:**
- `buildDigTimeline.js` ⭐ — parses the **raw live API grid** into the canonical `DigStep[]` (groups multi-tile Sand Drill digs into one step, sorts by `dugAt`, 1-based `order`). Also exports `getTodayUTC`, `getCurrentDigOrder`, `buildTreasureOrderMap`, `buildDigStats`. **Everything else depends on this file.**
- `buildPracticeDigTimeline.js` — the **inverse**: synthesizes the same `DigStep[]` from the local practice engine's `digHistory` + `hiddenGrid`, so practice runs reuse the same replay/public builders.

**Consumers of `DigStep[]`:**
- `buildReplayGrid.js` — `buildReplayCellsAtStep(digs, stepOrder, marksByCell)` renders **intermediate replay state at an arbitrary step k** into per-cell CSS class arrays (instantiates `useGridEngine`).
- `buildPublicDigGrid.js` — `buildPublicDigView(digs, markEvents)` builds the **complete final grid** for a saved public dig-day: resolves mark-event history, treasure-order map, and item icon metadata. Internally pins `buildReplayCellsAtStep` to the last step.

The two order-map helpers (`buildTreasureOrderMap` from raw grid vs `buildTreasureOrderMapFromDigs` from `DigStep[]`) differ only by input source.

## `src_other/` — vendored and dead

`src_other/` is copied from the official SFL game repo and aliased as `assets`/`lib` in `vite.config.js`. **No running app code imports it.** The only bridge (`import.meta.glob('/src_other/assets/icons/*.webp')` in `src/utils/artefactIcons.ts`) lives in a module that is itself never imported. `diggingFormations.js` references `desert.ts` in a **comment only**. Treat `src_other/` as reference material; extract data into `src/data/game/` rather than importing it.

## Dead code / gotchas register

Known non-functional or trap-laden spots. Documented so an AI doesn't waste time or "fix" load-bearing weirdness:

| Item | Status |
|---|---|
| `npm run prerender` / `scripts/prerender.js` | **Broken** — script file is missing. Ignore. |
| `netlify/functions/projectmate-feedback.cjs` | **Dead** — Web3Forms blocks server-side calls. Still referenced by `_redirects` / `netlify.toml` but non-functional. |
| `netlify/functions/_digDayStore.cjs` | **Dead** — old Netlify Blobs path, superseded by the Hub proxy. Nothing imports it. Kept only as a reference impl of the merge/500/413 rules the Hub now enforces. |
| `src/views/Home.vue` | Present but **not referenced by any route** (`/` redirects to `/digging`). |
| `src/utils/artefactIcons.ts` | Present but **never imported** → its `src_other` glob is the only (dead) bridge into `src_other`. |
| `src_other/` | Vendored, effectively unused (see above). |
| Tile stringly-typing | Tiles are `string[]` of CSS classes, not objects. Fragile by design — see GRID_MECHANICS.md before touching. |

## Related docs

- [AGENTS.md](../AGENTS.md) — dev commands, conventions, env, API proxy quirks
- [GRID_MECHANICS.md](./GRID_MECHANICS.md) — grid engine, hints, formations, practice mode
- [DIG_DAY_SYNC.md](./DIG_DAY_SYNC.md) — dig-day hub sync (debounce/ETag/merge)
- [HUB_CONSUMPTION_SPEC.md](./HUB_CONSUMPTION_SPEC.md) — hub ETag/idempotency spec
- [../netlify/functions/README.md](../netlify/functions/README.md) — per-function reference
- [../src/data/game/README.md](../src/data/game/README.md) — auto-synced game data
- [../SEASON_UPDATE_GUIDE.md](../SEASON_UPDATE_GUIDE.md) — seasonal artefact updates
- [../API_KEY_SETUP.md](../API_KEY_SETUP.md) — SFL API keys
