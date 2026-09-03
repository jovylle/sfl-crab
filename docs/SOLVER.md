# Treasure Solver — algorithm, improvement log, testing

`src/utils/treasureSolver.js` is the deduction engine behind digging predictions.
`scripts/debug-solver.js` + `src/views/SolverDebug.vue` (`/solver-debug`) are its harnesses.

## The one invariant

**Soundness: every cell in `guaranteed` is provably a treasure. No false positives.**
The solver is intentionally conservative — a cell absent from `guaranteed` means
nothing either way. Already-revealed treasures are included in `guaranteed`
(the UI filters them for display). Every change below was held to this invariant
via the oracle (see Testing).

## How it works (passes, in order, looped to fixpoint)

- **Pre-commit** — fully-revealed `completedPatterns` instances are pinned
  (cells locked, pattern count consumed) before deduction starts.
- **Pass 1** — anchor intersection: for each revealed treasure, enumerate legal
  placements covering it; cells common to all survive.
- **Pass 2** — single-instance forcing: a formation with one remaining instance
  and confined reveals collapses to its only covering placement.
- **Pass 3** — full-board single survivor: with no confined reveal, a formation
  with exactly one legal placement anywhere is confirmed.
- **Pass 4** — crab forcing: an unsatisfied crab with exactly one open
  (non-sand-adjacent) neighbour guarantees that cell.
- **Pass 4b** — crab-neighbour coverability forcing (2026-09-03, see log).
- **Pass 5** — exact search: disputed names are resolved by backtracking search
  over remaining instances; a name survives only if a full consistent assignment
  exists. Enforces crab-satisfaction at leaf nodes (2026-09-03, see log).

Pseudo-reveals (proven cells with proven names) feed the next iteration, so
confirmations cascade (e.g. G10 → OLD_BOTTLE pinned → G9).

## Improvement log

### 1. Completed-pattern pre-commit (G8 artefact21) — 2026-09-03
- **Board:** farm `4485248732423974`
  (`https://d1g.uk/4485248732423974/digging`). `FOURTEEN` completed at C4/C6,
  `TWENTY_ONE` (Camel Bone) at G8 unconfirmed; I8/G9/H9 stayed unknown.
- **Root cause:** `Grid.vue` passed the full pattern multiset, so the completed
  `FOURTEEN` stayed a spurious competitor and G8 kept two candidates.
- **Fix:** `completedPatternKeys` plumbed through `useLandData` →
  `usePredictionEngine` → `solveTreasures`, which pre-commits fully-revealed
  completed placements (lock cells, consume count). G8 became the sole
  `TWENTY_ONE` candidate → I8/G9/H9 guaranteed Camel Bone (17 → 20 cells).
  Same wiring applied to `TodayPatterns.vue` so the strip checkmark agrees
  with the grid.
- **Commits:** `27d27e6`, `c902f5e`.

### 2. Crab-satisfaction in Pass 5 exact search (G6 Sea Cucumber) — 2026-09-03
- **Board:** farm `3863900154075909`. Crab at I6, G6 stuck at `?`.
- **Root cause:** G6 was proven treasure but its name was split between Sea
  Cucumber and Pipi, and the tiebreaker search ignored crab adjacency — so the
  G6=Pipi world survived even though it strands the I6 crab with no adjacent
  treasure.
- **Fix:** Pass 5 leaf check now requires every revealed crab to border a real
  treasure (`floatsOk() && crabsOk()`). Sound: the true board always satisfies
  every crab. Result: G6 Sea Cucumber, H6 Pipi.
- **Commit:** `01c70a5`.

### 3. Crab-neighbour coverability forcing, Pass 4b (G9/G10 Old Bottle) — 2026-09-03
- **Board:** same farm. Crab at H10; neighbours G10/I10/H9 all open, yet only
  Old Bottle can reach any of them (every other shape is pinned elsewhere).
- **Fix:** filter Pass-4 candidates by coverability (any legal placement of any
  remaining formation covering the cell). A singleton viable neighbour must be
  treasure. If exactly one live placement covers it, confirm that whole
  instance (commit + consume + plots); otherwise mark the cell guaranteed
  nameless (display-only, feeds crab-satisfaction, creates zero constraints).
- **Why "never a bare name":** the first version named the cell, creating a
  pseudo-reveal without consuming an instance. Phase A re-confirmed it
  (no-consume pseudo rule), committing cells that excluded the true placement
  from Pass 3's enumeration — leaving a false sole survivor. The full-day
  oracle caught it on seeds 4225/5049 before ship.
- **Result:** H10 forces G10, OLD_BOTTLE confirmed, G9 cascades (all Old Bottle).
- **Commit:** `505ec87`.

## Testing

| Layer | File | What it guards |
|---|---|---|
| Soundness oracle | `tests/solver.oracle.test.js` | Ground-truth boards (random, duplicate-key, 300 full-day 8-pattern, completed-pattern); every `guaranteed` cell must be real treasure. Deterministic seeds — failures reproduce. |
| Scenarios | `tests/solver.scenarios.test.js` | One hand-crafted board per algorithm path (G8 pre-commit pair, G6 crab, H10 coverability, duplicate slots, crab chains). Non-seasonal formations only. |
| Transform contract | `tests/gridTileTransform.test.js` | String format between `gridArrayToTiles` and `treasureSolver`. |
| Browser E2E | `tests/e2e/solver-debug.spec.js` | Real Chromium drives `/solver-debug`, asserts zero FAILs. Catches component-wiring bugs unit tests can't see. |

```bash
npm test          # unit: 91 tests, ~1s — run before pushing any solver change
npm run test:e2e  # vite build + Playwright (needs: npm install --include=dev; npx playwright install chromium)
node scripts/debug-solver.js --file scripts/fixtures/<land>.json        # single live board
node scripts/debug-solver.js --diff <earlier>.json <later>.json         # false-positive oracle on real digs
```

Solver drill flags (env, silent by default, for live-board investigations):

```bash
SFL_SOLVER_TRACE=1 node scripts/debug-solver.js --file ...  # logs 4b forcings, instance confirms, Pass 5 resolutions
SFL_DISABLE_4B=1 ...                                        # bisection kill-switch for Pass 4b
```

## Known gaps (honest)

- The oracle checks **soundness, not completeness**: a refactor that makes the
  solver timid (missing deductions) fails no test. The G8/G6/H10 scenario tests
  are the backstop — don't delete them.
- The generator uses **non-seasonal formations only**; seasonal-artefact months
  get less oracle coverage.
- `scripts/fixtures/` holds real player data and is gitignored.

## File map

- `src/utils/treasureSolver.js` — the engine (all passes + pre-commit).
- `src/composables/useLandData.js` — exports `activePatternKeys` / `completedPatternKeys`.
- `src/composables/usePredictionEngine.js`, `src/components/Grid.vue`,
  `src/components/TodayPatterns.vue` — the two solver call-sites (grid + strip).
- `src/views/SolverDebug.vue`, `src/dev/solverScenarios.js` — harness + scenario
  catalogue (also feeds E2E).
- `scripts/debug-solver.js`, `scripts/lib/resolve-alias-loader.mjs` — CLI harness.
