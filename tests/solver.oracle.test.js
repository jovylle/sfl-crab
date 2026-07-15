// tests/solver.oracle.test.js
//
// Soundness oracle: generates random boards with known ground-truth treasure
// positions, runs solveTreasures, and asserts every guaranteed cell is actually
// a treasure in the generated board. This directly tests the critical invariant:
// the solver NEVER produces a false positive (a guaranteed cell that turns out
// to be sand/crab in the real world).
//
// Uses only non-seasonal formations (fixed treasure names — no seasonal-artefact
// drift when seasons change).

import { describe, it, expect } from 'vitest'
import { DIGGING_FORMATIONS } from '@/data/game/diggingFormations.js'
import { solveTreasures } from '@/utils/treasureSolver.js'

const G = 10

// ── Deterministic PRNG (xorshift32) ─────────────────────────────────────────

function makePrng(seed) {
  let s = seed >>> 0 || 1
  return () => {
    s ^= s << 13; s ^= s >>> 17; s ^= s << 5
    return (s >>> 0) / 0xFFFFFFFF
  }
}

// ── Formation helpers ────────────────────────────────────────────────────────

const STABLE_KEYS = [
  'HIEROGLYPH', 'OLD_BOTTLE', 'COCKLE', 'WOODEN_COMPASS',
  'CLAM_SHELLS', 'SEAWEED', 'SEA_CUCUMBERS',
].filter(k => Array.isArray(DIGGING_FORMATIONS[k]) && DIGGING_FORMATIONS[k].length)

const inBounds = (x, y) => x >= 0 && x < G && y >= 0 && y < G

function legalOrigins(formation) {
  const minX = Math.min(...formation.map(p => p.x))
  const maxX = Math.max(...formation.map(p => p.x))
  const minY = Math.min(...formation.map(p => p.y))
  const maxY = Math.max(...formation.map(p => p.y))
  const origins = []
  for (let oy = -minY; oy <= G - 1 - maxY; oy++) {
    for (let ox = -minX; ox <= G - 1 - maxX; ox++) {
      origins.push({ ox, oy })
    }
  }
  return origins
}

// ── Board generator ──────────────────────────────────────────────────────────
//
// Picks formations, places them at random non-overlapping positions, then
// reveals a random subset of dug tiles + surrounding crabs + distant sand.
// Returns { tiles, patternKeys, truth } where truth = Set<idx> of all treasure
// positions — the ground truth for the soundness check.

function generateBoard(rng, numFormations) {
  // Pick unique formation keys
  const keys = []
  const available = [...STABLE_KEYS]
  for (let i = 0; i < numFormations && available.length; i++) {
    const j = Math.floor(rng() * available.length)
    keys.push(available[j])
    available.splice(j, 1)
  }

  // Place each formation at a random non-overlapping legal position
  const truth = new Set()
  const truthName = new Map() // idx -> plot name
  const placements = []
  const keyToPlots = new Map() // key -> Map<idx, name> for this board's real placement

  for (const key of keys) {
    const formation = DIGGING_FORMATIONS[key]
    const origins = legalOrigins(formation).sort(() => rng() - 0.5)
    let placed = false
    for (const { ox, oy } of origins) {
      const plots = new Map()
      for (const p of formation) {
        const idx = (oy + p.y) * G + (ox + p.x)
        plots.set(idx, p.name)
      }
      if ([...plots.keys()].some(idx => truth.has(idx))) continue
      for (const [idx, name] of plots) {
        truth.add(idx)
        truthName.set(idx, name)
      }
      placements.push(plots)
      keyToPlots.set(key, plots)
      placed = true
      break
    }
    if (!placed) return null
  }

  // Cells orthogonally adjacent to truth (but not truth themselves) = crab candidates
  const adjToTreasure = new Set()
  for (const idx of truth) {
    const x = idx % G, y = Math.floor(idx / G)
    for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const nx = x+dx, ny = y+dy
      if (inBounds(nx, ny)) {
        const nIdx = ny*G+nx
        if (!truth.has(nIdx)) adjToTreasure.add(nIdx)
      }
    }
  }

  // Build the tiles array
  const rawTiles = Array.from({ length: G*G }, () => [])

  // Randomly reveal some treasure tiles (~45% each)
  for (const [idx, name] of truthName) {
    if (rng() < 0.45) {
      const slug = name.toLowerCase().replace(/\s+/g, '_')
      rawTiles[idx] = ['treasure actual-treasure', `tileImage:${slug}`]
    }
  }

  // Place crabs on ~40% of adjacent cells (game rule: crabs surround treasures)
  for (const idx of adjToTreasure) {
    if (rng() < 0.4) rawTiles[idx] = ['crab', 'tileImage:crab']
  }

  // Place sand on ~8% of safe cells (NOT adjacent to any treasure — preserves
  // the game invariant that sand is never orthogonally next to a treasure plot)
  for (let idx = 0; idx < G*G; idx++) {
    if (truth.has(idx) || adjToTreasure.has(idx)) continue
    if (rawTiles[idx].length === 0 && rng() < 0.08) {
      rawTiles[idx] = ['sand', 'tileImage:sand']
    }
  }

  return { tiles: rawTiles, patternKeys: keys, truth, truthName, keyToPlots }
}

// ── Tests ────────────────────────────────────────────────────────────────────

function runSoundnessCheck(seeds, numFormations) {
  const failures = []
  const formationFailures = []
  let skipped = 0

  for (const seed of seeds) {
    const rng = makePrng(seed)
    const board = generateBoard(rng, numFormations)
    if (!board) { skipped++; continue }

    const { guaranteed, guaranteedSlugs, guaranteedFormationKeys } = solveTreasures(board.tiles, board.patternKeys, G)

    for (const idx of guaranteed) {
      if (!board.truth.has(idx)) {
        failures.push({
          seed,
          idx,
          label: String.fromCharCode(65 + (idx % G)) + (Math.floor(idx / G) + 1),
          patternKeys: board.patternKeys,
        })
      }
    }

    // Pattern-level soundness: every key the solver claims is
    // whole-pattern-guaranteed must have EVERY cell of its real (ground-truth)
    // placement already in `guaranteed`, with a matching name where the solver
    // reports one. This generator only ever picks unique keys, so `keyToPlots`
    // unambiguously identifies "this formation's real placement".
    for (const key of guaranteedFormationKeys) {
      const plots = board.keyToPlots.get(key)
      for (const [idx, name] of plots) {
        const label = String.fromCharCode(65 + (idx % G)) + (Math.floor(idx / G) + 1)
        if (!guaranteed.has(idx)) {
          formationFailures.push({ seed, key, idx, label, reason: 'cell not in guaranteed' })
          continue
        }
        const guessedName = guaranteedSlugs.get(idx)
        const expectedSlug = name.toLowerCase().replace(/\s+/g, '_')
        if (guessedName && guessedName !== expectedSlug) {
          formationFailures.push({ seed, key, idx, label, reason: `named "${guessedName}", expected "${expectedSlug}"` })
        }
      }
    }
  }

  return { failures, formationFailures, skipped }
}

function expectNoFailures({ failures, formationFailures }) {
  if (failures.length) {
    const msg = failures.slice(0, 5).map(f =>
      `seed=${f.seed} cell=${f.label} patterns=${f.patternKeys.join(',')}`
    ).join('\n')
    expect.fail(`${failures.length} false positive(s):\n${msg}`)
  }
  if (formationFailures.length) {
    const msg = formationFailures.slice(0, 5).map(f =>
      `seed=${f.seed} key=${f.key} cell=${f.label} — ${f.reason}`
    ).join('\n')
    expect.fail(`${formationFailures.length} guaranteedFormationKeys false positive(s):\n${msg}`)
  }
}

describe('Soundness oracle — every guaranteed cell must be a real treasure', () => {
  it('no false positives across 300 random 1-formation boards', () => {
    const seeds = Array.from({ length: 300 }, (_, i) => i + 1)
    expectNoFailures(runSoundnessCheck(seeds, 1))
  })

  it('no false positives across 200 random 2-formation boards', () => {
    const seeds = Array.from({ length: 200 }, (_, i) => i + 1001)
    expectNoFailures(runSoundnessCheck(seeds, 2))
  })

  it('no false positives across 100 random 3-formation boards', () => {
    const seeds = Array.from({ length: 100 }, (_, i) => i + 2001)
    expectNoFailures(runSoundnessCheck(seeds, 3))
  })
})
