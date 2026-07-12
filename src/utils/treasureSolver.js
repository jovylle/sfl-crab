// treasureSolver.js — pure treasure-anchored formation solver
//
// Given the revealed tile state and the multiset of formations still in play,
// enumerate every legal translation-only placement of all formations and return
// the tiles that are treasure in EVERY legal placement (guaranteed treasures).
//
// No Vue reactivity here — this is a pure, testable module.

import { DIGGING_FORMATIONS } from '@/data/game/diggingFormations.js'

/**
 * Subtract the completed-pattern multiset from the active-pattern multiset,
 * returning the formation keys still in play (as a filtered array preserving
 * duplicates). Mirrors buildServerCompletedIndexes in patternPreview.js but
 * produces a key array instead of an index set.
 *
 * @param {string[]} patternKeys
 * @param {string[]} completedPatternKeys
 * @returns {string[]}
 */
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

// Normalize a name for case/underscore/space-insensitive comparison.
function normName(s) {
  return String(s).toLowerCase().replace(/[\s_]+/g, ' ').trim()
}

function namesMatch(revealedName, formationName) {
  return normName(revealedName) === normName(formationName)
}

/**
 * Flatten a tile's class entries into individual tokens. A revealed treasure
 * tile is stored as `['treasure actual-treasure', 'tileImage:<slug>']` — the
 * first element is ONE space-joined string, so we must split on spaces before
 * testing membership.
 *
 * @param {string[]|string} tile
 * @returns {string[]}
 */
function flattenTile(tile) {
  if (!tile) return []
  const arr = Array.isArray(tile) ? tile : [tile]
  return arr.flatMap(c => String(c).split(' '))
}

/**
 * @param {string[][]} tiles - grid cells of CSS class arrays from useGridEngine
 * @param {string[]} patternKeys - formation multiset still in play
 * @param {number} gridSize - default 10
 * @param {number} cap - max solutions to enumerate (default 5000)
 * @returns {{ guaranteed: Set<number>, partial: boolean }}
 */
export function solveTreasures(tiles, patternKeys, gridSize = 10, cap = 5000) {
  if (!patternKeys?.length) return { guaranteed: new Set(), partial: false }

  // ── Step 1: parse revealed state ────────────────────────────────────
  const revealedSand = new Set()
  const revealedCrab = new Set()
  const revealedTreasures = [] // [{ index, x, y, name }]

  const cells = tiles || []
  for (let idx = 0; idx < cells.length; idx++) {
    const tokens = flattenTile(cells[idx])
    if (!tokens.length) continue

    const isTreasure = tokens.includes('treasure') && tokens.includes('actual-treasure')
    if (isTreasure) {
      const imgTok = tokens.find(t => t.startsWith('tileImage:'))
      const slug = imgTok ? imgTok.slice('tileImage:'.length) : ''
      const name = slug.replace(/_/g, ' ')
      revealedTreasures.push({
        index: idx,
        x: idx % gridSize,
        y: Math.floor(idx / gridSize),
        name,
      })
      continue
    }
    if (tokens.includes('sand')) { revealedSand.add(idx); continue }
    if (tokens.includes('crab')) { revealedCrab.add(idx); continue }
    // otherwise: undug / hint-only — unknown, could be treasure
  }

  // ── Step 2: build candidate placements per formation instance ───────
  const instances = [] // [{ key, candidates: [{ plots: [{x,y,name,idx}] }] }]

  patternKeys.forEach(key => {
    const formation = DIGGING_FORMATIONS[key]
    if (!formation?.length) return

    const xs = formation.map(p => p.x)
    const ys = formation.map(p => p.y)
    const minFx = Math.min(...xs), maxFx = Math.max(...xs)
    const minFy = Math.min(...ys), maxFy = Math.max(...ys)

    const candidates = []
    for (let ox = -minFx; ox <= gridSize - 1 - maxFx; ox++) {
      for (let oy = -minFy; oy <= gridSize - 1 - maxFy; oy++) {
        let valid = true
        const plots = []
        for (const p of formation) {
          const x = ox + p.x
          const y = oy + p.y
          const idx = y * gridSize + x

          if (revealedSand.has(idx) || revealedCrab.has(idx)) { valid = false; break }
          const rt = revealedTreasures.find(t => t.index === idx)
          if (rt && !namesMatch(rt.name, p.name)) { valid = false; break }

          plots.push({ x, y, name: p.name, idx })
        }
        if (valid) candidates.push({ plots })
      }
    }

    instances.push({ key, candidates })
  })

  // ── Step 3: backtracking search ─────────────────────────────────────
  // Anchor-first ordering: formations whose candidates can cover a revealed
  // treasure are placed first — they have very few valid placements.
  const canAnchor = inst => inst.candidates.some(c =>
    c.plots.some(p => revealedTreasures.some(rt => rt.index === p.idx))
  )
  const sortedInstances = [...instances].sort(
    (a, b) => (canAnchor(b) ? 1 : 0) - (canAnchor(a) ? 1 : 0)
  )

  const solutions = []
  const startTime = Date.now()
  const TIME_LIMIT_MS = 200
  let partial = false

  // occupancy of already-assigned plots (idx -> true)
  const occupied = new Set()

  function backtrack(instIdx, assigned, covered) {
    if (Date.now() - startTime > TIME_LIMIT_MS || solutions.length >= cap) {
      partial = true
      return
    }

    if (instIdx >= sortedInstances.length) {
      if (revealedTreasures.every(rt => covered.has(rt.index))) {
        solutions.push(assigned.map(a => a.plots))
      }
      return
    }

    const inst = sortedInstances[instIdx]
    for (const cand of inst.candidates) {
      // overlap check
      let overlap = false
      for (const p of cand.plots) {
        if (occupied.has(p.idx)) { overlap = true; break }
      }
      if (overlap) continue

      // apply
      const newlyCovered = []
      for (const p of cand.plots) {
        occupied.add(p.idx)
        if (revealedTreasures.some(rt => rt.index === p.idx) && !covered.has(p.idx)) {
          covered.add(p.idx)
          newlyCovered.push(p.idx)
        }
      }
      assigned.push({ key: inst.key, plots: cand.plots })

      backtrack(instIdx + 1, assigned, covered)

      // undo
      assigned.pop()
      for (const p of cand.plots) occupied.delete(p.idx)
      for (const i of newlyCovered) covered.delete(i)

      if (partial && solutions.length >= cap) return
    }
  }

  backtrack(0, [], new Set())

  // ── Step 4: compute guaranteed set ──────────────────────────────────
  if (solutions.length === 0) {
    return { guaranteed: new Set(), partial: true }
  }

  const allTiles = new Set()
  for (const sol of solutions) {
    for (const plots of sol) {
      for (const p of plots) allTiles.add(p.idx)
    }
  }

  const guaranteed = new Set()
  for (const idx of allTiles) {
    const inAll = solutions.every(sol =>
      sol.some(plots => plots.some(p => p.idx === idx))
    )
    if (inAll) guaranteed.add(idx)
  }

  return { guaranteed, partial }
}
