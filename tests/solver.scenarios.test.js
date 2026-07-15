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
    const { guaranteed, guaranteedSlugs, guaranteedFormationKeys } = solveTreasures(tiles, ['WOODEN_COMPASS'], G)

    // Both Wood tiles (x=3,y=4 idx=43 and x=5,y=4 idx=45) must be guaranteed
    expect(guaranteed.has(43)).toBe(true)
    expect(guaranteed.has(45)).toBe(true)
    expect(guaranteedSlugs.get(43)).toBe('wood')
    expect(guaranteedSlugs.get(45)).toBe('wood')
    // NOTE: the solver includes already-revealed treasure tiles in `guaranteed`
    // (they ARE guaranteed to be treasures — the UI handles filtering for display).
    expect(guaranteed.has(44)).toBe(true)

    // Every cell of this single-instance formation is now pinned — the whole
    // pattern is guaranteed, not just individual cells.
    expect(guaranteedFormationKeys.has('WOODEN_COMPASS')).toBe(true)
  })

  it('does NOT mark the formation whole-pattern-guaranteed when only one of its cells is pinned', () => {
    // A lone Old Bottle corner reveal, with no other reveals to narrow it down,
    // leaves 4 legal 2x2 placements — only the revealed cell itself is
    // guaranteed, the other 3 remain undetermined.
    const tiles = makeTiles([
      { x: 5, y: 5, items: { 'Old Bottle': 1 } },
    ])
    const { guaranteed, guaranteedFormationKeys } = solveTreasures(tiles, ['OLD_BOTTLE'], G)

    expect(guaranteed.has(55)).toBe(true) // the revealed cell itself
    expect(guaranteed.size).toBe(1) // nothing else pinned yet
    expect(guaranteedFormationKeys.has('OLD_BOTTLE')).toBe(false)
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
    // Artefact deductions (local, per-anchor):
    //   Arte22 (SDE at H7) → 1 valid placement → guarantees G6/H6/I6/G7 as Camel Bone.
    //   Arte20 (SDE at C3) → 1 valid placement → guarantees D2 as treasure (slug ambiguous).
    //   Arte23 (SDE at I2) → 3-way tie (Arte20/22/23) → guarantees I1 as Camel Bone.
    //   G1/H1/H2 NOT guaranteed because Arte23@(1,0) is a permanently valid alternative.
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
    const { guaranteed, guaranteedSlugs, guaranteedFormationKeys } = solveTreasures(tiles, patterns, G)

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

    // CLAM_SHELLS is single-instance and fully revealed (all 4 corners dug) —
    // the whole pattern is guaranteed.
    expect(guaranteedFormationKeys.has('CLAM_SHELLS')).toBe(true)

    // HIEROGLYPH appears TWICE on this board — a duplicate shape can never be
    // whole-pattern-guaranteed (no way to know which instance a proven cell
    // belongs to), even though individual Hieroglyph cells are guaranteed above.
    expect(guaranteedFormationKeys.has('HIEROGLYPH')).toBe(false)

    // ── Artefact cascade ─────────────────────────────────────────────────────
    // Phase A of Pass 1 promotes single-candidate anchors immediately:
    //   C3=SDE → 1 candidate Arte20@(2,1) → D2='camel_bone' promoted
    //   H7=SDE → 1 candidate Arte22@(6,5) → G6/H6/I6/G7='camel_bone' promoted
    // Phase B then recomputes with those promotions:
    //   C2=CB anchor: Arte23@(1,0) expects D2=SDE, but D2='camel_bone' → blocked.
    //   Only Arte20@(2,1) survives → D2 slug unambiguous.
    // Pass 3 for Arte23: with Arte23@(1,0) blocked, only @(6,0) valid globally
    //   → G1/H1/I1/H2 guaranteed as Camel Bone.

    // arte22 bone cells
    for (const [idx, lbl] of [[56,'G6'],[57,'H6'],[58,'I6'],[66,'G7']]) {
      expect(guaranteed.has(idx), `arte22 bone ${lbl} (idx ${idx})`).toBe(true)
      expect(guaranteedSlugs.get(idx)).toBe('camel_bone')
    }

    // arte20 — D2 now unambiguously Camel Bone
    expect(guaranteed.has(13), 'arte20 D2 (idx 13) should be guaranteed').toBe(true)
    expect(guaranteedSlugs.get(13)).toBe('camel_bone')

    // arte23 cascade — all four bones guaranteed
    for (const [idx, lbl] of [[6,'G1'],[7,'H1'],[8,'I1'],[17,'H2']]) {
      expect(guaranteed.has(idx), `arte23 bone ${lbl} (idx ${idx})`).toBe(true)
      expect(guaranteedSlugs.get(idx)).toBe('camel_bone')
    }
  })

  it('artefact-only — same board, D2 slug unambiguous without other formations', () => {
    // Same grid, only the three artefact patterns.
    // Proves Phase A (single-candidate anchor promotion) fixes D2's slug ambiguity
    // even without HIEROGLYPH/COCKLE. The full arte23 cascade (G1/H1/H2) still
    // requires COCKLE because Arte23@(2,5) is a valid alternative until COCKLE
    // promotes D6='cockle_shell' and blocks it.
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
    const patterns = ['ARTEFACT_TWENTY_TWO', 'ARTEFACT_TWENTY_THREE', 'ARTEFACT_TWENTY']
    const tiles = gridArrayToTiles(grid, G)
    const { guaranteed, guaranteedSlugs } = solveTreasures(tiles, patterns, G)

    // arte22 bone cells
    for (const [idx, lbl] of [[56,'G6'],[57,'H6'],[58,'I6'],[66,'G7']]) {
      expect(guaranteed.has(idx), `arte22 bone ${lbl} (idx ${idx})`).toBe(true)
      expect(guaranteedSlugs.get(idx)).toBe('camel_bone')
    }

    // arte20 — D2 now unambiguously Camel Bone (Phase A fix)
    expect(guaranteed.has(13), 'arte20 D2 (idx 13) should be guaranteed').toBe(true)
    expect(guaranteedSlugs.get(13)).toBe('camel_bone')

    // arte23 — I1 guaranteed from I2-anchor 3-way intersection; G1/H1/H2 not guaranteed
    // (Arte23@(2,5) is still valid — COCKLE is needed to block it via D6 promotion)
    expect(guaranteed.has(8), 'arte23 I1 (idx 8) should be guaranteed').toBe(true)
    expect(guaranteedSlugs.get(8)).toBe('camel_bone')
    expect(guaranteed.has(6)).toBe(false)   // G1 — Arte23@(2,5) keeps it open
    expect(guaranteed.has(7)).toBe(false)   // H1
    expect(guaranteed.has(17)).toBe(false)  // H2
  })
})
