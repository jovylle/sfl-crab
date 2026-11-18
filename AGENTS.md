# AGENTS.md

Guide for developers and AI assistants working on **sfl-crab / d1g.uk**, a visual Desert Digging Assistant for Sunflower Land players. This file is short on purpose. Details live in `docs/`. If this file and `docs/` conflict with older prose, this file and `docs/` win.

## Commands

```bash
npm run dev          # netlify dev: functions on :8888 + Vite on :5173
npm run dev:vite     # Vite only on :5173; /api proxies to beta.d1g.uk
npm run build        # vite build (used by the Netlify deploy)
npm run preview      # netlify build, then netlify serve
npm test             # vitest run: 9 unit test files, 214 tests
npm run check:deps   # dependency-cruiser layer rules
npm run check:dead   # knip, against the baseline in knip.json
npm run check        # check:deps + check:dead + test + build
```

Use `npm run dev` for work that touches Netlify functions (auth, dig-day, practice patterns). Use `npm run dev:vite` for UI-only work. Environment variables: [docs/ARCHITECTURE.md#environment](docs/ARCHITECTURE.md#environment).

## Layout

| Dir | Purpose |
|---|---|
| `src/` | Browser app: views, components, composables, services, utils, router, config |
| `netlify/functions/` | Server proxies (`.cjs`, CommonJS). Per-function reference in its README |
| `scripts/` | Data sync, asset check, solver debug CLI |
| `tests/` | Vitest unit tests and the Playwright E2E spec |
| `public/world/` | Treasure and artefact images (`.webp`) |

Where new code goes: [docs/ARCHITECTURE.md#where-new-code-goes](docs/ARCHITECTURE.md#where-new-code-goes).

## Dependency rules

Enforced by `npm run check:deps` (`.dependency-cruiser.cjs`):

1. `src/` must not import `netlify/`, `tests/` or `scripts/`.
2. `netlify/` must not import `src/`.
3. No circular imports, except the recursive component `src/components/KeyValueList.vue`.

Details, the `@/` alias and the diagram: [docs/ARCHITECTURE.md#dependency-rules](docs/ARCHITECTURE.md#dependency-rules).

## Conventions

- British spelling everywhere: filenames, functions, data keys, script names (`sync-artefact.js`). Write "artefact".
- Netlify functions are CommonJS `.cjs` with `node_bundler = "esbuild"`. Do not use ESM there.
- The SPA uses `createWebHistory()`, so the `_redirects` catch-all (`/* → /index.html`) is required.
- Land data goes only through `src/services/landFetchCoordinator.js`. Never call `fetchLandDataFromServer()` from a component. See [docs/API_LAYER.md](docs/API_LAYER.md).
- Grid mechanics: [docs/GRID_MECHANICS.md](docs/GRID_MECHANICS.md).

## Typing

- The codebase is JavaScript and Vue only. There is no type checker.
- New code must not add suppression comments (`@ts-ignore`, `@ts-expect-error`, `eslint-disable` and similar).
- The typing strategy is an open decision: [docs/decisions/0003-typing-strategy.md](docs/decisions/0003-typing-strategy.md).

## Verification

- Before opening a PR, run `npm run check`.
- Solver or grid-transform changes also need `npm test`. Solver CLI and test rules: [docs/SOLVER.md](docs/SOLVER.md).
- For UI changes, build and drive the app in a browser. Smoke-test routes, click timing and local storage keys: [docs/ARCHITECTURE.md#local-run-build-and-browser-checks](docs/ARCHITECTURE.md#local-run-build-and-browser-checks).
- CI and health checks: [docs/ARCHITECTURE.md#ci-and-monitoring](docs/ARCHITECTURE.md#ci-and-monitoring).

## Auto-generated data (do not edit)

`src/data/game/` is synced from the Sunflower Land repo by CI: `treasurePrices.json`, `gameConstants.json`, `seasonalArtefacts.js` and `diggingFormations.js`. Sync schedules and the mirror to `development`: [docs/ARCHITECTURE.md#auto-synced-data](docs/ARCHITECTURE.md#auto-synced-data).

## DO NOT

- Add a dependency without asking.
- Add a top-level folder without asking.
- Edit tests or config to make checks pass.
- Add suppression comments (see Typing).
- Hand-edit `src/data/game/`.
- Push to `master`. Changes go by PR only: feature branch to `development`, then `development` to `master`. See [docs/decisions/0001-release-flow.md](docs/decisions/0001-release-flow.md).
- Add AI attribution (author names, `Co-Authored-By` trailers, "Generated with" lines) to commits or PRs.

## Dead code and gotchas

Dead code and load-bearing quirks (for example the routed `projectmate-feedback.cjs`, and grid tiles as `string[]` of CSS classes) are listed so you don't "fix" them blindly. Register: [docs/ARCHITECTURE.md#dead-code--gotchas-register](docs/ARCHITECTURE.md#dead-code--gotchas-register). Read [docs/GRID_MECHANICS.md](docs/GRID_MECHANICS.md) before touching tiles.

## Docs index

| Doc | Read it when |
|---|---|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Directories, routes, startup, dependency rules, environment, CI, local run |
| [docs/API_LAYER.md](docs/API_LAYER.md) | Before touching anything that fetches land data |
| [docs/GRID_MECHANICS.md](docs/GRID_MECHANICS.md) | The 10×10 grid, hints, formations, practice mode |
| [docs/SOLVER.md](docs/SOLVER.md) | Treasure solver, its debug tools, its tests |
| [docs/DIG_DAY_SYNC.md](docs/DIG_DAY_SYNC.md) | Dig-day Hub sync: debounce, ETag, merge |
| [docs/HUB_CONSUMPTION_SPEC.md](docs/HUB_CONSUMPTION_SPEC.md) | Hub-side ETag and idempotency contract |
| [docs/decisions/](docs/decisions/README.md) | Architecture decision records |
| [netlify/functions/README.md](netlify/functions/README.md) | Per-function reference for the `.cjs` proxies |
| [src/data/game/README.md](src/data/game/README.md) | Auto-synced game data |
| [SEASON_UPDATE_GUIDE.md](SEASON_UPDATE_GUIDE.md) / [API_KEY_SETUP.md](API_KEY_SETUP.md) | Seasonal artefact updates / SFL API keys |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Fork and PR workflow |
