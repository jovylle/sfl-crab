# Grid digging mechanics

The core feature is a **10x10 grid** (flat array, `index = y * 10 + x`). Each tile is stored as an array of CSS class strings — not typed objects.

See `src/composables/useGridEngine.js` for the grid engine, `src/composables/usePracticeEngine.js` for practice mode.

## Tile types & game invariant

| Class | Meaning |
|---|---|
| `sand` | Empty tile — provably not a treasure |
| `crab` | Crab tile — **always orthogonally adjacent to at least one treasure** |
| `treasure actual-treasure` | Treasure tile — its in-bounds orthogonal neighbours are **treasures or crabs, never sand** |

**The fundamental game rules** (these are the invariants the solver exploits):

1. **Treasure-neighbour rule**: every in-bounds orthogonal neighbour of a treasure is either a treasure (an adjacent plot of the same formation — e.g. the two `Vase` tiles of `HIEROGLYPH` touch) or a crab — **never sand or empty**. The practice engine encodes this directly: it auto-places crabs on *all unoccupied* orthogonal neighbours of placed treasures.
2. **Crab-neighbour rule**: every crab has at least one treasure among its in-bounds orthogonal neighbours. This is the basis of the solver's crab-satisfaction forcing (Pass 4).
3. Treasures only ever appear inside fixed formation shapes, placed by **translation only** (no rotation, no reflection) — see `src/data/game/diggingFormations.js`.

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
4. **Grid render** (`updateGridFromData`): Calls `gridArrayToTiles()` (`src/utils/gridTileTransform.js` — shared pure function, also used by the solver debug CLI) to convert API grid tiles (`{x, y, items: {Crab|Sand|TreasureName}}`) to CSS class arrays, then calls `rebuildNearHints()` to generate neighbor hints.
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

### Round start modes (`PracticeDigging.vue`)

The engine exposes three ways to build a board:

- **`startGame(keys, { exact })`** — random layout. `exact: true` keeps the given key array
  verbatim (incl. duplicates); otherwise `pickPracticePatterns` samples ≤7.
- **`startGameFromPlacements(placements)`** — deterministic rebuild from saved
  `[{ key, tiles:[{x,y}] }]` (used for the exact-board retry, `?board=`, and hub `?run=` replay).
- **`restoreRound(state)`** — rebuilds a board from placements **and re-applies dig progress**
  preserving original dig timestamps (used to resume an unfinished round).

Toolbar controls (shown once a round exists):

- **Today's Patterns ↺** — re-runs today's fixed daily set with a fresh random layout each press.
- **Random Round** — new random set from all formations.
- **Retry patterns ↺** — same pattern set as the current round, new random layout (`startGame(usedFormationKeys, { exact: true })`).
- **Retry same board ↺** — the identical layout again, to beat your own dig count (`startGameFromPlacements(formationPlacements)`).
- **Copy board link** — see below.

### Resume an unfinished round

The in-progress round is persisted to `localStorage` key **`practice:in-progress-round:1`**
(registered in `constants/storageKeys.js` as `PRACTICE_IN_PROGRESS`). It is written whenever
`digsMade > 0 && !isGameOver` (and on `beforeunload`/`visibilitychange`/unmount), and **cleared**
on game-over or when a new round starts with zero digs. Shape (`version: 1`):

```
{ version, savedAt, patternSource, patternDate, isReplayMode, replayRunId,
  placements: [{ key, tiles:[{x,y}] }], digHistory: [{ index, at }], elapsedMs }
```

On mount, precedence is: `?board=` → `?run=` → saved unfinished round (shows a **Resume /
Start new round** banner; no silent auto-resume) → else start today's round. Only digs are
restored — hint marks are not.

### Shareable board link (`?board=`)

`utils/practiceBoardCode.js` encodes a board into a self-contained, backend-free URL param.
Each placement is stored as `[key, ox, oy]` (formation key + origin offset; shapes are fixed in
`DIGGING_FORMATIONS`), JSON-serialized then base64url-encoded. `decodeBoard` rebuilds absolute
tiles for `startGameFromPlacements`. "Copy board link" builds
`/practice?board=<code>` via `router.resolve`; opening it reconstructs the exact board and shows
the "Shared Grid" badge. Invalid codes fall back to a normal round.

## Pattern detection

Three distinct pattern sets:

- **`patternKeys`** — formation keys that exist on the actual farm (from API `desert.digging.patterns`)
- **`completedPatternKeys`** — patterns where the farm owner has already dug all tiles (from API `desert.digging.completedPatterns`)
- **`dailyPatternKeys`** — today's practice patterns sourced from farm #1 via `/api/practice-patterns`

Pattern completion is detected locally by comparing dug grid tiles against formation pattern coordinates (`utils/patternPreview.js`).

## Prediction mode

A toggleable auto-solver that computes **guaranteed treasure locations** from revealed tiles + the known formation multiset.

### How it works (`src/utils/treasureSolver.js`)

Parses revealed state from tile classes (sand/crab/treasure + `tileImage:` name). Revealed treasure tiles store `treasure actual-treasure` as a single space-joined class, so tokens are flattened before matching.

**Algorithm — local, treasure-anchored deduction (five passes + finalization, iterated until stable):**

- **Pass 1 — treasure-anchored** (two-phase): for each revealed treasure T, enumerate every legal placement of any formation shape that could cover T (translation-only, no rotation/reflection; a placement is rejected if a plot lands on revealed sand/crab, on a differently-named revealed treasure, or orthogonally adjacent to revealed sand — the treasure-neighbour rule). Any cell that is a treasure-plot in *every* candidate placement is guaranteed. *Phase A* immediately promotes anchors with exactly one candidate (their cells are certain, and confirming them tightens later anchors); *Phase B* recomputes all candidates with those promotions applied and intersects.
- **Instance consumption**: when an anchor (or Pass 2/3 survivor) pins a shape to exactly one placement, that instance is *confirmed* — recorded by placement signature (dedup so two dug tiles of the same instance don't double-count) and its cell-origin is locked (`committedCellOrigin`), and the shape's remaining instance count (`remainingCount`) is decremented. Once a key reaches 0, no further placements of that shape are generated, which unblocks other anchors that were ambiguous only because of the now-committed instance. Pseudo-revealed cells never consume a slot.
- **Pass 2 — single-instance forcing**: when exactly one instance of a shape remains and a revealed treasure is *dynamically confined* to it (only that shape can explain it, considering sibling shapes already consumed), enumerate the instance's legal placements that cover all such reveals and intersect them.
- **Pass 3 — pure elimination**: for a single-remaining instance with no confined-name reveal to anchor on, enumerate every legal placement across the whole board. If only one survives (ruled out by sand/crab/edges/pseudo-reveals), its cells are guaranteed and the instance is consumed.
- **Pass 4 — crab-satisfaction forcing**: if a revealed crab has no known treasure neighbour and exactly one eligible candidate neighbour (not sand, not crab, not treasure, not sand-adjacent), that neighbour is a guaranteed treasure (name unknown).
- **Pass 5 — global-consistency name disambiguation**: the local passes are sound but incomplete — a cell can be provably a treasure while its NAME is only provable via global constraints (every formation instance occurs exactly once, placements may not overlap, and every revealed treasure must be covered by exactly one placement). Live case: C4=CB + D5=OP are diagonal, so no straight-line artefact can cover both — only SEVENTEEN's L fits, making D4 provably Camel Bone even though the local passes saw disagreeing candidates. For each guaranteed-but-ambiguous cell, Pass 5 runs a **bounded exact search** (backtracking over reveals, most-constrained first; 50k-node budget) asking "does a full consistent assignment exist where this cell carries name n?" for each disputed name. Names with no consistent assignment are eliminated; exactly one survivor is the proven name, which then propagates as a pseudo-reveal so the loop re-derives the rest. Budget exhaustion or zero survivors ⇒ stays ambiguous (never a wrong name). Sound because eliminating n only claims "no consistent assignment names this cell n" — and the real board's placement is always among the enumerated ones.
- **Propagation**: newly guaranteed cells with an unambiguous name are promoted to `revealedTreasureName` as *pseudo-reveals* so subsequent iterations can use them as spatial constraints for other formations. Cells whose name is still disputed (Pass 5 couldn't eliminate down to one) stay guaranteed-but-ambiguous — index kept, no slug emitted, deliberately **not** promoted, since treating them as a specific treasure could wrongly eliminate another shape's real placement. The loop repeats until a full iteration changes nothing.
- **Finalization — whole-pattern guarantee** (`guaranteedFormationCounts`): the number of *individually confirmed* instances per shape (distinct confirmed signatures), plus, for a shape with exactly one remaining instance whose lone survivor wasn't already confirmed, that instance. The UI checkmarks exactly that many of the shape's thumbnails (N-of-M, not all-or-nothing).

**Why local passes + a bounded global judge**: unrestricted global backtracking is exponential and, once capped, incomplete — intersecting an incomplete solution set can wrongly guarantee a tile. So the primary passes stay local (never a false positive, no cap needed). Pass 5 is the exception, and it's safe for a different reason: it never *adds* a guarantee from a partial search — it only *eliminates* a candidate name when an exhaustive (budgeted) search proves no consistent assignment exists. An exhausted budget yields no conclusion, so even a hard board can only stay ambiguous, never wrong. Every claim — positive or negative — is proven against the revealed state + the game invariants, and the 800-board soundness oracle checks them against ground truth.

The solve is synchronous and instant (no cap, no idle callback needed). It is called inside `usePredictionEngine.js` which wraps it in a `watchEffect` and debounces via `requestIdleCallback` for UI responsiveness.

**Return shape** — `solveTreasures(tiles, patternKeys, gridSize)` returns:
- `guaranteed: Set<idx>` — provably treasure (includes already-revealed treasure tiles; the UI filters them for display)
- `guaranteedSlugs: Map<idx, slug>` — treasure image slug, present only when the name is unambiguous
- `guaranteedCandidates: Map<idx, slug[]>` — for guaranteed-but-ambiguous cells, the disputed identities the solver is still weighing (feeds the UI "?" tooltip: "could be: camel bone, otter pebble"); cleared when a name is proven
- `guaranteedFormationCounts: Map<key, count>` — whole-pattern guarantees (see finalization)

### Testing the solver

Use the in-browser page at `/<landId>/solver-debug` (paste raw `desert.digging` JSON → instant board + guaranteed list) or the CLI `node scripts/debug-solver.js --file <snapshot.json>`. Both use the identical code path. See **Solver debug tools** in `AGENTS.md` for the full reference.

### Visual

Prediction marks use a solid green outline + corner badge + subtle green tint — visually distinct from user-placed marks (which use dashed borders). Class: `.predicted-guaranteed`.

### Toggle

Off by default, persisted per-land (`showPrediction-${landId}`, or `showPrediction-practice`). Available in both the live Digging view ("More ⋮" menu) and Practice (toolbar button).

## Tile CSS class conventions

When working with tile state, expect these patterns:

- `tiles.value[index]` is `string[]` — an array of class names applied to that tile's DOM element
- Real tile classes (`sand`, `crab`, `treasure actual-treasure`) come from API data
- Hint classes (`hint-*`) come from user input or localStorage
- Neighbor hint classes (`near-*`) are auto-generated and never persisted
- Image classes (`` tileImage:slug ``) determine which sprite to render (from `public/world/`)
- Number label marks are rendered as `<span>` overlays, not CSS classes
