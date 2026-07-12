# Grid digging mechanics

The core feature is a **10x10 grid** (flat array, `index = y * 10 + x`). Each tile is stored as an array of CSS class strings — not typed objects.

See `src/composables/useGridEngine.js` for the grid engine, `src/composables/usePracticeEngine.js` for practice mode.

## Tile types & game invariant

| Class | Meaning |
|---|---|
| `sand` | Empty/undisturbed tile |
| `crab` | Crab tile — **always orthogonally adjacent to a treasure** |
| `treasure actual-treasure` | Treasure tile — always surrounded by crabs |

**The fundamental game rule**: every treasure has crabs in its 4 orthogonal neighbors (if within bounds). The hint system exploits this — if you see a crab, a treasure is adjacent. If you see multiple known crabs, their intersection is a guaranteed treasure location.

Tiles also carry image classes like `tileImage:pearl`, `tileImage:crab`, `tileImage:sand` for rendering.

## Hint types

### User-placed marks (`useGridEngine.js:188`)

| Hint class | Meaning |
|---|---|
| `hint-sand` / `hint-crab` / `hint-treasure` / `hint-nothing` | Basic type marks |
| `hint-sand tileImage:sand` / `hint-crab tileImage:crab` | Type marks with image |
| `hint-treasure tileImage:X` | Treasure-type mark (e.g. `tileImage:pearl`) |
| `hint-potential-treasure` / `hint-potential-treasure2` | Potential treasure indicators |
| `hint-red-dot` | Generic mark |
| `hint-crab-eyes-maybe` | Ambiguous crab indicator |
| Number marks (keys 1–0) | Dig order marks via keyboard |
| `no-hint-and-show-trash-icon` | Clear marks on this tile |

Hints are persisted per-landId per UTC day in `localStorage` key `gridCustomHints_${landId}` (`useHintsStorage.js:4`). Data auto-clears when the stored date doesn't match today's UTC date.

### Auto-generated neighbor hints

The engine (`useGridEngine.js:90`) auto-generates proximity hints when grid state changes:

| Generated class | Trigger |
|---|---|
| `near-crab` | A known crab is on this tile's orthogonal neighbor |
| `near-hint-crab` | A user-marked crab hint is on this tile's orthogonal neighbor |
| `near-sand` + direction (`near-sand-top`, etc.) | A known sand is on this tile's orthogonal neighbor |
| `near-hint-sand` + direction | A user-marked sand hint is on this tile's orthogonal neighbor |

**Key quirk** (`useGridEngine.js:34-49`): `near-crab` / `near-hint-crab` hints are **suppressed** when any of the crab's orthgonal neighbors already contains a known treasure. This prevents misleading crab-proximity indicators adjacent to already-found treasures.

The engine rebuilds all neighbor hints via `rebuildNearHints()` after every grid or hint change.

## Formation patterns

Treasures appear in predefined patterns (`src/data/game/diggingFormations.js`). Each pattern is an array of `{x, y, name}` relative positions.

- **7 daily formations**: `MONDAY_ARTEFACT_FORMATION` through `SUNDAY_ARTEFACT_FORMATION` — 2-tile patterns combining `Camel Bone` with the current seasonal artefact
- **24 generic formations**: `ARTEFACT_ONE` through `ARTEFACT_TWENTY_FOUR`
- **Special formations**: `HIEROGLYPH`, `OLD_BOTTLE`, `COCKLE`, `WOODEN_COMPASS`, and others

The current seasonal artefact is determined by `getCurrentSeasonalArtefact()` in `seasonalArtefacts.js`, matching the current date against season date ranges. The artefact changes every ~3 months with new SFL seasons.

## Data flow

1. **Fetch**: `landApiService.js` → Netlify proxy `sfl-api.cjs` → Sunflower Land API `/community/farms/:id`
2. **Response shape**: `{ visitedFarmState: { desert: { digging: { grid, patterns, completedPatterns } } } }`
3. **Cache**: Data in localStorage per landId + API env, date-stamped (`useLandData.js`). Stale after UTC date changes.
4. **Grid render** (`updateGridFromData`): Converts API grid tiles (`{x, y, items: {Crab|Sand|TreasureName}}`) to CSS class arrays, then calls `rebuildNearHints()` to generate neighbor hints.
5. **Cooldown**: 15s between successful refreshes, 30s after failures (`useLandSync.js:10-11`). `bypassCache` is sent on every sync to skip the proxy's own 60s cache.

## Dig day persistence

`useDigDayStore.js` syncs user dig status to the SFL Digging Hub via `/api/dig-day`:

- **30s debounce** on writes to batch dig/mark events
- **ETag-based caching** for conditional GET (304 Not Modified support)
- **Merge-on-conflict**: mark events merged by sequence number (append-only, latest 500 kept)
- **Fingerprint change detection** to avoid unnecessary writes
- **Flush on visibility change + beforeunload** for reliable persistence
- Testnet lands and test API environments are hidden from the hub

## Practice mode

`usePracticeEngine.js` randomly places up to **7 formation patterns** (max 3 artefact patterns) on a 10x10 grid:

1. Picks patterns via Fisher-Yates shuffle
2. Tries up to 150 random placements per pattern to find non-overlapping positions
3. Auto-places crabs on all unoccupied orthogonal neighbors of placed treasures
4. Player digs to reveal tiles; game ends when all treasures are found (victory) or abandoned
5. Practice-of-the-day is sourced from **farm ID 1** (Adam's farm, `src/data/app/constants.js:17`), fetched via `/api/practice-patterns` which is CDN-cached until UTC midnight

## Pattern detection

Three distinct pattern sets:

- **`patternKeys`** — formation keys that exist on the actual farm (from API `desert.digging.patterns`)
- **`completedPatternKeys`** — patterns where the farm owner has already dug all tiles (from API `desert.digging.completedPatterns`)
- **`dailyPatternKeys`** — today's practice patterns sourced from farm #1 via `/api/practice-patterns`

Pattern completion is detected locally by comparing dug grid tiles against formation pattern coordinates (`utils/patternPreview.js`).

## Tile CSS class conventions

When working with tile state, expect these patterns:

- `tiles.value[index]` is `string[]` — an array of class names applied to that tile's DOM element
- Real tile classes (`sand`, `crab`, `treasure actual-treasure`) come from API data
- Hint classes (`hint-*`) come from user input or localStorage
- Neighbor hint classes (`near-*`) are auto-generated and never persisted
- Image classes (`` tileImage:slug ``) determine which sprite to render (from `public/world/`)
- Number label marks are rendered as `<span>` overlays, not CSS classes
