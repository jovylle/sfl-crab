// tests/solver.scenarios.test.js
//
// Hand-crafted scenarios — one per algorithm path. These serve as documentation
// (intent legible from the board) and catch gross breakage fast. All use
// non-seasonal formations (fixed treasure names, no seasonal-artefact drift).

import { describe, it, expect } from 'vitest'
import { solveTreasures } from '@/utils/treasureSolver.js'
import { gridArrayToTiles } from '@/utils/gridTileTransform.js'
import { buildGuaranteedIndexes } from '@/utils/patternPreview.js'
import { DIGGING_FORMATIONS } from '@/data/game/diggingFormations.js'
import { getCurrentSeasonalArtefact } from '@/data/game/seasonalArtefacts.js'

const G = 10

function makeTiles(dug) {
  return gridArrayToTiles(dug, G)
}

function label(idx) {
  return String.fromCharCode(65 + (idx % G)) + (Math.floor(idx / G) + 1)
}

const SLUG_ABBR = {
  camel_bone: 'CB', cockle_shell: 'CK',
  clam_shell: 'CS', vase: 'V', hieroglyph: 'H', seaweed: 'SW',
  wooden_compass: 'WC', wood: 'WD', old_bottle: 'OB',
}

// The seasonal artefact's name/slug rotate every season (see
// seasonalArtefacts.js). The artefact boards below reference it by name so
// this suite stays green across season changes instead of hardcoding one
// season's artefact (which breaks the moment CURRENT_SEASONAL_ARTEFACT moves).
const SEASONAL = getCurrentSeasonalArtefact()
const SEASONAL_SLUG = SEASONAL.toLowerCase().replace(/\s+/g, '_')
SLUG_ABBR[SEASONAL_SLUG] = 'ART'

function renderFormation(key) {
  const plots = DIGGING_FORMATIONS[key]
  if (!Array.isArray(plots) || !plots.length) return [`(${key} unknown)`]
  const xs = plots.map(p => p.x), ys = plots.map(p => p.y)
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
  const rows = []
  for (let y = minY; y <= maxY; y++) {
    const cells = []
    for (let x = minX; x <= maxX; x++) {
      const p = plots.find(q => q.x === x && q.y === y)
      const slug = p ? p.name.toLowerCase().replace(/\s+/g, '_') : null
      cells.push((slug ? (SLUG_ABBR[slug] ?? slug.slice(0, 3).toUpperCase()) : '.').padEnd(4))
    }
    rows.push(cells.join(''))
  }
  return rows
}

function printSolverResult(tiles, guaranteed, guaranteedSlugs, patternKeys, G = 10) {
  const cols = 'ABCDEFGHIJ'.slice(0, G)
  const boardLines = ['     ' + [...cols].map(c => c.padEnd(6)).join('')]
  for (let row = 0; row < G; row++) {
    const cells = []
    for (let col = 0; col < G; col++) {
      const idx = row * G + col
      const tokens = [].concat(tiles[idx] || []).flatMap(t => t.split(' '))
      let cell
      if (tokens.includes('sand')) cell = 'S'
      else if (tokens.includes('crab')) cell = 'C'
      else if (tokens.includes('actual-treasure')) {
        const img = tokens.find(t => t.startsWith('tileImage:'))
        const slug = img ? img.slice('tileImage:'.length) : '?'
        cell = SLUG_ABBR[slug] ?? slug.slice(0, 4).toUpperCase()
      } else if (guaranteed.has(idx)) {
        const slug = guaranteedSlugs.get(idx)
        cell = '[' + (slug ? (SLUG_ABBR[slug] ?? slug.slice(0, 4).toUpperCase()) : '?') + ']'
      } else cell = '.'
      cells.push(cell.padEnd(6))
    }
    boardLines.push(`${String(row + 1).padStart(2)}   ${cells.join('')}`)
  }

  const panelLines = ['PATTERNS:']
  const seen = new Set()
  for (const key of patternKeys) {
    if (seen.has(key)) continue
    seen.add(key)
    const count = patternKeys.filter(k => k === key).length
    panelLines.push(`${key}${count > 1 ? ` ×${count}` : ''}`)
    renderFormation(key).forEach(l => panelLines.push('  ' + l))
    panelLines.push('')
  }

  const W = boardLines[0].length
  const total = Math.max(boardLines.length, panelLines.length)
  const out = []
  for (let i = 0; i < total; i++) {
    const left = (boardLines[i] ?? '').padEnd(W)
    const right = panelLines[i] ?? ''
    out.push(`${left}  │  ${right}`)
  }
  console.log('\n' + out.join('\n') + '\n')
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
    const { guaranteed, guaranteedSlugs, guaranteedFormationCounts } = solveTreasures(tiles, ['WOODEN_COMPASS'], G)

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
    expect(guaranteedFormationCounts.has('WOODEN_COMPASS')).toBe(true)
  })

  it('does NOT mark the formation whole-pattern-guaranteed when only one of its cells is pinned', () => {
    // A lone Old Bottle corner reveal, with no other reveals to narrow it down,
    // leaves 4 legal 2x2 placements — only the revealed cell itself is
    // guaranteed, the other 3 remain undetermined.
    const tiles = makeTiles([
      { x: 5, y: 5, items: { 'Old Bottle': 1 } },
    ])
    const { guaranteed, guaranteedFormationCounts } = solveTreasures(tiles, ['OLD_BOTTLE'], G)

    expect(guaranteed.has(55)).toBe(true) // the revealed cell itself
    expect(guaranteed.size).toBe(1) // nothing else pinned yet
    expect(guaranteedFormationCounts.has('OLD_BOTTLE')).toBe(false)
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
      { x: 2, y: 2, items: { [SEASONAL]: 1 } },
      { x: 8, y: 1, items: { [SEASONAL]: 1 } },
      { x: 8, y: 3, items: { Sand: 2 } },
      { x: 8, y: 6, items: { Crab: 1 } },
      { x: 7, y: 6, items: { [SEASONAL]: 1 } },
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
    const { guaranteed, guaranteedSlugs, guaranteedFormationCounts } = solveTreasures(tiles, patterns, G)
    printSolverResult(tiles, guaranteed, guaranteedSlugs, patterns, G)

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
    expect(guaranteedFormationCounts.get('CLAM_SHELLS')).toBe(1)

    // HIEROGLYPH appears TWICE on this board, and BOTH instances are
    // individually pinned by Pass 1's per-anchor reasoning: the Hieroglyph
    // dug at E2 (idx 14) forces its Vase cells at E1/F1, and the Hieroglyph
    // dug at D5 (idx 43) forces its Vase cells at D4/E4 — two distinct,
    // non-overlapping placements, so both instances are known and the count
    // is 2 (not gated to "all-or-nothing" — see buildGuaranteedIndexes, which
    // checkmarks exactly as many of the key's thumbnails as instances proven).
    expect(guaranteedFormationCounts.get('HIEROGLYPH')).toBe(2)

    // COCKLE and SEAWEED are single-instance and fully pinned — guaranteed.
    expect(guaranteedFormationCounts.get('COCKLE')).toBe(1)
    expect(guaranteedFormationCounts.get('SEAWEED')).toBe(1)

    // ARTEFACT_TWENTY_TWO/_THREE/_TWENTY are each single-instance shapes whose
    // one true placement is pinned by Pass 1's per-anchor reasoning (shared
    // "Camel Bone" name across all three prevents the full-board fallback from
    // narrowing to one candidate on its own) — confirmedInstances should
    // still catch them.
    expect(guaranteedFormationCounts.get('ARTEFACT_TWENTY_TWO')).toBe(1)
    expect(guaranteedFormationCounts.get('ARTEFACT_TWENTY_THREE')).toBe(1)
    expect(guaranteedFormationCounts.get('ARTEFACT_TWENTY')).toBe(1)

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

  it('known real-world snapshot — land 1405000790165644 partially confirms one of two HIEROGLYPH instances', () => {
    // Captured 2026-07-16. Same 8-key pattern list as the 4485248732423974
    // snapshot above, but a different dig layout: only ONE Hieroglyph is dug
    // (at H4, idx 37), pinning its Vase cells at H3 (idx 27, guaranteed) and
    // I3 (idx 28, already dug) — the OTHER Hieroglyph instance has no reveals
    // anywhere near it and stays completely unknown. Confirms the N-of-M
    // behavior end-to-end: guaranteedFormationCounts.get('HIEROGLYPH') is 1,
    // not 2, and buildGuaranteedIndexes flags exactly one of the two
    // HIEROGLYPH thumbnails (not both, not neither).
    const grid = [
      { x: 8, y: 7, items: { Crab: 1 } },
      { x: 2, y: 8, items: { 'Camel Bone': 1 } },
      { x: 1, y: 7, items: { Crab: 1 } },
      { x: 3, y: 7, items: { Seaweed: 1 } },
      { x: 1, y: 9, items: { 'Camel Bone': 1 } },
      { x: 4, y: 8, items: { Starfish: 1 } },
      { x: 7, y: 1, items: { Crab: 1 } },
      { x: 1, y: 2, items: { 'Cockle Shell': 1 } },
      { x: 3, y: 4, items: { Crab: 1 } },
      { x: 0, y: 8, items: { Crab: 1 } },
      { x: 8, y: 2, items: { Vase: 1 } },
      { x: 7, y: 3, items: { Hieroglyph: 1 } },
      { x: 7, y: 8, items: { [SEASONAL]: 1 } },
      { x: 3, y: 1, items: { Sand: 1 } },
      { x: 4, y: 3, items: { Sand: 1 } },
      { x: 2, y: 5, items: { 'Clam Shell': 1 } },
      { x: 8, y: 5, items: { Sand: 1 } },
      { x: 1, y: 4, items: { 'Clam Shell': 1 } },
      { x: 5, y: 5, items: { Sand: 1 } },
      { x: 5, y: 1, items: { 'Camel Bone': 1 } },
    ]
    const patterns = [
      'ARTEFACT_TWENTY_TWO', 'ARTEFACT_TWENTY_THREE', 'ARTEFACT_TWENTY',
      'HIEROGLYPH', 'HIEROGLYPH', 'COCKLE', 'SEAWEED', 'CLAM_SHELLS',
    ]
    const tiles = gridArrayToTiles(grid, G)
    const { guaranteed, guaranteedSlugs, guaranteedFormationCounts } = solveTreasures(tiles, patterns, G)

    // H3 = idx 27: the Vase cell forced by the single dug Hieroglyph at H4 (idx 37)
    expect(guaranteed.has(27)).toBe(true)
    expect(guaranteedSlugs.get(27)).toBe('vase')

    // Only ONE Hieroglyph instance is pinned — the other has no reveals to anchor on.
    expect(guaranteedFormationCounts.get('HIEROGLYPH')).toBe(1)

    // buildGuaranteedIndexes should flag exactly one of the two HIEROGLYPH
    // thumbnails (indexes 3 and 4 in `patterns`), not both.
    const guaranteedIndexes = buildGuaranteedIndexes(patterns, guaranteedFormationCounts)
    const hieroglyphFlagged = [3, 4].filter(i => guaranteedIndexes.has(i))
    expect(hieroglyphFlagged.length).toBe(1)

    // Regression guard: ARTEFACT_TWENTY has only ONE instance on this board.
    // Once ARTE_22 (B10) and ARTE_23 (H9) are consumed by Pass 1's
    // instance-consumption cascade, re-examining their now-pseudo-revealed
    // cells (e.g. F8/G8/H8/G9, all Camel Bone) as fresh Pass 1 anchors could
    // spuriously "explain" them via a wrong, overlapping ARTEFACT_TWENTY
    // candidate — since ARTEFACT_TWENTY's real placement is confined to
    // (5,1)-(6,2), NOT (5,7)-(6,8). Without committedCellOrigin's
    // short-circuit (a cell that already has a known confirmed-instance
    // origin is never re-searched for an alternate explanation), this
    // wrongly guarantees F9 (idx 85) as "salt dino egg" and inflates the
    // count to 3.
    expect(guaranteedFormationCounts.get('ARTEFACT_TWENTY')).toBe(1)
    expect(guaranteed.has(85), 'F9 (idx 85) must NOT be a false positive').toBe(false)
  })

  it('artefact-only — same board, D2 slug unambiguous without other formations', () => {
    // Same grid, only the three artefact patterns.
    // Phase A commits ARTE_20 via C3's SDE (1 candidate) → D2 pseudo-revealed as CB,
    // blocking Arte23@(1,0) for C2. Then I2's SDE uniquely forces ARTE_23@(6,0)
    // (ARTE_20 consumed, ARTE_22 OOB), so G1/H1/I1/H2 are also guaranteed.
    const grid = [
      { x: 8, y: 8, items: { Seaweed: 1 } },
      { x: 8, y: 9, items: { Crab: 1 } },
      { x: 1, y: 8, items: { Sand: 2 } },
      { x: 1, y: 1, items: { Crab: 1 } },
      { x: 1, y: 2, items: { Crab: 1 } },
      { x: 2, y: 1, items: { 'Camel Bone': 1 } },
      { x: 3, y: 2, items: { 'Camel Bone': 1 } },
      { x: 4, y: 2, items: { Crab: 1 } },
      { x: 2, y: 2, items: { [SEASONAL]: 1 } },
      { x: 8, y: 1, items: { [SEASONAL]: 1 } },
      { x: 8, y: 3, items: { Sand: 2 } },
      { x: 8, y: 6, items: { Crab: 1 } },
      { x: 7, y: 6, items: { [SEASONAL]: 1 } },
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

    // arte23 — I2's SDE uniquely forces ARTE_23@(6,0); all four CB bones guaranteed
    for (const [idx, lbl] of [[6,'G1'],[7,'H1'],[8,'I1'],[17,'H2']]) {
      expect(guaranteed.has(idx), `arte23 bone ${lbl} (idx ${idx})`).toBe(true)
      expect(guaranteedSlugs.get(idx)).toBe('camel_bone')
    }
  })

  it('regression — double-consumption bug: BOTH anchors of one HIEROGLYPH dug must not starve the other instance (land 3321133018291793)', () => {
    // Root-caused against real land 3321133018291793: two HIEROGLYPH instances
    // on the board. Instance A has BOTH its Vase AND its Hieroglyph tile dug
    // (idx 31 and idx 40, processed in that ascending order by the Map
    // iteration in Pass 1's Phase A). Instance B has only its Hieroglyph tile
    // dug (idx 85), at a HIGHER index than instance A's cells — so instance
    // A's second anchor (idx 40) gets re-examined by Phase A (via
    // committedCellOrigin) BEFORE instance B's single anchor is ever reached.
    //
    // Bug (pre-fix): Phase A decremented remainingCount on every real-dug
    // anchor whose computeCandidates returned exactly one candidate — with no
    // check for whether that candidate was a NEW instance or a re-confirmation
    // of one already recorded. idx 31 confirms instance A and decrements
    // remainingCount 2→1 (correct — first confirmation). idx 40 re-confirms
    // the SAME instance A (already committed via idx 31) but the old code
    // still decremented again, 1→0 (WRONG — a single real instance consumed
    // two slots). By the time idx 85 (instance B) is reached, remainingCount
    // is already 0, so computeCandidates skips HIEROGLYPH entirely and
    // instance B's Vase cells (75, 76) are never guaranteed — reproducing the
    // exact Vase+Hieroglyph miss the user reported.
    //
    // Fix: recordConfirmedInstance now tracks instances by placement
    // signature and only the FIRST confirmation of a given signature consumes
    // a remainingCount slot (see isNewInstance in treasureSolver.js).
    const grid = [
      { x: 1, y: 3, items: { Vase: 1 } },       // idx 31
      { x: 0, y: 4, items: { Hieroglyph: 1 } }, // idx 40 — same instance as idx 31
      { x: 2, y: 3, items: { Crab: 1 } },       // idx 32 — blocks the ambiguous alt placement for idx 31
      { x: 5, y: 8, items: { Hieroglyph: 1 } }, // idx 85 — instance B's ONLY reveal
    ]
    const patterns = ['HIEROGLYPH', 'HIEROGLYPH']
    const tiles = gridArrayToTiles(grid, G)
    const { guaranteed, guaranteedFormationCounts } = solveTreasures(tiles, patterns, G)

    // Instance A: fully pinned regardless of the bug (both its own anchors are dug).
    expect(guaranteed.has(30), 'instance A Vase (idx 30)').toBe(true)

    // Instance B: only discoverable once the double-consumption bug is fixed.
    expect(guaranteed.has(75), 'instance B Vase (idx 75) — starved by the bug pre-fix').toBe(true)
    expect(guaranteed.has(76), 'instance B Vase (idx 76) — starved by the bug pre-fix').toBe(true)

    // Both instances individually confirmed → count is 2, not 1.
    expect(guaranteedFormationCounts.get('HIEROGLYPH')).toBe(2)
  })

  it('regression — stale confined-reveal anchors must not block the remaining SEAWEED instance (grid ref F6, land 7242422682754425)', () => {
    // Root-caused against real land 7242422682754425: two SEAWEED instances on
    // the board. Instance A is fully confirmed via its Starfish reveal at
    // (7,6) — anchoring pins Seaweed at (5,5),(6,5),(7,5) [idx 55,56,57] and
    // the Starfish itself [idx 76], all recorded in committedCellOrigin.
    // Instance B has its own, separate Seaweed reveal at (9,0) [idx 9] — far
    // enough from instance A that only a corner placement anchored there is
    // geometrically legal.
    //
    // Bug (pre-fix): enumerateSingleInstanceSurvivors('SEAWEED') filtered
    // confined reveals by name-confinement only, so it still included
    // instance A's already-committed cells (55,56,57,76) alongside instance
    // B's reveal (9). No single SEAWEED placement can cover both instances'
    // cells at once, so the anchor search returned ZERO survivors —
    // silently failing to confirm instance B or force its remaining tiles,
    // even though a legal placement for it obviously exists.
    //
    // Fix: exclude any confined reveal already claimed via committedCellOrigin
    // before anchoring, so the search for instance B's placement is anchored
    // on idx 9 alone.
    const grid = [
      { x: 7, y: 6, items: { Starfish: 1 } }, // idx 76 — instance A anchor (fully confirms A)
      { x: 9, y: 0, items: { Seaweed: 1 } },  // idx 9 — instance B's only reveal
    ]
    const patterns = ['SEAWEED', 'SEAWEED']
    const tiles = gridArrayToTiles(grid, G)
    const { guaranteed, guaranteedFormationCounts } = solveTreasures(tiles, patterns, G)

    // Instance A: pinned regardless of the bug (single Starfish anchor).
    expect(guaranteed.has(55), 'instance A Seaweed (idx 55)').toBe(true)
    expect(guaranteed.has(56), 'instance A Seaweed (idx 56)').toBe(true)
    expect(guaranteed.has(57), 'instance A Seaweed (idx 57)').toBe(true)

    // Instance B: only discoverable once the stale-anchor bug is fixed —
    // the sole legal placement covering idx 9 also forces idx 7 and idx 8
    // (Seaweed) and idx 19 (Starfish).
    expect(guaranteed.has(7), 'instance B Seaweed (idx 7) — blocked by the bug pre-fix').toBe(true)
    expect(guaranteed.has(8), 'instance B Seaweed (idx 8) — blocked by the bug pre-fix').toBe(true)
    expect(guaranteed.has(19), 'instance B Starfish (idx 19) — blocked by the bug pre-fix').toBe(true)

    // Both instances individually confirmed → count is 2, not 1.
    expect(guaranteedFormationCounts.get('SEAWEED')).toBe(2)
  })

  it('regression — Phase B confirmations must consume remainingCount (land 4485248732423974, 2026-07-27 snapshot)', () => {
    // ARTEFACT_EIGHTEEN, ARTEFACT_SIXTEEN, and ARTEFACT_TWENTY are all present
    // (one each) and all share the same two plot names (seasonal artefact +
    // Camel Bone), so none of them ever has a name "confined" to it alone —
    // Pass 2/3 can't touch any of them. Each gets pinned to its true placement
    // purely by Pass 1: H3=artefact → Arte16@(7,2) is Phase B's only surviving
    // candidate (H3/I3/I4 all match); E4=artefact → Arte18@(4,3) is Phase B's
    // only surviving candidate (E4/F4/E5/F5 all match). Phase B recorded both
    // as confirmed instances but — pre-fix — never decremented remainingCount
    // for them, so A9's own candidate search kept treating the ALREADY-CONFIRMED
    // Arte16/Arte18 as live competing hypotheses forever, alongside the true
    // Arte20@(0,7) explanation, and never isolated a single candidate to pin
    // A8/B8 as Camel Bone. Fixed by decrementing remainingCount in Phase B too
    // (mirroring Phase A), the same way Phase A already does.
    const grid = [
      { x: 8, y: 8, items: { Sand: 2 } },
      { x: 1, y: 8, items: { 'Camel Bone': 1 } },
      { x: 0, y: 8, items: { [SEASONAL]: 1 } },
      { x: 1, y: 1, items: { Crab: 1 } },
      { x: 1, y: 2, items: { 'Cockle Shell': 1 } },
      { x: 0, y: 1, items: { 'Cockle Shell': 1 } },
      { x: 8, y: 1, items: { Crab: 1 } },
      { x: 8, y: 2, items: { 'Camel Bone': 1 } },
      { x: 7, y: 2, items: { [SEASONAL]: 1 } },
      { x: 5, y: 8, items: { Crab: 1 } },
      { x: 5, y: 7, items: { Vase: 1 } },
      { x: 3, y: 1, items: { Sand: 2 } },
      { x: 1, y: 5, items: { Sand: 2 } },
      { x: 8, y: 5, items: { Sand: 2 } },
      { x: 5, y: 5, items: { 'Clam Shell': 1 } },
      { x: 4, y: 4, items: { 'Camel Bone': 1 } },
      { x: 3, y: 4, items: { Crab: 1 } },
      { x: 3, y: 3, items: { Crab: 1 } },
      { x: 4, y: 3, items: { [SEASONAL]: 1 } },
      { x: 6, y: 6, items: { Crab: 1 } },
      { x: 5, y: 6, items: { 'Clam Shell': 1 } },
      { x: 4, y: 6, items: { 'Clam Shell': 1 } },
      { x: 4, y: 5, items: { 'Clam Shell': 1 } },
      { x: 4, y: 8, items: { Hieroglyph: 1 } },
      { x: 6, y: 1, items: { Crab: 1 } },
      { x: 5, y: 1, items: { Hieroglyph: 1 } },
    ]
    const patterns = [
      'ARTEFACT_EIGHTEEN', 'ARTEFACT_SIXTEEN', 'ARTEFACT_TWENTY',
      'HIEROGLYPH', 'HIEROGLYPH', 'COCKLE', 'SEA_CUCUMBERS', 'CLAM_SHELLS',
    ]
    const tiles = gridArrayToTiles(grid, G)
    const { guaranteed, guaranteedSlugs, guaranteedFormationCounts } = solveTreasures(tiles, patterns, G)
    printSolverResult(tiles, guaranteed, guaranteedSlugs, patterns, G)

    // A8 = idx 70, B8 = idx 71: the Camel Bone cells of ARTEFACT_TWENTY's sole
    // placement, anchored below A9's revealed Salt Dino Egg (the seasonal
    // artefact this season).
    expect(guaranteed.has(70), 'A8 (idx 70) — blocked by the bug pre-fix').toBe(true)
    expect(guaranteedSlugs.get(70)).toBe('camel_bone')
    expect(guaranteed.has(71), 'B8 (idx 71) — blocked by the bug pre-fix').toBe(true)
    expect(guaranteedSlugs.get(71)).toBe('camel_bone')

    // All three single-instance artefact formations individually confirmed.
    expect(guaranteedFormationCounts.get('ARTEFACT_EIGHTEEN')).toBe(1)
    expect(guaranteedFormationCounts.get('ARTEFACT_SIXTEEN')).toBe(1)
    expect(guaranteedFormationCounts.get('ARTEFACT_TWENTY')).toBe(1)
  })

  it('regression — Pass 2/3 confirmations must ALSO consume remainingCount, and a confirmed instance must override a stale ambiguous mark (land 4485248732423974, 2026-08-01 snapshot)', () => {
    // ARTEFACT_SEVENTEEN, ARTEFACT_FIFTEEN, and ARTEFACT_EIGHTEEN all share
    // both plot names (seasonal artefact + Camel Bone), so — like the
    // 2026-07-27 snapshot above — none of them is ever `confinedTo` by the
    // static, name-only definition (all three own both names). Ground truth
    // (verified independently by brute-force enumeration of every globally
    // consistent placement) fully pins all three instances. Two distinct bugs
    // pre-fix:
    //
    //  1. Pass 2/3 never consumed remainingCount on confirmation (only Phase
    //     A/B did — mirroring the 07-27 fix, just one pass deeper). Once
    //     ARTEFACT_EIGHTEEN is pinned via Pass 1 Phase A/B intersection at C2
    //     (idx 12, cells {2,3,12,13} vs {1,2,11,12} both touch idx 2/12) and
    //     later via Pass 2's dynamic-confinement anchor (idx 11 and idx 12
    //     are BOTH exclusively explainable by EIGHTEEN once SEVENTEEN is
    //     consumed), Pass 2 confirmed it but left remainingCount at 1 — so
    //     ARTEFACT_FIFTEEN's own SDE anchor at H9 (idx 87) kept seeing a
    //     phantom competing EIGHTEEN candidate forever, and G9 (idx 86) was
    //     never guaranteed at all.
    //
    //  2. Even after fixing (1), C1 (idx 2) stayed marked ambiguous forever:
    //     Phase B's very first intersection of idx 12's two THEN-still-live
    //     candidates (EIGHTEEN@{2,3,12,13} predicting idx 2 = the seasonal
    //     artefact, vs the eventual-true EIGHTEEN@{1,2,11,12} predicting
    //     idx 2 = Camel Bone) disagreed on idx 2's name and flagged it
    //     ambiguous — and `recordName`'s ambiguousIdx set is a one-way
    //     ratchet, so Pass 2's later, fully-authoritative single-survivor
    //     confirmation of idx 2 = Camel Bone was silently dropped.
    const grid = [
      { x: 8, y: 8, items: { 'Camel Bone': 1 } },
      { x: 7, y: 8, items: { [SEASONAL]: 1 } },
      { x: 1, y: 8, items: { Crab: 1 } },
      { x: 2, y: 8, items: { 'Cockle Shell': 1 } },
      { x: 3, y: 9, items: { 'Cockle Shell': 1 } },
      { x: 1, y: 1, items: { 'Camel Bone': 1 } },
      { x: 2, y: 1, items: { 'Camel Bone': 1 } },
      { x: 1, y: 0, items: { [SEASONAL]: 1 } },
      { x: 8, y: 1, items: { Sand: 2 } },
      { x: 5, y: 1, items: { Sand: 2 } },
      { x: 8, y: 4, items: { Crab: 1 } },
      { x: 7, y: 4, items: { Crab: 1 } },
      { x: 8, y: 5, items: { 'Camel Bone': 1 } },
      { x: 7, y: 5, items: { 'Cockle Shell': 1 } },
      { x: 9, y: 6, items: { [SEASONAL]: 1 } },
      { x: 1, y: 3, items: { Crab: 1 } },
      { x: 1, y: 4, items: { Sand: 2 } },
      { x: 2, y: 3, items: { Wood: 1 } },
      { x: 3, y: 3, items: { 'Wooden Compass': 1 } },
      { x: 4, y: 7, items: { Sand: 2 } },
      { x: 5, y: 5, items: { Crab: 1 } },
      { x: 4, y: 5, items: { Hieroglyph: 1 } },
    ]
    const patterns = [
      'ARTEFACT_SEVENTEEN', 'ARTEFACT_FIFTEEN', 'ARTEFACT_EIGHTEEN',
      'HIEROGLYPH', 'COCKLE', 'COCKLE', 'WOODEN_COMPASS',
    ]
    const tiles = gridArrayToTiles(grid, G)
    const { guaranteed, guaranteedSlugs, guaranteedFormationCounts } = solveTreasures(tiles, patterns, G)
    printSolverResult(tiles, guaranteed, guaranteedSlugs, patterns, G)

    // C1 (idx 2): ARTEFACT_EIGHTEEN's forced Camel Bone cell — must be
    // unambiguous, not just guaranteed-with-unknown-name.
    expect(guaranteed.has(2), 'C1 (idx 2) — blocked/ambiguous by the bug pre-fix').toBe(true)
    expect(guaranteedSlugs.get(2)).toBe('camel_bone')

    // G9 (idx 86): ARTEFACT_FIFTEEN's forced Camel Bone cell, anchored below
    // H9's revealed Salt Dino Egg — never guaranteed at all pre-fix.
    expect(guaranteed.has(86), 'G9 (idx 86) — never guaranteed by the bug pre-fix').toBe(true)
    expect(guaranteedSlugs.get(86)).toBe('camel_bone')

    // J6 (idx 59): ARTEFACT_SEVENTEEN's forced Camel Bone cell (unaffected by
    // either bug, included as a sanity anchor).
    expect(guaranteed.has(59)).toBe(true)
    expect(guaranteedSlugs.get(59)).toBe('camel_bone')

    // All three single-instance artefact formations individually confirmed,
    // plus the other single-instance shapes on this board.
    expect(guaranteedFormationCounts.get('ARTEFACT_SEVENTEEN')).toBe(1)
    expect(guaranteedFormationCounts.get('ARTEFACT_FIFTEEN')).toBe(1)
    expect(guaranteedFormationCounts.get('ARTEFACT_EIGHTEEN')).toBe(1)
    expect(guaranteedFormationCounts.get('HIEROGLYPH')).toBe(1)
    expect(guaranteedFormationCounts.get('COCKLE')).toBe(1)
    expect(guaranteedFormationCounts.get('WOODEN_COMPASS')).toBe(1)
  })
})

// ── Instance-consumption cascade — land 1405000790165644 ─────────────────────
// B10=CB uniquely locks ARTE_22 to (1,8); H9=SDE uniquely locks ARTE_23 to
// (5,7); both consumed → ARTE_20 is the only remaining formation that can
// cover F2=CB, locking it to (5,1) → F3=SDE and G2/G3=CB guaranteed.
describe('Instance-consumption cascade — land 1405000790165644', () => {
  const grid = [
    { x: 8, y: 7, items: { Crab: 1 } },
    { x: 2, y: 8, items: { 'Camel Bone': 1 } },
    { x: 1, y: 7, items: { Crab: 1 } },
    { x: 3, y: 7, items: { Seaweed: 1 } },
    { x: 1, y: 9, items: { 'Camel Bone': 1 } },
    { x: 4, y: 8, items: { Starfish: 1 } },
    { x: 7, y: 1, items: { Crab: 1 } },
    { x: 1, y: 2, items: { 'Cockle Shell': 1 } },
    { x: 3, y: 4, items: { Crab: 1 } },
    { x: 0, y: 8, items: { Crab: 1 } },
    { x: 8, y: 2, items: { Vase: 1 } },
    { x: 7, y: 3, items: { Hieroglyph: 1 } },
    { x: 7, y: 8, items: { [SEASONAL]: 1 } },
    { x: 3, y: 1, items: { Sand: 1 } },
    { x: 4, y: 3, items: { Sand: 1 } },
    { x: 2, y: 5, items: { 'Clam Shell': 1 } },
    { x: 8, y: 5, items: { Sand: 1 } },
    { x: 1, y: 4, items: { 'Clam Shell': 1 } },
    { x: 5, y: 5, items: { Sand: 1 } },
    { x: 5, y: 1, items: { 'Camel Bone': 1 } },
  ]
  const patterns = [
    'ARTEFACT_TWENTY_TWO', 'ARTEFACT_TWENTY_THREE', 'ARTEFACT_TWENTY',
    'HIEROGLYPH', 'HIEROGLYPH', 'COCKLE', 'SEAWEED', 'CLAM_SHELLS',
  ]

  it('prints the board', () => {
    const tiles = gridArrayToTiles(grid, G)
    const { guaranteed, guaranteedSlugs } = solveTreasures(tiles, patterns, G)
    printSolverResult(tiles, guaranteed, guaranteedSlugs, patterns, G)
  })

  it('ARTE_22 locked to (1,8) by B10: guarantees B9/D9/C10', () => {
    const tiles = gridArrayToTiles(grid, G)
    const { guaranteed, guaranteedSlugs } = solveTreasures(tiles, patterns, G)
    // B9=(1,8) idx 81, D9=(3,8) idx 83, C10=(2,9) idx 92
    expect(guaranteed.has(81), 'B9 camel_bone').toBe(true)
    expect(guaranteedSlugs.get(81)).toBe('camel_bone')
    expect(guaranteed.has(83), 'D9 camel_bone').toBe(true)
    expect(guaranteedSlugs.get(83)).toBe('camel_bone')
    expect(guaranteed.has(92), 'C10 salt_dino_egg').toBe(true)
    expect(guaranteedSlugs.get(92)).toBe(SEASONAL_SLUG)
  })

  it('ARTE_23 locked to (5,7) by H9: guarantees F8/G8/H8/G9', () => {
    const tiles = gridArrayToTiles(grid, G)
    const { guaranteed, guaranteedSlugs } = solveTreasures(tiles, patterns, G)
    // F8=(5,7) idx 75, G8=(6,7) idx 76, H8=(7,7) idx 77, G9=(6,8) idx 86
    for (const [idx, lbl] of [[75,'F8'],[76,'G8'],[77,'H8'],[86,'G9']]) {
      expect(guaranteed.has(idx), `${lbl} camel_bone`).toBe(true)
      expect(guaranteedSlugs.get(idx)).toBe('camel_bone')
    }
  })

  it('ARTE_20 locked to (5,1) by F2 after arte22+arte23 consumed: F3=SDE, G2/G3=CB', () => {
    const tiles = gridArrayToTiles(grid, G)
    const { guaranteed, guaranteedSlugs } = solveTreasures(tiles, patterns, G)
    // F3=(5,2) idx 25 = SDE, G2=(6,1) idx 16 = CB, G3=(6,2) idx 26 = CB
    expect(guaranteed.has(25), 'F3 salt_dino_egg').toBe(true)
    expect(guaranteedSlugs.get(25)).toBe(SEASONAL_SLUG)
    expect(guaranteed.has(16), 'G2 camel_bone').toBe(true)
    expect(guaranteedSlugs.get(16)).toBe('camel_bone')
    expect(guaranteed.has(26), 'G3 camel_bone').toBe(true)
    expect(guaranteedSlugs.get(26)).toBe('camel_bone')
  })
})

describe('Pass 4 — crab-satisfaction forcing', () => {
  it('forces the only open neighbour when all others are sand', () => {
    // Crab at F6 (idx 55), sand at E6/G6/F5 — only F7 (idx 65) open
    const tiles = makeTiles([
      { x: 5, y: 5, items: { Crab: 1 } },
      { x: 4, y: 5, items: { Sand: 1 } },
      { x: 6, y: 5, items: { Sand: 1 } },
      { x: 5, y: 4, items: { Sand: 1 } },
    ])
    const { guaranteed } = solveTreasures(tiles, ['COCKLE'], G)
    expect(guaranteed.has(65), 'F7 (idx 65) must be forced').toBe(true)
  })

  it('does not force when crab has two open candidates', () => {
    // Crab at F6 (idx 55), sand at E6/G6 — F5 and F7 both open
    const tiles = makeTiles([
      { x: 5, y: 5, items: { Crab: 1 } },
      { x: 4, y: 5, items: { Sand: 1 } },
      { x: 6, y: 5, items: { Sand: 1 } },
    ])
    const { guaranteed } = solveTreasures(tiles, ['COCKLE'], G)
    expect(guaranteed.has(45), 'F5 must NOT be forced').toBe(false)
    expect(guaranteed.has(65), 'F7 must NOT be forced').toBe(false)
  })

  it('does not force when crab is already satisfied by an adjacent known treasure', () => {
    const tiles = makeTiles([
      { x: 5, y: 5, items: { Crab: 1 } },
      { x: 5, y: 6, items: { 'Cockle Shell': 1 } },
    ])
    const { guaranteed } = solveTreasures(tiles, ['COCKLE'], G)
    // guaranteed may include idx 56 (the revealed treasure) but nothing forced by crab
    expect(guaranteed.has(45), 'F5 must NOT be forced (crab satisfied)').toBe(false)
    expect(guaranteed.has(55), 'F6 crab cell itself not in guaranteed').toBe(false)
  })

  it('4b: forces the only coverable neighbour and confirms its unique placement', () => {
    // Live replica 3863900154075909 (H10 crab): F9/F10 revealed Old Bottle,
    // crab at H10 (idx 97). Neighbours G10 (96), I10 (98), H9 (87) are all
    // open, but sands at J9/I8 block every distant placement reaching I10/H9
    // (as on the live board) while only OLD_BOTTLE@(5,8) covers G10 — so G10
    // is forced and the whole OLD_BOTTLE instance (incl. G9 idx 86) is
    // confirmed Old Bottle.
    const tiles = makeTiles([
      { x: 5, y: 8, items: { 'Old Bottle': 1 } },
      { x: 5, y: 9, items: { 'Old Bottle': 1 } },
      { x: 7, y: 9, items: { Crab: 1 } },
      { x: 9, y: 8, items: { Sand: 1 } },
      { x: 8, y: 7, items: { Sand: 1 } },
    ])
    const { guaranteed, guaranteedSlugs } = solveTreasures(tiles, ['OLD_BOTTLE', 'CLAM_SHELLS'], G)
    expect(guaranteed.has(96), 'G10 (idx 96) must be forced').toBe(true)
    expect(guaranteedSlugs.get(96)).toBe('old_bottle')
    expect(guaranteed.has(86), 'G9 (idx 86) cascades via confirmed OLD_BOTTLE').toBe(true)
    expect(guaranteedSlugs.get(86)).toBe('old_bottle')
    expect(guaranteed.has(98), 'I10 (idx 98) must NOT be forced').toBe(false)
    expect(guaranteed.has(87), 'H9 (idx 87) must NOT be forced').toBe(false)
  })

  it('cascade: forcing one crab satisfies another which then forces further', () => {
    // Two crabs in a chain:
    // Crab at (3,3) idx 33: sand at (2,3),(3,2),(4,3) → only (3,4) idx 43 open
    // Crab at (3,5) idx 53: sand at (2,5),(4,5),(3,6) → only (3,4) open too
    // Once (3,4) is guaranteed by first crab, second crab is satisfied
    const tiles = makeTiles([
      { x: 3, y: 3, items: { Crab: 1 } },
      { x: 2, y: 3, items: { Sand: 1 } },
      { x: 3, y: 2, items: { Sand: 1 } },
      { x: 4, y: 3, items: { Sand: 1 } },
      { x: 3, y: 5, items: { Crab: 1 } },
      { x: 2, y: 5, items: { Sand: 1 } },
      { x: 4, y: 5, items: { Sand: 1 } },
      { x: 3, y: 6, items: { Sand: 1 } },
    ])
    const { guaranteed } = solveTreasures(tiles, ['COCKLE', 'SEAWEED'], G)
    expect(guaranteed.has(43), 'D5 (idx 43) must be forced by first crab').toBe(true)
  })
})

// ── Guaranteed-but-ambiguous reporting (guaranteedCandidates) ─────────────────
// A cell can be provably a treasure while its exact NAME stays underdetermined:
// distinct legal placements that all cover it disagree on what it's called.
// The solver reports the disputed identities (for the UI's "?" tooltip) without
// ever guessing. Regression: the live land 4485248732423974 case — C4/D5 are
// revealed (Camel Bone / Otter Pebble), and three artefact formations all have
// a legal placement through C4-D4, disagreeing on D4.
describe('guaranteedCandidates — disputed-name reporting', () => {
  it('D4 is guaranteed but reports the two names still in dispute', () => {
    // C4 (idx 32) = Camel Bone, D5 (idx 43) = Otter Pebble. Crabs at B4 and C3
    // kill every OTHER placement that could explain C4 (the FIFTEEN/TWENTY_FOUR
    // line-origins through B4, TWENTY_FOUR's C3 variant), leaving exactly three
    // legal explanations of the C4-D4-D5 cluster:
    //   FIFTEEN @ (2,3):     C4=CB, D4=OP, E4=CB
    //   TWENTY_FOUR @ (2,3): C4=CB, D4=OP, E4=CB, C5=CB, E5=CB
    //   SEVENTEEN @ (2,3):   C4=CB, D4=CB, D5=OP
    // All three cover D4, but name it differently → guaranteed + ambiguous.
    const tiles = makeTiles([
      { x: 2, y: 3, items: { 'Camel Bone': 1 } },   // C4 (idx 32)
      { x: 3, y: 4, items: { 'Otter Pebble': 1 } }, // D5 (idx 43)
      { x: 1, y: 3, items: { Crab: 1 } },           // B4 (idx 31)
      { x: 2, y: 2, items: { Crab: 1 } },           // C3 (idx 22)
    ])
    const { guaranteed, guaranteedSlugs, guaranteedCandidates } = solveTreasures(
      tiles, ['ARTEFACT_FIFTEEN', 'ARTEFACT_TWENTY_FOUR', 'ARTEFACT_SEVENTEEN'], G,
    )

    // The unambiguous cells keep their names…
    expect(guaranteedSlugs.get(32), 'C4 — all candidates agree Camel Bone').toBe('camel_bone')
    expect(guaranteedSlugs.get(43), 'D5 — all candidates agree Otter Pebble').toBe('otter_pebble')

    // …and D4 is guaranteed, nameless, with both disputed identities reported.
    expect(guaranteed.has(33), 'D4 guaranteed treasure').toBe(true)
    expect(guaranteedSlugs.has(33), 'D4 not in guaranteedSlugs').toBe(false)
    const candidates = guaranteedCandidates.get(33) || []
    expect([...candidates].sort()).toEqual(['camel bone', 'otter pebble'])

    // Named cells must NOT appear in the candidates map (no stale ambiguity).
    expect(guaranteedCandidates.has(32)).toBe(false)
    expect(guaranteedCandidates.has(43)).toBe(false)
  })

  it('global consistency resolves D4 = Camel Bone (live land 4485248732423974 case)', () => {
    // Same C4/D5/B4/C3 cluster as the ambiguous mini-board above, PLUS the
    // third artefact cluster G9=Otter Pebble + H9=Camel Bone. Now the name is
    // provable GLOBALLY, even though the local passes still see two legal
    // explanations for D4:
    //   - D4=Otter Pebble would force FIFTEEN(2,3) or TWENTY_FOUR(2,3) at
    //     C4-D4-E4; the remaining shapes then cannot cover BOTH the D5 reveal
    //     AND the G9/H9 cluster without overlapping or running out of
    //     formations (each artefact occurs exactly once).
    //   - D4=Camel Bone is satisfied by SEVENTEEN(2,3) (C4-D4-D5) with
    //     FIFTEEN(6,1) at G2-H2-I2 and TWENTY_FOUR(5,8) at F9-G9-H9-F10-H10.
    // So only the Camel Bone name survives a full-consistency check.
    const tiles = makeTiles([
      { x: 2, y: 3, items: { 'Camel Bone': 1 } },   // C4 (idx 32)
      { x: 3, y: 4, items: { 'Otter Pebble': 1 } }, // D5 (idx 43)
      { x: 1, y: 3, items: { Crab: 1 } },           // B4 (idx 31)
      { x: 2, y: 2, items: { Crab: 1 } },           // C3 (idx 22)
      { x: 6, y: 8, items: { 'Otter Pebble': 1 } }, // G9 (idx 86)
      { x: 7, y: 8, items: { 'Camel Bone': 1 } },   // H9 (idx 87)
    ])
    const { guaranteedSlugs, guaranteedCandidates, guaranteedFormationCounts } = solveTreasures(
      tiles, ['ARTEFACT_FIFTEEN', 'ARTEFACT_TWENTY_FOUR', 'ARTEFACT_SEVENTEEN'], G,
    )

    expect(guaranteedSlugs.get(33), 'D4 — provably Camel Bone via global consistency').toBe('camel_bone')
    expect(guaranteedCandidates.has(33), 'D4 no longer disputed').toBe(false)
    // The resolved name propagates: SEVENTEEN becomes whole-pattern-guaranteed.
    expect(guaranteedFormationCounts.get('ARTEFACT_SEVENTEEN')).toBe(1)
  })

  it('confirmed instances clear the candidate report (stale ambiguity overridden)', () => {
    // Same board as the 2026-08-01 regression: once a cell is pinned to a
    // specific instance, its name is ground truth and any earlier dispute must
    // vanish from the report.
    const tiles = makeTiles([
      { x: 8, y: 8, items: { 'Camel Bone': 1 } },
      { x: 7, y: 8, items: { [SEASONAL]: 1 } },
      { x: 1, y: 8, items: { Crab: 1 } },
      { x: 2, y: 8, items: { 'Cockle Shell': 1 } },
      { x: 3, y: 9, items: { 'Cockle Shell': 1 } },
      { x: 1, y: 1, items: { 'Camel Bone': 1 } },
      { x: 2, y: 1, items: { 'Camel Bone': 1 } },
      { x: 1, y: 0, items: { [SEASONAL]: 1 } },
      { x: 8, y: 1, items: { Sand: 2 } },
      { x: 5, y: 1, items: { Sand: 2 } },
      { x: 8, y: 4, items: { Crab: 1 } },
      { x: 7, y: 4, items: { Crab: 1 } },
      { x: 8, y: 5, items: { 'Camel Bone': 1 } },
      { x: 7, y: 5, items: { 'Cockle Shell': 1 } },
      { x: 9, y: 6, items: { [SEASONAL]: 1 } },
      { x: 1, y: 3, items: { Crab: 1 } },
      { x: 1, y: 4, items: { Sand: 2 } },
      { x: 2, y: 3, items: { Wood: 1 } },
      { x: 3, y: 3, items: { 'Wooden Compass': 1 } },
      { x: 4, y: 7, items: { Sand: 2 } },
      { x: 5, y: 5, items: { Crab: 1 } },
      { x: 4, y: 5, items: { Hieroglyph: 1 } },
    ])
    const patterns = [
      'ARTEFACT_SEVENTEEN', 'ARTEFACT_FIFTEEN', 'ARTEFACT_EIGHTEEN',
      'HIEROGLYPH', 'COCKLE', 'COCKLE', 'WOODEN_COMPASS',
    ]
    const tilesArr = tiles
    const { guaranteed, guaranteedSlugs, guaranteedCandidates } = solveTreasures(tilesArr, patterns, G)
    expect(guaranteed.has(2), 'C1 (idx 2)').toBe(true)
    expect(guaranteedSlugs.get(2)).toBe('camel_bone')
    // Confirmed instance ⇒ name is ground truth ⇒ nothing disputed to report.
    expect(guaranteedCandidates.has(2), 'C1 candidates cleared after confirmation').toBe(false)
    expect(guaranteedCandidates.has(86), 'G9 candidates cleared after confirmation').toBe(false)
  })
})

import { SOLVER_SCENARIOS } from '@/dev/solverScenarios.js'
import { SOLVER_SCENARIOS_MECHANICS } from '@/dev/solverScenariosMechanics.js'
import { SOLVER_SCENARIOS_OVERLAP } from '@/dev/solverScenariosOverlap.js'
import { SOLVER_SCENARIOS_FULLDAY } from '@/dev/solverScenariosFullDay.js'

const ALL_SCENARIOS = [
  ...SOLVER_SCENARIOS,
  ...SOLVER_SCENARIOS_MECHANICS,
  ...SOLVER_SCENARIOS_OVERLAP,
  ...SOLVER_SCENARIOS_FULLDAY,
]

describe('SOLVER_SCENARIOS auto-generated regression suite', () => {
  for (const s of ALL_SCENARIOS) {
    if (!s.assertions || s.assertions.length === 0) continue
    it(s.name, () => {
      const tiles = gridArrayToTiles(s.grid, G)
      const { guaranteed, guaranteedSlugs } = solveTreasures(tiles, s.patterns, G, s.completed)
      for (const a of s.assertions) {
        if (a.property === 'guaranteed')
          expect(guaranteed.has(a.idx), a.label).toBe(a.expected)
        else if (a.property === 'slug')
          expect(guaranteedSlugs.get(a.idx), a.label).toBe(a.expected)
      }
    })
  }
})

describe('Layer 3 — remaining-instance reporting', () => {
  it('reports the one unconfirmed COCKLE and its exact survivor region', () => {
    // Duplicate COCKLEs: instance A pinned to the corner (cells 0,11,22), the
    // other's diagonal can still be (3,3),(4,4),(5,5) — union {33,44,55,66,77}.
    const tiles = makeTiles([
      { x: 0, y: 0, items: { 'Cockle Shell': 1 } },
      { x: 5, y: 5, items: { 'Cockle Shell': 1 } },
    ])
    const { remainingCounts, remainingRegions, possibleTreasureCells } = solveTreasures(tiles, ['COCKLE', 'COCKLE'], G)

    expect(remainingCounts.get('COCKLE')).toBe(1)
    expect(remainingCounts.size).toBe(1)
    const region = remainingRegions.get('COCKLE')
    expect([...region].sort((a, b) => a - b)).toEqual([33, 44, 55, 66, 77])
    // The confirmed instance A cells (0,11,22) are NOT part of the remaining region.
    for (const idx of [0, 11, 22]) expect(region.has(idx)).toBe(false)
    expect(possibleTreasureCells.size).toBe(region.size)
  })

  it('reports nothing remaining when every instance is proven', () => {
    // ONE fully confirmed at (0,3)-(0,5); THREE confirmed at (7,7). Layer 1
    // keeps THREE's single-tile placement from being stolen by ONE's cells.
    const tiles = makeTiles([
      { x: 0, y: 3, items: { [SEASONAL]: 1 } },
      { x: 0, y: 4, items: { 'Camel Bone': 1 } },
      { x: 0, y: 5, items: { 'Camel Bone': 1 } },
      { x: 7, y: 7, items: { [SEASONAL]: 1 } },
    ])
    const { remainingCounts, possibleTreasureCells } = solveTreasures(tiles, ['ARTEFACT_ONE', 'ARTEFACT_THREE'], G)

    expect(remainingCounts.size).toBe(0)
    expect(possibleTreasureCells.size).toBe(0)
  })

  it('bounds the unfound OLD_BOTTLE to the 9 cells of its four candidate placements', () => {
    // M15 board: HIEROGLYPH / COCKLE / WOODEN_COMPASS all confirmed, OLD_BOTTLE
    // still 4-way around the single (4,4) reveal. Survivor union = 9 cells.
    const tiles = makeTiles([
      { x: 1, y: 2, items: { Hieroglyph: 1 } },
      { x: 4, y: 4, items: { 'Old Bottle': 1 } },
      { x: 6, y: 0, items: { 'Cockle Shell': 1 } },
      { x: 0, y: 6, items: { Wood: 1 } },
      { x: 1, y: 6, items: { 'Wooden Compass': 1 } },
    ])
    const { remainingCounts, remainingRegions } = solveTreasures(
      tiles, ['HIEROGLYPH', 'OLD_BOTTLE', 'COCKLE', 'WOODEN_COMPASS'], G,
    )

    expect(remainingCounts.size).toBe(1)
    expect(remainingCounts.get('OLD_BOTTLE')).toBe(1)
    const region = remainingRegions.get('OLD_BOTTLE')
    expect([...region].sort((a, b) => a - b)).toEqual([33, 34, 35, 43, 44, 45, 53, 54, 55])
  })

  it('reports both instances of an unpinned duplicate formation (full-board region)', () => {
    // M16 board: two COCKLEs, nothing confirmed. Region = union of every legal
    // diagonal placement. A diagonal needs the same offset for x and y, so
    // only cells where x and y are far apart in the wrong direction are
    // unreachable: (8,0),(9,0),(9,1),(0,8),(1,9),(0,9) — 6 cells.
    const tiles = makeTiles([
      { x: 1, y: 1, items: { 'Cockle Shell': 1 } },
      { x: 6, y: 1, items: { 'Cockle Shell': 1 } },
    ])
    const { remainingCounts, remainingRegions } = solveTreasures(tiles, ['COCKLE', 'COCKLE'], G)

    expect(remainingCounts.get('COCKLE')).toBe(2)
    const region = remainingRegions.get('COCKLE')
    expect(region.size).toBe(94)
    for (const idx of [8, 9, 19, 80, 90, 91]) expect(region.has(idx)).toBe(false)
    for (const idx of [55, 11, 16]) expect(region.has(idx)).toBe(true)
  })
})

describe('Completed-pattern pre-commit (live 4485248732423974 — G8 artefact21)', () => {
  // ARTEFACT_FOURTEEN = [{0,0,SEASONAL},{0,2,CB}], completed at C4/C6.
  // ARTEFACT_TWENTY_ONE = [{0,0,SEASONAL},{1,0,CB},{2,0,CB},{0,1,CB},{1,1,CB}].
  // G8 (6,7) = SEASONAL + H8 (7,7) = Camel Bone. Without the completed signal
  // G8 has two equal candidates (FOURTEEN@(6,7) vs TWENTY_ONE@(6,7)), so the
  // intersection is only G8 and I8/G9/H9 stay hidden. Pre-committing the
  // fully-revealed FOURTEEN@(2,3) leaves TWENTY_ONE as the sole candidate.
  const dug = [
    { x: 2, y: 3, items: { [SEASONAL]: 1 } }, // C4
    { x: 2, y: 5, items: { 'Camel Bone': 1 } }, // C6
    { x: 6, y: 7, items: { [SEASONAL]: 1 } }, // G8
    { x: 7, y: 7, items: { 'Camel Bone': 1 } }, // H8
  ]
  const patterns = ['ARTEFACT_FOURTEEN', 'ARTEFACT_TWENTY_ONE']
  const I8 = 7 * G + 8, G9 = 8 * G + 6, H9 = 8 * G + 7

  it('leaves I8/G9/H9 hidden when completedPatterns is not passed (old behaviour)', () => {
    const tiles = makeTiles(dug)
    const { guaranteed } = solveTreasures(tiles, patterns, G)

    for (const idx of [I8, G9, H9]) {
      expect(guaranteed.has(idx), `expected ${label(idx)} NOT guaranteed`).toBe(false)
    }
  })

  it('guarantees I8/G9/H9 as Camel Bone once FOURTEEN is marked completed', () => {
    const tiles = makeTiles(dug)
    const { guaranteed, guaranteedSlugs, guaranteedFormationCounts, remainingCounts } =
      solveTreasures(tiles, patterns, G, ['ARTEFACT_FOURTEEN'])

    for (const idx of [I8, G9, H9]) {
      expect(guaranteed.has(idx), `expected ${label(idx)} guaranteed`).toBe(true)
      expect(guaranteedSlugs.get(idx)).toBe('camel_bone')
    }
    expect(guaranteedSlugs.get(7 * G + 6)).toBe(SEASONAL_SLUG) // G8 stays the artefact
    expect(guaranteedFormationCounts.get('ARTEFACT_FOURTEEN')).toBe(1)
    expect(guaranteedFormationCounts.get('ARTEFACT_TWENTY_ONE')).toBe(1)
    expect(remainingCounts.size).toBe(0)
  })

  it('consumes only one slot of a duplicated completed formation', () => {
    const tiles = makeTiles(dug.slice(0, 2)) // just C4 + C6
    const { guaranteedFormationCounts, remainingCounts } = solveTreasures(
      tiles, ['ARTEFACT_FOURTEEN', 'ARTEFACT_FOURTEEN'], G, ['ARTEFACT_FOURTEEN'],
    )

    expect(guaranteedFormationCounts.get('ARTEFACT_FOURTEEN')).toBe(1)
    expect(remainingCounts.get('ARTEFACT_FOURTEEN')).toBe(1)
  })
})

describe('Pass 5 crab-satisfaction (live 3863900154075909 — I6 crab forces G6)', () => {
  // SEA_CUCUMBERS = SC,SC,SC,Pipi in a row. E6/F6 revealed SC: two placements
  // cover them — ox=3 (…F6 SC, G6 Pipi) and ox=4 (…F6 SC, G6 SC, H6 Pipi).
  // The I6 crab's neighbours are H6/J6/I5/I7; with no other shapes on the
  // board only H6 (via ox=4's Pipi) can satisfy it, so the ox=3 world is
  // impossible and G6 is provably Sea Cucumber. Pass 5 used to ignore
  // crab-satisfaction, leaving G6 ambiguous.
  const G6 = 5 * G + 6, H6 = 5 * G + 7
  const dug = [
    { x: 4, y: 5, items: { 'Sea Cucumber': 1 } }, // E6
    { x: 5, y: 5, items: { 'Sea Cucumber': 1 } }, // F6
    { x: 8, y: 5, items: { Crab: 1 } }, // I6
  ]

  it('guarantees G6 as Sea Cucumber and cascades H6 as Pipi', () => {
    const tiles = makeTiles(dug)
    const { guaranteed, guaranteedSlugs } = solveTreasures(tiles, ['SEA_CUCUMBERS'], G)

    expect(guaranteed.has(G6), `expected ${label(G6)} guaranteed`).toBe(true)
    expect(guaranteedSlugs.get(G6)).toBe('sea_cucumber')
    expect(guaranteedSlugs.get(H6)).toBe('pipi')
  })
})
