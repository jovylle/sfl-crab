# Prediction Mode + Guaranteed Treasure Marks — Implementation Plan

> **Status:** Ready to build. All research complete, all design decisions made.
> **Created:** 2026-07-13
> **Context:** This plan was developed across a full research session exploring the codebase. Everything you need to build this feature end-to-end is documented below — mechanics, architecture, file:line references, decisions, and step-by-step implementation.

---

## Table of Contents

1. [Feature Summary](#1-feature-summary)
2. [Design Decisions](#2-design-decisions)
3. [Digging Mechanics Reference](#3-digging-mechanics-reference)
4. [Architecture Map (file:line references)](#4-architecture-map-fileline-references)
5. [The Solver Algorithm](#5-the-solver-algorithm)
6. [Implementation Steps](#6-implementation-steps)
7. [File Change Summary](#7-file-change-summary)
8. [Key Risks & Mitigations](#8-key-risks--mitigations)
9. [Testing Notes](#9-testing-notes)

---

## 1. Feature Summary

A toggleable **Prediction Mode** that auto-computes **guaranteed treasure locations** from revealed tiles + the known formation multiset. When a treasure is revealed, the solver anchors the formation it belongs to and deduces sibling treasure tiles that must exist in every legal placement.

**Two contexts:**
- **Live Digging view** (`/digging`): uses farm's `patternKeys` from API minus `completedPatternKeys`
- **Practice view** (`/practice`): uses `usedFormationKeys` from the practice engine

**Visual style:** Badge icon (filled circle in top-right corner) + subtle green tint — clearly distinct from user-placed marks which use dashed borders.

**Toggle:** Off by default, persisted per-land in localStorage.

---

## 2. Design Decisions

These decisions were made interactively with the user. Do not change them without asking.

| Decision | Choice | Rationale |
|---|---|---|
| Prediction style | Auto-solver overlay with **badge icon + tint** | User explicitly chose this over dashed borders (which user marks use) or glowing rings |
| Logic type | **Treasure-anchored formation solver** (guaranteed only, 100%) | User said: "Crab and Sand are not important at all, it's that other treasure" — deduction is treasure-anchored, NOT crab-intersection logic |
| Confidence display | **Guaranteed only** | Only mark tiles that are treasure in EVERY legal placement. No "likely" / probability % — keeps it clean and never wrong |
| Toggle behavior | **Off by default**, persisted per-land | So it doesn't spoil the puzzle for people who want to solve manually |
| Formation placement | **Translation-only (no rotation/reflect)** | Confirmed by user. Practice engine already assumes this (`usePracticeEngine._buildGrid`). Solver tries only offsets, not rotations |
| Performance | **Cap at ~5000 solutions / ~200ms**, show partial results | Prevents UI freeze on complex boards with few reveals. Show a "partial" badge when cap is hit |

---

## 3. Digging Mechanics Reference

### The grid
- 10×10 flat grid, `index = y * 10 + x`. Each tile is `string[]` of CSS classes (NOT typed objects — fragile by design).
- Three real states from the API:
  - `sand` — empty/undisturbed tile
  - `crab` — crab tile (always orthogonally adjacent to a treasure)
  - `treasure actual-treasure` — treasure tile (always surrounded by crabs)
- Tiles also carry image classes like `tileImage:pearl`, `tileImage:crab`, `tileImage:sand` for rendering sprites.

### The fundamental game rule
Every treasure has crabs on its 4 orthogonal in-bounds neighbours (that aren't themselves treasure/formation tiles). A revealed crab guarantees ≥1 adjacent treasure. A treasure is always crab-surrounded.

### Formation patterns
- Treasures ONLY appear in fixed **formation patterns** defined in `src/data/game/diggingFormations.js`.
- Each pattern is an array of `{x, y, name}` relative positions.
- Formations are placed **translation-only** (no rotation/reflection) — confirmed by user and by practice engine behavior.
- The API tells you which patterns are on a farm today via `desert.digging.patterns`.
- The API tells you which patterns are fully dug via `desert.digging.completedPatterns`.

### Formation categories (in `diggingFormations.js`)
- **7 daily/weekday formations**: `MONDAY_ARTEFACT_FORMATION` through `SUNDAY_ARTEFACT_FORMATION` — 2-tile patterns combining `Camel Bone` with the current seasonal artefact
- **24 generic artefact formations**: `ARTEFACT_ONE` through `ARTEFACT_TWENTY_FOUR` — 1 to 5 tile patterns
- **Special formations**: `HIEROGLYPH`, `OLD_BOTTLE`, `COCKLE`, `WOODEN_COMPASS`, `SEA_CUCUMBERS`, `SEAWEED`, `CLAM_SHELLS`, `CORAL`, `PEARL`, `PIRATE_BOUNTY`

### Tile CSS class conventions
- `tiles.value[index]` is `string[]` — array of class names applied to the DOM element
- Real tile classes (`sand`, `crab`, `treasure actual-treasure`) come from API data
- Hint classes (`hint-*`) come from user input or localStorage
- Neighbor hint classes (`near-*`) are auto-generated and never persisted
- Image classes (`tileImage:slug`) determine which sprite to render (from `public/world/`)
- Number label marks are rendered as `<span>` overlays, not CSS classes

### Existing hint classes (user-placed)
| Hint class | Meaning |
|---|---|
| `hint-sand` / `hint-crab` / `hint-treasure` / `hint-nothing` | Basic type marks |
| `hint-sand tileImage:sand` / `hint-crab tileImage:crab` | Type marks with image |
| `hint-treasure tileImage:X` | Treasure-type mark (e.g. `tileImage:pearl`) |
| `hint-potential-treasure` / `hint-potential-treasure2` | Potential treasure indicators (cosmetic dots, no logic) |
| `hint-red-dot` | Generic mark |
| `hint-crab-eyes-maybe` | Ambiguous crab indicator |
| `hint-label:0`–`hint-label:9` | Dig order number marks (keyboard only) |
| `no-hint-and-show-trash-icon` | Clear marks on this tile |

### Auto-generated neighbor hints
- `near-crab` — a known crab is on this tile's orthogonal neighbor
- `near-hint-crab` — a user-marked crab hint is on this tile's orthogonal neighbor
- `near-sand` + direction (`near-sand-top`, etc.) — a known sand is on this tile's orthogonal neighbor
- `near-hint-sand` + direction — a user-marked sand hint is on this tile's orthogonal neighbor
- **Quirk:** `near-crab`/`near-hint-crab` hints are suppressed when any of the crab's orthogonal neighbors already contains a known treasure (prevents misleading indicators adjacent to already-found treasures).

---

## 4. Architecture Map (file:line references)

### Key files for this feature

#### `src/composables/useGridEngine.js` — Core grid engine
- Line 4: `useGridEngine(gridSize = 10)` — initializes tiles as `ref(Array of [])`
- Lines 25-75: `applyHint(x, y, hintClass)` — applies neighbor hints to orthogonal tiles
- Lines 33-50: **Suppression rule** — `near-crab`/`near-hint-crab` skipped if neighbor has treasure
- Lines 78-87: `clearNearHints()` — strips all `near-*` classes
- Lines 90-116: `rebuildNearHints()` — rebuilds ALL neighbor hints from scratch. Walks every tile, applies hints for `crab`, `hint-crab tileImage:crab`, `sand`, `hint-sand tileImage:sand`. Called after every grid/hint change.
- Lines 146-174: `updateGridFromData(grid)` — converts API tiles to CSS class arrays, then calls `rebuildNearHints()`
- Lines 188-203: `pickEngineHint(idx, hintClass)` — strips old hints, applies new one, calls `rebuildNearHints()`
- Lines 206-216: `clearEngineHints()` — removes all `hint-*` and `near-hint-*` classes
- **Returns:** `{ tiles, updateGridFromData, pickEngineHint, clearEngineHints, rebuildNearHints }`

#### `src/composables/useGridManager.js` — Cached engine + storage wrapper
- Line 6: `const cache = {}` — module-level cache, keyed by landKey
- Lines 11-12: Creates `useGridEngine` + `useHintsStorage` per land
- Lines 18-26: `applySavedHints()` — reapplies localStorage hints on top of engine's base grid
- Lines 32-36: `update(apiGrid)` — rebuilds engine from API data + reapplies storage
- Lines 60-70: `clear()` — clears all hints + storage + markJournal
- Lines 78-98: `pick(index, hintClass)` — calls `engine.pickEngineHint`, normalizes to flat array, saves to storage, notifies markJournal
- **Returns:** `{ tiles, update, pick, clear }` (cached per landId)

#### `src/composables/usePracticeEngine.js` — Practice mode engine
- Line 4: `GRID_SIZE = 10`
- Line 5: `PRACTICE_ROUND_LIMIT = 7` (max 7 patterns per round)
- Line 6: `MAX_ARTEFACT_PATTERNS_PER_ROUND = 3`
- Lines 47-89: `_buildGridFromPlacements(placements)` — builds grid from explicit placements (for replays)
- Lines 91-154: `_buildGrid(keys)` — places formations translation-only (no rotation), auto-derives crabs around treasures. 150 attempts per pattern for non-overlapping placement.
- Lines 156-173: `startGame(allKeys, options)` — picks patterns, builds grid, resets state
- Lines 175-186: `startGameFromPlacements(placements)` — for replay rounds
- Lines 188-200: `dig(index)` — reveals tile, auto-wins when all treasures found
- Lines 215-221: `displayTiles` computed — `null` for hidden, `{...tile, revealed:true}` for dug, `{...tile, ghosted:true}` after game over
- **Returns:** `{ displayTiles, digsMade, isGameOver, isVictory, usedFormationKeys, roundCount, treasuresFound, totalTreasures, startGame, startGameFromPlacements, dig, giveUp, finishGame, hiddenGrid, digHistory, formationPlacements }`

#### `src/components/Grid.vue` — Live grid renderer
- Line 27-67: Renders 100 tiles in a CSS grid, each `<div :class="normalizeTile(tile)">` with `<img>` for tile image + `<span>` for number labels + treasure order badge
- Line 32: `:class="normalizeTile(tile)"` — THE place to add prediction classes
- Line 37-42: `<img>` for tile image (from `tileImage:slug` class → `/world/slug.webp`)
- Lines 73-91: `<HintPicker>` popup with hint options array (lines 78-88)
- Line 101: `import { useGridManager } from '@/composables/useGridManager'`
- Lines 115-119: Props: `showTreasureOrder`, `treasureOrderMap`, `showLandIdInUrl`
- Lines 122-124: `const landId = route.params.landId || '0'`, `const grid = useGridManager(landId)`
- Line 127: `const tiles = grid.tiles` — reactive tiles
- Lines 141-149: `onTileClick` — opens HintPicker popup
- Lines 151-154: `onHintPicked` → `grid.pick(tileIndex, hint)`
- Lines 168-171: `normalizeTile(tile)` — returns array or splits string
- **Note:** `Grid.vue` independently calls `useGridManager(landId)` but gets the SAME cached instance as the view

#### `src/components/PracticeGrid.vue` — Practice grid renderer
- Lines 17-78: Renders 100 tiles. Uses `outerClasses(tile, index)` (line 348) instead of `normalizeTile` for class computation
- Line 121: `const engine = useGridEngine(10)` — LOCAL engine, no persistence (not `useGridManager`)
- Lines 123-128: Props: `tiles` (displayTiles from parent), `hiddenGrid`, `gameOver`, `loading`
- Line 130: `emit(['dig', 'auto-finish'])`
- Lines 141-142: `sandAutoSet` / `crabAutoSet` — computed auto-markers from revealed tiles
- Lines 143-159: `shouldAutoFinish` — auto-ends round when all treasures revealed or have `hint-treasure` mark
- Lines 162-172: `MARK_HINTS` array — same hint options as live Grid
- Lines 200-216: `onLeftClick` — two-click confirm dig
- Lines 219-236: `onRightClick` — opens HintPicker for marking
- Lines 237-244: `onHintPicked` → `engine.pickEngineHint(tileIndex, hint)` directly (no storage)
- Lines 247-253: `hasHint` / `hasTreasureHint` — check engine tiles for hint classes
- Lines 255-268: `getHintSlug` / `getHintImagePath` — extract image from hint classes
- Lines 270-284: `getSlug` / `getImagePath` — extract image from revealed tile
- Lines 286-298: `hasAdjacentTreasure(index)` — checks if any orthogonal neighbor is a revealed treasure
- Lines 300-336: `collectAutoMarkers(type)` — derives full-cell hints from revealed sand/crab
- Lines 338-346: `getAutoMarker(index)` — returns `hint-crab-eyes-maybe` or `hint-nothing` for auto-marking
- **Line 348-362: `outerClasses(tile, index)` — THE place to add prediction classes. Current logic:**
  ```js
  function outerClasses(tile, index) {
    if (diggingSet.value.has(index))    return ['bg-base-200', 'cursor-wait']
    if (confirmIndex.value === index)   return ['practice-confirming', 'cursor-pointer']
    if (tile?.revealed)                 return [tile.type, 'practice-reveal']
    if (tile?.ghosted)                  return ['practice-ghosted', tile.type]
    const hints = engine.tiles.value[index]
    if (hints?.length) return [...hints, 'cursor-pointer']
    const autoMarker = getAutoMarker(index)
    if (autoMarker) return [autoMarker, 'cursor-pointer']
    return props.gameOver
      ? ['bg-base-100']
      : ['bg-base-100', 'cursor-pointer', 'practice-undigged']
  }
  ```

#### `src/components/HintPicker.vue` — Mark picker popup
- Lines 14-40: Renders hint options in a grid
- Lines 41-64: "Today's Treasure" suggestions (live only, driven by `possibleTreasures` prop)
- Lines 88, 131-135: Emits `pick { tileIndex, hint }`
- Lines 91-101: Keyboard shortcuts: `q`=red-dot, `w`=potential-treasure, `e`=potential-treasure2, `a`=sand, `s`=treasure, `d`=crab, `z`=nothing, `x`=trash, `c`=crab-eyes-maybe. Digits 0-9 for number labels.
- Lines 156-178: `selectSuggestedHint` — emits `hint-treasure tileImage:${imageSlug}`

#### `src/views/Digging.vue` — Live digging page
- Lines 20-29: `<DigToolSection>` with v-model bindings for `showTreasureOrder` and `hideLandIdInUrl`
- Lines 32-38: `<Grid>` with props `:show-treasure-order`, `:treasure-order-map`, `:show-land-id-in-url`
- Lines 40-42: `<TodayPatterns>` shown when `hasDailyPatterns`
- Line 102: `const landId = route.params.landId || 'guest'`
- Lines 103-108: `showTreasureOrder` and `hideLandIdInUrl` persisted via `useLocalStorage(\`${pref}-${landId}\`, false)`
- Line 110: `const grid = useGridManager(landId)`
- Lines 112-117: `useLandData(defaults)` destructures `desert`, `dailyPatternKeys`, `dailyPatternDate`, `completedPatternKeys`
  - **IMPORTANT:** `patternKeys` is available from `useLandData` (line 41 of `useLandData.js`) but is NOT currently destructured in `Digging.vue`. You need to add it.
- Lines 223-231: Watch on `desert.value.digging?.grid` → `grid.update(flatGrid)`
- Lines 233-239: `treasureOrderMap` computed from `buildTreasureOrderMap(rawGrid, gridSize)`

#### `src/views/PracticeDigging.vue` — Practice page
- Lines 17-52: Toolbar with buttons: Give Up, Show Timer toggle, Save Scores checkbox, Today's Patterns, Random Round
- Lines 135-143: `<PracticeGrid :key="round-${roundCount}" :tiles="displayTiles" :hidden-grid="hiddenGrid" :game-over="isGameOver" :loading="isStartingTodayRound" @auto-finish="finishGame" @dig="dig" />`
- Line 192: `const ALL_FORMATION_KEYS = Object.keys(DIGGING_FORMATIONS)`
- Lines 196-213: Destructures `usePracticeEngine()` — includes `usedFormationKeys` and `hiddenGrid`
- Line 228: `const showTimer = ref(true)` — pattern to follow for `showPrediction`
- Lines 167-169: `<PracticePatterns :pattern-keys="usedFormationKeys" />` — shows formations placed this round

#### `src/components/DigToolSection.vue` — Live toolbar
- Lines 14-89: "More ⋮" dropdown with: Clear Marks, Practice, Copy link with marks, Show Order checkbox (lines 54-62), Don't show land id checkbox (lines 64-76), Clear Land ID
- Lines 54-62: **Show Order checkbox pattern to follow:**
  ```html
  <label class="flex items-center mx-auto rounded border border-base-300 p-2 tooltip cursor-pointer" data-tip="Show Treasure Order">
    <input type="checkbox" :checked="showTreasureOrder"
      @change="$emit('update:showTreasureOrder', $event.target.checked)"
      class="checkbox checkbox-sm mr-1 text-nowrap" />
    Show Order
  </label>
  ```
- Lines 112-120: Props defined: `showTreasureOrder`, `hideLandIdInUrl`, etc.
- Line 156: `defineEmits(['update:showTreasureOrder', 'update:hideLandIdInUrl', 'open-replay'])`
- Line 109: `const grid = useGridManager(landId)` — shared cached instance

#### `src/composables/useLandData.js` — Land data store
- Line 41: `const patternKeys = computed(() => desert.value.digging?.patterns || [])` — formations on the actual farm
- Lines 42-44: `const completedPatternKeys = computed(() => desert.value.digging?.completedPatterns || [])`
- Lines 45-53: `const dailyPatternKeys = computed(() => ...)` — practice patterns from farm #1
- **Returns:** `{ landData, inventory, desert, patternKeys, completedPatternKeys, dailyPatternKeys, dailyPatternDate }`

#### `src/composables/usePracticePatterns.js` — Daily practice patterns
- Line 59: `patternKeys` ref — from cache when valid
- `localStorage` cache key: `practice:today-patterns:${ADAM_OWNER_ID}`, version `2`
- `refreshPracticePatterns()` — single-flight fetch from `/api/practice-patterns`, reads `visitedFarmState.desert.digging.patterns`

#### `src/composables/useTodayTreasureNames.js` — Pattern keys → treasure names
- Pulls `landData` + `dailyPatternKeys` from `useLandData`
- Prefers farm's own `...desert.digging.patterns`, falling back to `dailyPatternKeys`
- Maps each formation key through `DIGGING_FORMATIONS[key]` and collects `.name` of each plot into a de-duped array
- Consumed at `Grid.vue:112` → passed to HintPicker as `:possibleTreasures`

#### `src/utils/patternPreview.js` — Pattern utilities
- Lines 13-31: `getFormationBounds(formation)` — minX, minY, width, height
- Lines 64-79: `buildServerCompletedIndexes(patternKeys, completedPatternKeys)` — maps completedPatterns to thumb indexes using multiset subtraction
  - **This is the pattern to follow for computing `activePatternKeys`** (patternKeys minus completedPatternKeys as a filtered array)

#### `src/data/game/diggingFormations.js` — All formation definitions
- Line 8: `const CURRENT_SEASONAL_ARTEFACT = getCurrentSeasonalArtefact()` — resolved at module load
- Lines 14-268: `DIGGING_FORMATIONS` object with all pattern keys → arrays of `{x, y, name}`
- Export: `DIGGING_FORMATIONS` — imported everywhere as `import { DIGGING_FORMATIONS } from '@/data/game/diggingFormations.js'`

#### `src/constants/storageKeys.js` — localStorage key registry
- Lines 17-73: `STORAGE_KEYS` object with fixed keys
- Lines 88-92: `landDataKey(landId, testApi)` — parameterized
- Lines 109-111: `gridCustomHintsKey(landId)` → `gridCustomHints_${landId}`
- Lines 127-129: `landUiPrefKey(landId, pref)` → `${pref}-${landId}`
  - **Line 126 comment:** `@param {'showTreasureOrder' | 'hideLandIdInUrl'} pref` — needs `'showPrediction'` added to this union

#### `src/styles/style.css` — Global tile styling
- Lines 174-194: Base tile colors: `.near-crab` (yellow), `.near-sand` (red), `.sand` (red), `.crab` (yellow), `.treasure` (green)
- Lines 196-212: `.hint-sand:not(.sand)` — red dashed border + sand.png bg
- Lines 201-221: `.hint-crab:not(.crab)` — yellow dashed + crab.png bg
- Lines 223-232: `.hint-treasure:not(.treasure)` — green dashed border
- Lines 235-250: `.hint-potential-treasure::after` — green dashed dot
- Lines 251-266: `.hint-potential-treasure2::after` — yellow dashed dot
- Lines 267-282: `.hint-red-dot::after` — red dashed dot
- Lines 292-295: `.hint-nothing` — red dashed
- Lines 297-300: `.hint-crab-eyes-maybe` — yellow dashed
- Lines 303-329: `.tile[class*="hint-label:"]` — number mark styling
- Lines 331-342: `.near-hint-sand` / `.near-hint-crab` directional overlays
- **New prediction CSS goes after line ~342**

### Three grid renderers in the codebase

| Component | Used by | Engine | Persistence |
|---|---|---|---|
| `components/Grid.vue` | Digging.vue (live) | `useGridManager` (shared, cached per landId) | localStorage + markJournal |
| `components/PracticeGrid.vue` | PracticeDigging.vue | `useGridEngine` (local, ephemeral) | none |
| `components/HintPicker.vue` | both grids | — | — |

### Mark persistence path (live grid)
- `Grid.vue:151-154` `onHintPicked` → `grid.pick(tileIndex, hint)` → `useGridManager.pick` → `engine.pickEngineHint` + `storage.save()` + `markJournalBridge.onPick`
- `useHintsStorage.js`: localStorage key `gridCustomHints_${landId}`, date-stamped, auto-wipes on UTC day change

### Mark persistence path (practice grid)
- `PracticeGrid.vue:237-244` `onHintPicked` → `engine.pickEngineHint(tileIndex, hint)` directly — NO save, marks vanish on round change

---

## 5. The Solver Algorithm

### New file: `src/utils/treasureSolver.js`

Pure function, no Vue reactivity. Testable in isolation.

```js
/**
 * @param {string[][]} tiles - 100 cells of CSS class arrays from useGridEngine
 * @param {string[]} patternKeys - formation multiset still in play
 *   (live: patternKeys minus completedPatternKeys)
 *   (practice: usedFormationKeys from usePracticeEngine)
 * @param {number} gridSize - default 10
 * @param {number} cap - max solutions to enumerate (default 5000)
 * @returns {{ guaranteed: Set<number>, partial: boolean }}
 */
export function solveTreasures(tiles, patternKeys, gridSize = 10, cap = 5000) {
  // ... see steps below
}
```

### Step 1 — Parse revealed state from tile classes

For each tile index (0-99), scan its class array:
- Contains `sand` → revealed sand (EXCLUSION: no treasure can be here)
- Contains `crab` → revealed crab (EXCLUSION: no treasure can be here)
- Contains `treasure` AND `actual-treasure` → revealed treasure
  - Extract name from `tileImage:slug` class → convert slug back to display name (e.g. `camel_bone` → `Camel Bone`, `pirate_bounty` → `Pirate Bounty`)
  - The slug is `itemName.toLowerCase().replace(/\s+/g, '_')` (see `useGridEngine.js:158`)
  - Reverse: `slug.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())` — BUT this may not perfectly round-trip all names. Better: match against formation names case-insensitively.
- Empty array or only hint/near classes → UNDUG (unknown, could be treasure)

Build:
```js
const revealedSand = new Set()    // indices of revealed sand
const revealedCrab = new Set()    // indices of revealed crab
const revealedTreasures = []      // [{ index, x, y, name }] — revealed treasure tiles
```

### Step 2 — Build candidate placements per formation

For each formation key in `patternKeys` (treating duplicates as SEPARATE instances — use index-based multiset handling):

```js
import { DIGGING_FORMATIONS } from '@/data/game/diggingFormations.js'

// For each pattern instance, compute all valid translations
const instances = []  // [{ key, instanceIdx, candidates: [{ ox, oy, plots: [{x, y, name}] }] }]

patternKeys.forEach((key, instIdx) => {
  const formation = DIGGING_FORMATIONS[key]
  if (!formation?.length) return

  // Compute formation bounds
  const xs = formation.map(p => p.x)
  const ys = formation.map(p => p.y)
  const minFx = Math.min(...xs), maxFx = Math.max(...xs)
  const minFy = Math.min(...ys), maxFy = Math.max(...ys)

  const candidates = []
  for (let ox = -minFx; ox <= gridSize - 1 - maxFx; ox++) {
    for (let oy = -minFy; oy <= gridSize - 1 - maxFy; oy++) {
      const plots = formation.map(p => ({ x: ox + p.x, y: oy + p.y, name: p.name }))

      // Check validity:
      let valid = true
      for (const plot of plots) {
        const idx = plot.y * gridSize + plot.x

        // No plot on revealed sand/crab
        if (revealedSand.has(idx) || revealedCrab.has(idx)) { valid = false; break }

        // If plot lands on a revealed treasure, name must match
        const rt = revealedTreasures.find(t => t.index === idx)
        if (rt && !namesMatch(rt.name, plot.name)) { valid = false; break }
      }
      if (valid) candidates.push({ ox, oy, plots })
    }
  }

  instances.push({ key, instanceIdx: instIdx, candidates })
})
```

**Name matching helper:**
```js
function namesMatch(revealedName, formationName) {
  // Both should be display names like "Camel Bone", "Pearl", etc.
  // Formation names come from diggingFormations.js (already display names)
  // Revealed names come from tileImage:slug → reverse-slugified
  // Compare case-insensitively, normalize underscores/spaces
  const norm = s => String(s).toLowerCase().replace(/[\s_]+/g, ' ').trim()
  return norm(revealedName) === norm(formationName)
}
```

### Step 3 — Backtracking search

Assign formations to candidate placements one by one. Collect all valid complete assignments.

**Key optimizations:**
1. **Anchor-first ordering:** Process formations that have candidates covering revealed treasures FIRST. This dramatically reduces branching because anchored formations have very few valid placements.
2. **Early pruning:** After each assignment, check that no two formations' treasure plots overlap, and that every revealed treasure is covered by exactly one assigned formation plot (with matching name).
3. **Cap:** Stop after `cap` solutions OR after ~200ms wall time. Set `partial = true`.

```js
const solutions = []  // each solution is array of { key, plots: [{x,y,name}] }
const startTime = Date.now()
const TIME_LIMIT_MS = 200

// Sort instances: those with candidates covering revealed treasures first
const sortedInstances = [...instances].sort((a, b) => {
  const aAnchored = a.candidates.some(c => c.plots.some(p =>
    revealedTreasures.some(rt => rt.x === p.x && rt.y === p.y)
  ))
  const bAnchored = b.candidates.some(c => c.plots.some(p =>
    revealedTreasures.some(rt => rt.x === p.x && rt.y === p.y)
  ))
  return (bAnchored ? 1 : 0) - (aAnchored ? 1 : 0)
})

function backtrack(instIdx, assigned, coveredTreasureIndices) {
  if (Date.now() - startTime > TIME_LIMIT_MS || solutions.length >= cap) {
    partial = true
    return
  }

  if (instIdx >= sortedInstances.length) {
    // All formations placed — check all revealed treasures are covered
    if (revealedTreasures.every(rt => coveredTreasureIndices.has(rt.index))) {
      solutions.push(assigned.map(a => ({ key: a.key, plots: a.plots })))
    }
    return
  }

  const inst = sortedInstances[instIdx]
  for (const cand of inst.candidates) {
    // Check no overlap with already-assigned plots
    let overlap = false
    for (const plot of cand.plots) {
      const idx = plot.y * gridSize + plot.x
      if (assigned.some(a => a.plots.some(p => p.y * gridSize + p.x === idx))) {
        overlap = true; break
      }
    }
    if (overlap) continue

    // Check revealed treasure coverage consistency
    let treasureConflict = false
    const newCovered = new Set(coveredTreasureIndices)
    for (const plot of cand.plots) {
      const idx = plot.y * gridSize + plot.x
      const rt = revealedTreasures.find(t => t.index === idx)
      if (rt) {
        if (coveredTreasureIndices.has(idx)) { treasureConflict = true; break }
        newCovered.add(idx)
      }
    }
    if (treasureConflict) continue

    assigned.push({ key: inst.key, plots: cand.plots })
    backtrack(instIdx + 1, assigned, newCovered)
    assigned.pop()
  }
}

let partial = false
backtrack(0, [], new Set())
```

### Step 4 — Compute guaranteed set

```js
if (solutions.length === 0) {
  // Inconsistent grid (shouldn't happen if API data is correct)
  // Return empty — graceful failure
  return { guaranteed: new Set(), partial: true }
}

// For each tile index, check if it's a treasure plot in EVERY solution
const guaranteed = new Set()
const allTiles = new Set() // all tiles that are treasure in at least one solution

for (const sol of solutions) {
  for (const inst of sol) {
    for (const plot of inst.plots) {
      const idx = plot.y * gridSize + plot.x
      allTiles.add(idx)
    }
  }
}

for (const idx of allTiles) {
  const inAll = solutions.every(sol =>
    sol.some(inst => inst.plots.some(p => p.y * gridSize + p.x === idx))
  )
  if (inAll) guaranteed.add(idx)
}

return { guaranteed, partial }
```

**Edge cases:**
- `patternKeys` empty → return `{ guaranteed: new Set(), partial: false }`
- No revealed tiles → enormous search space; cap kicks in quickly, results sparse/empty (fine — predictions are weak early game)
- All patterns completed → `activePatternKeys` is empty → return empty
- Single-tile formations (e.g. `ARTEFACT_THREE`, `PIRATE_BOUNTY`) → can be placed anywhere not excluded; only guaranteed if exactly one non-excluded slot remains
- Only one solution exists → every treasure tile in that solution is guaranteed

### Reactive wrapper: `src/composables/usePredictionEngine.js`

```js
import { ref, watch, toRef } from 'vue'
import { solveTreasures } from '@/utils/treasureSolver.js'

export function usePredictionEngine(tilesRef, patternKeysRef, enabledRef, gridSize = 10) {
  const guaranteed = ref(new Set())
  const isPartial = ref(false)

  let idleId = null

  function recompute() {
    if (idleId) cancelIdleCallback(idleId)

    if (!enabledRef.value) {
      guaranteed.value = new Set()
      isPartial.value = false
      return
    }

    // Use requestIdleCallback for non-blocking computation
    // Fallback to setTimeout(0) if requestIdleCallback not available
    const schedule = window.requestIdleCallback || ((cb) => setTimeout(cb, 0))
    const cancel = window.cancelIdleCallback || clearTimeout

    idleId = schedule(() => {
      const result = solveTreasures(tilesRef.value, patternKeysRef.value, gridSize)
      guaranteed.value = result.guaranteed
      isPartial.value = result.partial
    })
  }

  watch(
    [tilesRef, patternKeysRef, enabledRef],
    recompute,
    { immediate: true, deep: true }
  )

  return { guaranteed, isPartial }
}
```

---

## 6. Implementation Steps

### Step 1: Create the solver — `src/utils/treasureSolver.js` (NEW)

Pure function as described in Section 5. No Vue dependencies. Only imports `DIGGING_FORMATIONS` from `@/data/game/diggingFormations.js`.

Export: `solveTreasures(tiles, patternKeys, gridSize, cap)` → `{ guaranteed: Set<number>, partial: boolean }`

Also export helper: `computeActivePatternKeys(patternKeys, completedPatternKeys)` — multiset subtraction returning filtered array. Pattern to follow from `buildServerCompletedIndexes` in `patternPreview.js:64-79` but produces a filtered key array instead of index set.

```js
export function computeActivePatternKeys(patternKeys, completedPatternKeys) {
  const remaining = new Map()
  for (const key of completedPatternKeys || []) {
    remaining.set(key, (remaining.get(key) ?? 0) + 1)
  }
  return (patternKeys || []).filter(key => {
    const left = remaining.get(key) ?? 0
    if (left > 0) {
      remaining.set(key, left - 1)
      return false // this instance is completed, skip it
    }
    return true // this instance is still in play
  })
}
```

### Step 2: Create the reactive wrapper — `src/composables/usePredictionEngine.js` (NEW)

As described in Section 5. Imports `solveTreasures` from `@/utils/treasureSolver.js`.

### Step 3: Add CSS — `src/styles/style.css` (EDIT)

Add after the existing hint classes (after ~line 342):

```css
/* ── Prediction marks (auto-generated, distinct from user marks) ── */
.tile.predicted-guaranteed {
  background: oklch(var(--color-success) / 0.15);
  outline: 2px solid oklch(var(--color-success) / 0.7);
  outline-offset: -2px;
}

.tile.predicted-guaranteed::after {
  content: "";
  position: absolute;
  top: 2px;
  right: 2px;
  width: 30%;
  height: 30%;
  background: oklch(var(--color-success) / 0.9);
  border-radius: 50%;
  pointer-events: none;
  z-index: 5;
}
```

**Visual distinction from user marks:**
- User marks: dashed borders in various colors (yellow, red, green)
- Prediction marks: solid outline + filled corner badge + subtle tint
- Completely different visual language

### Step 4: Edit `src/components/Grid.vue` — live grid (EDIT)

**4a. Add new prop:**
```js
// In defineProps (line 115-119), add:
showPrediction: { type: Boolean, default: false },
```

**4b. Import prediction engine + land data:**
```js
import { usePredictionEngine } from '@/composables/usePredictionEngine.js'
import { useLandData } from '@/composables/useLandData.js'
import { computeActivePatternKeys } from '@/utils/treasureSolver.js'
import { toRef } from 'vue'
```

**4c. Instantiate prediction engine:**
After `const grid = useGridManager(landId)` (line 124) and `const tiles = grid.tiles` (line 127):

```js
// Get pattern keys for this land
const { patternKeys, completedPatternKeys } = useLandData()
const activePatternKeys = computed(() =>
  computeActivePatternKeys(patternKeys.value, completedPatternKeys.value)
)
const { guaranteed, isPartial } = usePredictionEngine(
  tiles,
  activePatternKeys,
  toRef(props, 'showPrediction')
)
```

**Note:** `Grid.vue` already imports `useTodayTreasureNames` which internally uses `useLandData`. Calling `useLandData` again is fine — it returns computed refs backed by the same `useStorage` localStorage key.

**4d. Add prediction class to tile render:**

Change line 32 from:
```html
:class="normalizeTile(tile)"
```
To:
```html
:class="[
  ...normalizeTile(tile),
  ...(showPrediction && guaranteed.has(index) && !isRevealed(tile) ? ['predicted-guaranteed'] : [])
]"
```

Add helper function:
```js
function isRevealed(tile) {
  const classes = normalizeTile(tile)
  return classes.some(c => c === 'sand' || c === 'crab' || c === 'treasure')
}
```

**4e. (Optional) Show partial badge near grid:**
Add near the grid container:
```html
<span v-if="showPrediction && isPartial" class="badge badge-warning badge-xs absolute -top-5 right-0">
  partial
</span>
```

### Step 5: Edit `src/components/PracticeGrid.vue` — practice grid (EDIT)

**5a. Add new props:**
```js
// In defineProps (line 123-128), add:
showPrediction: { type: Boolean, default: false },
patternKeys: { type: Array, default: () => [] },
```

**5b. Import prediction engine:**
```js
import { usePredictionEngine } from '@/composables/usePredictionEngine.js'
import { toRef } from 'vue'
```

**5c. Instantiate prediction engine:**
After `const engine = useGridEngine(10)` (line 121):

```js
const { guaranteed, isPartial } = usePredictionEngine(
  engine.tiles,
  toRef(props, 'patternKeys'),
  toRef(props, 'showPrediction')
)
```

**5d. Add prediction class in `outerClasses` (line 348-362):**

Insert BEFORE the final return statement (before `return props.gameOver ? ...`):

```js
function outerClasses(tile, index) {
  if (diggingSet.value.has(index))    return ['bg-base-200', 'cursor-wait']
  if (confirmIndex.value === index)   return ['practice-confirming', 'cursor-pointer']
  if (tile?.revealed)                 return [tile.type, 'practice-reveal']
  if (tile?.ghosted)                  return ['practice-ghosted', tile.type]
  const hints = engine.tiles.value[index]
  if (hints?.length) return [...hints, 'cursor-pointer']
  const autoMarker = getAutoMarker(index)
  if (autoMarker) return [autoMarker, 'cursor-pointer']

  // ── Prediction: guaranteed treasure ──
  if (props.showPrediction && guaranteed.value.has(index)) {
    return ['predicted-guaranteed', 'cursor-pointer']
  }

  return props.gameOver
    ? ['bg-base-100']
    : ['bg-base-100', 'cursor-pointer', 'practice-undigged']
}
```

### Step 6: Edit `src/components/DigToolSection.vue` — live toggle (EDIT)

**6a. Add prop + emit:**
```js
// In defineProps (line 112-120), add:
showPrediction: { type: Boolean, default: false },

// In defineEmits (line 156), add:
defineEmits(['update:showTreasureOrder', 'update:hideLandIdInUrl', 'update:showPrediction', 'open-replay'])
```

**6b. Add toggle checkbox in the "More ⋮" dropdown** (after the "Show Order" label, around line 62):

```html
<label class="flex items-center mx-auto rounded border border-base-300 p-2 tooltip cursor-pointer"
       data-tip="Auto-highlight guaranteed treasure locations from known patterns">
  <input type="checkbox" :checked="showPrediction"
    @change="$emit('update:showPrediction', $event.target.checked)"
    class="checkbox checkbox-sm mr-1 text-nowrap" />
  Prediction
</label>
```

### Step 7: Edit `src/views/Digging.vue` — wire toggle (EDIT)

**7a. Add `showPrediction` persistent ref:**
After line 107 (`hideLandIdInUrl`), add:
```js
const showPrediction = useLocalStorage(
  `showPrediction-${landId}`, false
)
```

**7b. Destructure `patternKeys` from `useLandData`:**
Change line 112-117 to also destructure `patternKeys`:
```js
const {
  desert,
  patternKeys,
  dailyPatternKeys,
  dailyPatternDate,
  completedPatternKeys,
} = useLandData(defaults)
```

**7c. Pass to DigToolSection:**
Change lines 20-29 to add `v-model:showPrediction`:
```html
<DigToolSection
  v-model:showTreasureOrder="showTreasureOrder"
  v-model:hideLandIdInUrl="hideLandIdInUrl"
  v-model:showPrediction="showPrediction"
  :dig-day-sync-status="digDaySyncStatus"
  ...
/>
```

**7d. Pass to Grid:**
Change lines 33-37 to add `:show-prediction`:
```html
<Grid
  :show-treasure-order="showTreasureOrder"
  :treasure-order-map="treasureOrderMap"
  :show-land-id-in-url="!hideLandIdInUrl"
  :show-prediction="showPrediction"
/>
```

**Note:** `Grid.vue` gets `patternKeys` internally from its own `useLandData()` call (Step 4c), so the view doesn't need to pass patternKeys to Grid.

### Step 8: Edit `src/views/PracticeDigging.vue` — wire toggle (EDIT)

**8a. Add `showPrediction` ref:**
After line 228 (`showTimer`), add:
```js
const showPrediction = useLocalStorage('showPrediction-practice', false)
```

Need to import `useLocalStorage` from `@vueuse/core` if not already imported.

**8b. Add toggle button in toolbar** (in the button row, around line 31, after "Show Timer" button):

```html
<button
  class="btn btn-sm btn-outline"
  :class="showPrediction ? 'btn-info' : ''"
  @click="showPrediction = !showPrediction"
>
  {{ showPrediction ? 'Hide Prediction' : 'Prediction' }}
</button>
```

**8c. Pass to PracticeGrid:**
Change lines 135-143 to add `:show-prediction` and `:pattern-keys`:
```html
<PracticeGrid
  :key="`round-${roundCount}`"
  :tiles="displayTiles"
  :hidden-grid="hiddenGrid"
  :game-over="isGameOver"
  :loading="isStartingTodayRound"
  :show-prediction="showPrediction"
  :pattern-keys="usedFormationKeys"
  @auto-finish="finishGame"
  @dig="dig"
/>
```

### Step 9: Edit `src/constants/storageKeys.js` — add pref type (EDIT)

Change line 126 comment to include `showPrediction`:
```js
/**
 * UI preference per land.
 * @param {string} landId
 * @param {'showTreasureOrder' | 'hideLandIdInUrl' | 'showPrediction'} pref
 */
export function landUiPrefKey (landId, pref) {
  return `${pref}-${landId}`
}
```

This is cosmetic — the actual storage uses `useLocalStorage` with the same `${pref}-${landId}` pattern.

### Step 10: Documentation updates

**`docs/GRID_MECHANICS.md`** — add a new section after "Pattern detection":

```markdown
## Prediction mode

A toggleable auto-solver that computes **guaranteed treasure locations** from revealed tiles + the known formation multiset.

### How it works

1. Parses revealed state from tile classes (sand/crab/treasure + tileImage name)
2. For each formation in the active pattern multiset (patternKeys minus completedPatternKeys), computes all valid translation-only placements that don't conflict with revealed tiles
3. Backtracking search: enumerates all complete legal placements (all formations placed, all revealed treasures covered, no overlaps)
4. A tile is **guaranteed** if it's a treasure in EVERY legal solution
5. Capped at 5000 solutions / 200ms — shows "partial" badge if cap hit

### Visual

Prediction marks use a solid outline + corner badge + green tint — visually distinct from user-placed marks (which use dashed borders).

### Toggle

Off by default, persisted per-land (`showPrediction-${landId}`). Available in both live Digging and Practice views.
```

---

## 7. File Change Summary

| File | Action | Description |
|---|---|---|
| `src/utils/treasureSolver.js` | **NEW** | Pure solver function + `computeActivePatternKeys` helper |
| `src/composables/usePredictionEngine.js` | **NEW** | Reactive wrapper with `requestIdleCallback` scheduling |
| `src/styles/style.css` | **EDIT** | Add `.predicted-guaranteed` CSS after ~line 342 |
| `src/components/Grid.vue` | **EDIT** | Add `showPrediction` prop, instantiate engine, add prediction class to tile render (line 32) |
| `src/components/PracticeGrid.vue` | **EDIT** | Add `showPrediction` + `patternKeys` props, instantiate engine, add prediction class in `outerClasses` (line 348) |
| `src/components/DigToolSection.vue` | **EDIT** | Add `showPrediction` prop + emit, add toggle checkbox in "More" dropdown |
| `src/views/Digging.vue` | **EDIT** | Add `showPrediction` ref, destructure `patternKeys`, pass to Grid + DigToolSection |
| `src/views/PracticeDigging.vue` | **EDIT** | Add `showPrediction` ref, add toggle button, pass to PracticeGrid |
| `src/constants/storageKeys.js` | **EDIT** | Add `'showPrediction'` to `landUiPrefKey` pref type (cosmetic) |
| `docs/GRID_MECHANICS.md` | **EDIT** | Document prediction mode |

---

## 8. Key Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Solver too slow with 7 formations, no reveals | Cap at 5000 solutions / 200ms; `requestIdleCallback` keeps UI responsive; results are sparse early-game which is expected and acceptable |
| `patternKeys` from API might not match the actual grid (desync) | The solver uses revealed tiles as ground truth — if no solution exists, it returns empty set with `partial: true` (graceful failure, no wrong predictions) |
| Prediction marks confused with user marks | Badge + tint visual is a completely different language from dashed borders. Solid outline vs dashed, corner badge vs full-border image |
| Completed patterns not excluded | `computeActivePatternKeys` does multiset subtraction `patternKeys − completedPatternKeys` before solving |
| Name slug round-trip mismatch | `namesMatch` helper normalizes case-insensitively with underscore/space normalization. Formation names in `diggingFormations.js` are already display names |
| `requestIdleCallback` not available (older browsers) | Fallback to `setTimeout(cb, 0)` |
| Practice engine uses local engine (not cached) | `PracticeGrid.vue` instantiates its own `useGridEngine` — the prediction engine hooks into `engine.tiles` which is the same ref marks are applied to |
| Duplicate pattern keys in multiset | Solver treats each pattern key instance as separate (index-based), matching how the game places multiple of the same formation |

---

## 9. Testing Notes

**No test runner exists** in this project (per AGENTS.md: "No tests for `src/`, no ESLint, no lint script"). Verification is manual.

### Manual test scenarios

**Live Digging:**
1. Enter a land ID, toggle Prediction on in "More ⋮" menu
2. Dig some tiles in-game, refresh — predicted tiles should appear with badge+tint
3. Reveal a treasure from a multi-tile formation — sibling treasure tiles should become guaranteed
4. Reveal enough that only one formation placement is possible — all its treasure tiles should be guaranteed
5. Toggle off — marks should disappear immediately
6. Reload page — toggle state should persist (per-land localStorage)
7. Complete all patterns — no predictions should show

**Practice:**
1. Start a round, toggle Prediction on
2. Dig a treasure — sibling treasures from the same formation should be predicted
3. Start "Today's Patterns" round — should work with `usedFormationKeys`
4. Start random round — should work with random formation set
5. Give up — ghosted tiles should NOT show prediction marks (they're revealed truth, not predictions)

**Edge cases to verify:**
- No treasures revealed yet → predictions sparse or empty (cap likely hit)
- Single-tile formation (`ARTEFACT_THREE`, `PIRATE_BOUNTY`) → only guaranteed if exactly one non-excluded slot remains
- All formations placed → every solution agrees → all treasure tiles guaranteed
- Grid with 7 patterns, 1 treasure revealed → should be fast (anchor-first ordering)
- Grid with 7 single-tile patterns, 0 revealed → cap should trigger, `partial: true` badge shows

### Build verification
```bash
npm run dev          # full stack, verify both views
npm run build        # ensure no build errors
```

---

## Appendix: Existing "potential treasure" / prediction logic in codebase

There is **NO existing automated treasure-prediction engine**. Existing pieces are:

- `hint-potential-treasure` / `hint-potential-treasure2` classes — exposed in both pickers, purely cosmetic dots (`style.css:235-266`). No logic derives them.
- `near-crab` / `near-hint-crab` auto-hints (`useGridEngine.js:25-116`) — encodes the crab-proximity invariant but does NOT compute treasure intersections.
- Practice-only `collectAutoMarkers` (`PracticeGrid.vue:300-336`) — derives `hint-crab-eyes-maybe` / `hint-nothing` from revealed tiles. Single-crab proximity, not intersection.
- "Guaranteed" treasure is referenced only conceptually in `docs/GRID_MECHANICS.md:15` ("intersection of multiple known crabs is a guaranteed treasure") — **not implemented in code**.

The word `guaranteed` / `predict` appears only in `src_other/` i18n dictionaries (dead legacy, unrelated).
