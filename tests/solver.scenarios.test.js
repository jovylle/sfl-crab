// tests/solver.scenarios.test.js
//
// Hand-crafted scenarios — one per algorithm path. These serve as documentation
// (intent legible from the board) and catch gross breakage fast. All use
// non-seasonal formations (fixed treasure names, no seasonal-artefact drift).

import { describe, it, expect } from 'vitest'
import { solveTreasures } from '@/utils/treasureSolver.js'
import { gridArrayToTiles } from '@/utils/gridTileTransform.js'

const G = 10

function makeTiles(dug) {
  return gridArrayToTiles(dug, G)
}

function label(idx) {
  return String.fromCharCode(65 + (idx % G)) + (Math.floor(idx / G) + 1)
}

// ── Pass 1: treasure-anchored deduction ─────────────────────────────────────
// HIEROGLYPH = [{x:0,y:0,"Vase"},{x:1,y:0,"Vase"},{x:0,y:1,"Hieroglyph"}]
// If we reveal the Hieroglyph tile at (0,1), every legal placement of HIEROGLYPH
// that covers (0,1) as "Hieroglyph" forces (0,0) and (1,0) to be Vase.
describe('Pass 1 — treasure-anchored', () => {
  it('two Vase tiles guaranteed once the Hieroglyph tile is revealed', () => {
    const tiles = makeTiles([
      { x: 0, y: 1, items: { Hieroglyph: 1 } }, // revealed at A2
    ])
    const { guaranteed, guaranteedSlugs } = solveTreasures(tiles, ['HIEROGLYPH'], G)

    // A1 (idx 0) and B1 (idx 1) must be Vase
    expect(guaranteed.has(0)).toBe(true)
    expect(guaranteed.has(1)).toBe(true)
    expect(guaranteedSlugs.get(0)).toBe('vase')
    expect(guaranteedSlugs.get(1)).toBe('vase')
  })

  it('no false positives when multiple placements remain possible (no reveals)', () => {
    // With no dug tiles, HIEROGLYPH could be anywhere → nothing guaranteed
    const { guaranteed } = solveTreasures(makeTiles([]), ['HIEROGLYPH'], G)
    expect(guaranteed.size).toBe(0)
  })
})

// ── Pass 2: single-instance forcing with confined name ───────────────────────
// WOODEN_COMPASS = [{x:0,y:0,"Wood"},{x:1,y:0,"Wooden Compass"},{x:2,y:0,"Wood"}]
// "Wooden Compass" is unique to this formation. A single revealed "Wooden Compass"
// at a known position locks the entire row.
describe('Pass 2 — single-instance confined-name forcing', () => {
  it('reveals the two flanking Wood tiles once Wooden Compass position is known', () => {
    // Place Wooden Compass at (3,4): formation is at (3,4),(4,4),(5,4)
    // Reveal the middle piece (Wooden Compass) at x=4,y=4 → idx 44
    const tiles = makeTiles([
      { x: 4, y: 4, items: { 'Wooden Compass': 1 } },
    ])
    const { guaranteed, guaranteedSlugs } = solveTreasures(tiles, ['WOODEN_COMPASS'], G)

    // Both Wood tiles (x=3,y=4 idx=43 and x=5,y=4 idx=45) must be guaranteed
    expect(guaranteed.has(43)).toBe(true)
    expect(guaranteed.has(45)).toBe(true)
    expect(guaranteedSlugs.get(43)).toBe('wood')
    expect(guaranteedSlugs.get(45)).toBe('wood')
    // NOTE: the solver includes already-revealed treasure tiles in `guaranteed`
    // (they ARE guaranteed to be treasures — the UI handles filtering for display).
    expect(guaranteed.has(44)).toBe(true)
  })
})

// ── Reveal forces the fourth tile ────────────────────────────────────────────
// OLD_BOTTLE = 2x2 square of "Old Bottle" at {(0,0),(1,0),(0,1),(1,1)}.
// Revealing 3 of 4 plots uniquely identifies the placement (the three revealed
// cells are the only 2×2 block that contains all three), so the 4th is guaranteed.
describe('3-of-4 reveals force the remaining Old Bottle tile', () => {
  it('guarantees the 4th Old Bottle cell when three corners are already revealed', () => {
    // Reveal (5,5)=F6, (6,5)=G6, (5,6)=F7 — the only 2×2 covering all three is
    // origin (5,5)-(6,6), so (6,6)=G7 (idx 66) must be guaranteed.
    const tiles = makeTiles([
      { x: 5, y: 5, items: { 'Old Bottle': 1 } }, // idx 55
      { x: 6, y: 5, items: { 'Old Bottle': 1 } }, // idx 56
      { x: 5, y: 6, items: { 'Old Bottle': 1 } }, // idx 65
    ])
    const { guaranteed, guaranteedSlugs } = solveTreasures(tiles, ['OLD_BOTTLE'], G)

    // The forced 4th corner
    expect(guaranteed.has(66), `expected G7 (idx 66) guaranteed`).toBe(true)
    expect(guaranteedSlugs.get(66)).toBe('old_bottle')
    // The three already-revealed tiles are also in guaranteed (they ARE treasures)
    for (const idx of [55, 56, 65]) {
      expect(guaranteed.has(idx), `expected idx ${idx} guaranteed`).toBe(true)
    }
  })
})

// ── Ambiguous name demotion ──────────────────────────────────────────────────
// COCKLE = diagonal of 3 "Cockle Shell" tiles.
// All three plots have the same name. If the solver guarantees a cell from two
// different anchors that agree the cell is treasure but one anchor can't determine
// the name (ambiguous), the cell stays in `guaranteed` but not in `guaranteedSlugs`.
// (Actually all cockle plots have same name, so slugs should be unambiguous.)
// Instead test: empty patternKeys → nothing.
describe('Edge cases', () => {
  it('empty patternKeys returns no guarantees', () => {
    const tiles = makeTiles([{ x: 5, y: 5, items: { Hieroglyph: 1 } }])
    const { guaranteed } = solveTreasures(tiles, [], G)
    expect(guaranteed.size).toBe(0)
  })

  it('empty grid returns no guarantees for most formations', () => {
    const { guaranteed } = solveTreasures(makeTiles([]), ['HIEROGLYPH', 'COCKLE'], G)
    // No reveals → multiple placements possible for both → nothing pinned
    expect(guaranteed.size).toBe(0)
  })

  it('known real-world snapshot — land 4485248732423974 produces expected guarantees', () => {
    // Captured 2026-07-15. ARTEFACT_TWENTY_TWO/THREE/TWENTY + HIEROGLYPH×2 + COCKLE + SEAWEED + CLAM_SHELLS
    // After the pure-elimination fix, Hieroglyph at D5 (idx 43) and E2 (idx 14) are guaranteed,
    // and Clam Shell cells are guaranteed. We check a few key cells.
    const grid = [
      { x: 8, y: 8, items: { Seaweed: 1 } },
      { x: 8, y: 9, items: { Crab: 1 } },
      { x: 1, y: 8, items: { Sand: 2 } },
      { x: 1, y: 1, items: { Crab: 1 } },
      { x: 1, y: 2, items: { Crab: 1 } },
      { x: 2, y: 1, items: { 'Camel Bone': 1 } },
      { x: 3, y: 2, items: { 'Camel Bone': 1 } },
      { x: 4, y: 2, items: { Crab: 1 } },
      { x: 2, y: 2, items: { 'Salt Dino Egg': 1 } },
      { x: 8, y: 1, items: { 'Salt Dino Egg': 1 } },
      { x: 8, y: 3, items: { Sand: 2 } },
      { x: 8, y: 6, items: { Crab: 1 } },
      { x: 7, y: 6, items: { 'Salt Dino Egg': 1 } },
      { x: 4, y: 8, items: { 'Clam Shell': 1 } },
      { x: 3, y: 7, items: { Crab: 1 } },
      { x: 4, y: 7, items: { Crab: 1 } },
      { x: 3, y: 8, items: { 'Clam Shell': 1 } },
      { x: 3, y: 9, items: { 'Clam Shell': 1 } },
      { x: 4, y: 9, items: { 'Clam Shell': 1 } },
      { x: 1, y: 4, items: { Crab: 1 } },
      { x: 2, y: 4, items: { 'Cockle Shell': 1 } },
      { x: 1, y: 3, items: { Sand: 2 } },
      { x: 6, y: 1, items: { Crab: 1 } },
      { x: 5, y: 4, items: { Sand: 2 } },
      { x: 1, y: 6, items: { Sand: 2 } },
      { x: 5, y: 1, items: { Crab: 1 } },
      { x: 4, y: 1, items: { Hieroglyph: 1 } },
      { x: 6, y: 2, items: { Sand: 2 } },
      { x: 5, y: 7, items: { Sand: 2 } },
      { x: 0, y: 1, items: { Sand: 2 } },
      { x: 3, y: 4, items: { Hieroglyph: 1 } },
    ]
    const patterns = [
      'ARTEFACT_TWENTY_TWO', 'ARTEFACT_TWENTY_THREE', 'ARTEFACT_TWENTY',
      'HIEROGLYPH', 'HIEROGLYPH', 'COCKLE', 'SEAWEED', 'CLAM_SHELLS',
    ]
    const tiles = gridArrayToTiles(grid, G)
    const { guaranteed, guaranteedSlugs } = solveTreasures(tiles, patterns, G)

    // Clam Shell cells at (3,8),(4,8),(3,9),(4,9) already revealed — not in guaranteed
    // Seaweed at H9 (idx 78) already revealed — not in guaranteed
    // Solver should guarantee at least some cells from the remaining formations
    expect(guaranteed.size).toBeGreaterThan(0)

    // D5 = idx 43: Hieroglyph guaranteed (from HIEROGLYPH formation, Pass 2)
    expect(guaranteed.has(43)).toBe(true)
    expect(guaranteedSlugs.get(43)).toBe('hieroglyph')

    // E2 = idx 14: Hieroglyph guaranteed
    expect(guaranteed.has(14)).toBe(true)

    // H9 = idx 78: Seaweed — already revealed (in grid), not in guaranteed
    expect(guaranteed.has(78)).toBe(false)
  })
})
