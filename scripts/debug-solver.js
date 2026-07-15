#!/usr/bin/env node
// scripts/debug-solver.js — fast, non-browser test/debug harness for treasureSolver.js.
//
// Runs the SAME code the app uses (gridArrayToTiles + solveTreasures) directly
// under plain node, sub-second, no browser/screenshot round-trip.
//
// Modes:
//   node scripts/debug-solver.js --file <snapshot.json>
//     Prints the 10x10 board (A-J / 1-10, matching the app) plus the
//     Guaranteed-treasure list the solver derives from that single snapshot.
//
//   node scripts/debug-solver.js --diff <earlier.json> <later.json>
//     Soundness regression oracle: runs the solver on <earlier.json>, then
//     checks every cell it guaranteed against <later.json>'s revealed state.
//     A guaranteed cell that turns up as sand/crab later is a false positive
//     (FAIL, loud). A guaranteed cell that turns up as a treasure is OK. A
//     cell still undug is inconclusive (not counted either way).
//
// Snapshot format: exactly what's saved at localStorage['landData_<id>'] by
// the app — { visitedFarmState: { desert: { digging: { patterns, grid } } } }.
// Capture one with the bookmarklet described in the project docs/PR notes.

import { register } from 'node:module'
import { readFileSync } from 'node:fs'
import { pathToFileURL, fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
register(pathToFileURL(path.join(__dirname, 'lib', 'resolve-alias-loader.mjs')).href, import.meta.url)

const { gridArrayToTiles } = await import('@/utils/gridTileTransform.js')
const { solveTreasures } = await import('@/utils/treasureSolver.js')

const GRID_SIZE = 10
const colLabels = Array.from({ length: GRID_SIZE }, (_, i) => String.fromCharCode(65 + i)) // A-J
const rowLabels = Array.from({ length: GRID_SIZE }, (_, i) => i + 1) // 1-10

function idxToLabel (idx) {
  const col = colLabels[idx % GRID_SIZE]
  const row = rowLabels[Math.floor(idx / GRID_SIZE)]
  return `${col}${row}`
}

/**
 * @param {string} filePath
 * @returns {{ tiles: string[][], patternKeys: string[] }}
 */
function loadSnapshot (filePath) {
  const raw = JSON.parse(readFileSync(filePath, 'utf8'))
  const digging = raw?.visitedFarmState?.desert?.digging
  if (!digging) {
    throw new Error(`${filePath}: missing visitedFarmState.desert.digging — is this a landData_<id> snapshot?`)
  }
  const flatGrid = (digging.grid || []).flat(Infinity)
  const tiles = gridArrayToTiles(flatGrid, GRID_SIZE)
  const patternKeys = digging.patterns || []
  return { tiles, patternKeys }
}

/** 'treasure' | 'sand' | 'crab' | 'undug' */
function tileState (tile) {
  if (!tile || !tile.length) return 'undug'
  if (tile[0] === 'treasure actual-treasure') return 'treasure'
  if (tile[0] === 'sand') return 'sand'
  if (tile[0] === 'crab') return 'crab'
  return 'undug'
}

function tileTreasureSlug (tile) {
  const imgTok = (tile || []).find(c => typeof c === 'string' && c.startsWith('tileImage:'))
  return imgTok ? imgTok.slice('tileImage:'.length) : null
}

// Assign short, human-scannable 2-char codes to distinct treasure slugs as we
// encounter them, for compact board printing. Collisions get a numeric suffix.
function makeCodeAssigner () {
  const slugToCode = new Map()
  const used = new Set()
  return function code (slug) {
    if (slugToCode.has(slug)) return slugToCode.get(slug)
    let base = slug.slice(0, 2).toUpperCase()
    let candidate = base
    let n = 2
    while (used.has(candidate)) candidate = base.slice(0, 1) + String(n++)
    used.add(candidate)
    slugToCode.set(slug, candidate)
    return candidate
  }
}

function printBoard (tiles, guaranteed, guaranteedSlugs) {
  const code = makeCodeAssigner()
  const cellText = []

  for (let idx = 0; idx < tiles.length; idx++) {
    const state = tileState(tiles[idx])
    if (state === 'sand') { cellText.push('.'); continue }
    if (state === 'crab') { cellText.push('c'); continue }
    if (state === 'treasure') {
      const slug = tileTreasureSlug(tiles[idx]) || 'unknown'
      cellText.push(code(slug))
      continue
    }
    // undug
    if (guaranteed.has(idx)) {
      cellText.push(guaranteedSlugs.has(idx) ? `!${code(guaranteedSlugs.get(idx))}` : '!?')
    } else {
      cellText.push('-')
    }
  }

  const width = Math.max(3, ...cellText.map(t => t.length))
  const pad = s => s.padStart(width, ' ')

  let header = '    ' + colLabels.map(l => pad(l)).join(' ')
  console.log(header)
  for (let row = 0; row < GRID_SIZE; row++) {
    const rowCells = cellText.slice(row * GRID_SIZE, (row + 1) * GRID_SIZE).map(pad)
    console.log(`${String(rowLabels[row]).padStart(2, ' ')}  ${rowCells.join(' ')}`)
  }
  console.log('\nLegend: . sand | c crab | <code> revealed treasure | !<code> guaranteed (undug) | !? guaranteed, name ambiguous | - undug/unknown')
}

function runSingle (filePath) {
  const { tiles, patternKeys } = loadSnapshot(filePath)
  const { guaranteed, guaranteedSlugs, guaranteedFormationCounts } = solveTreasures(tiles, patternKeys, GRID_SIZE)

  console.log(`\n=== ${filePath} ===`)
  console.log(`Patterns on board: ${patternKeys.length ? patternKeys.join(', ') : '(none)'}\n`)
  printBoard(tiles, guaranteed, guaranteedSlugs)

  console.log(`\nGuaranteed (${guaranteed.size}):`)
  if (!guaranteed.size) {
    console.log('  (none)')
  } else {
    for (const idx of [...guaranteed].sort((a, b) => a - b)) {
      const name = guaranteedSlugs.get(idx)
      console.log(`  ${idxToLabel(idx)} → ${name ? name.replace(/_/g, ' ') : '(ambiguous — unknown which treasure)'}`)
    }
  }

  console.log(`\nWhole-pattern-guaranteed (${guaranteedFormationCounts.size}):`)
  console.log(guaranteedFormationCounts.size
    ? `  ${[...guaranteedFormationCounts].map(([key, count]) => `${key} (${count})`).join(', ')}`
    : '  (none)')
}

function runDiff (earlierPath, laterPath) {
  const earlier = loadSnapshot(earlierPath)
  const later = loadSnapshot(laterPath)
  const { guaranteed, guaranteedSlugs } = solveTreasures(earlier.tiles, earlier.patternKeys, GRID_SIZE)

  console.log(`\n=== Soundness check: ${earlierPath} → ${laterPath} ===`)
  console.log(`Guaranteed cells to verify: ${guaranteed.size}\n`)

  let ok = 0
  let fail = 0
  let inconclusive = 0

  for (const idx of [...guaranteed].sort((a, b) => a - b)) {
    const label = idxToLabel(idx)
    const guessedName = guaranteedSlugs.get(idx)
    const laterState = tileState(later.tiles[idx])

    if (laterState === 'treasure') {
      ok++
      const laterSlug = tileTreasureSlug(later.tiles[idx])
      if (guessedName && laterSlug && guessedName !== laterSlug) {
        console.log(`  ANOMALY ${label}: guaranteed "${guessedName}" but later revealed as "${laterSlug}" (should never happen if sound)`)
      } else {
        console.log(`  OK      ${label}: confirmed treasure${guessedName ? ` (${guessedName.replace(/_/g, ' ')})` : ''}`)
      }
    } else if (laterState === 'sand' || laterState === 'crab') {
      fail++
      console.log(`  FAIL    ${label}: guaranteed${guessedName ? ` "${guessedName.replace(/_/g, ' ')}"` : ''} but later revealed as ${laterState.toUpperCase()} — FALSE POSITIVE`)
    } else {
      inconclusive++
    }
  }

  console.log(`\nSummary: ${ok} OK, ${fail} FAIL, ${inconclusive} inconclusive (still undug)`)
  if (fail > 0) {
    console.log('\n*** SOUNDNESS REGRESSION: solver produced at least one false positive. ***')
    process.exitCode = 1
  }
}

// ── CLI ──────────────────────────────────────────────────────────────────
const args = process.argv.slice(2)

if (args[0] === '--diff' && args[1] && args[2]) {
  runDiff(args[1], args[2])
} else if (args[0] === '--file' && args[1]) {
  runSingle(args[1])
} else {
  console.error('Usage:')
  console.error('  node scripts/debug-solver.js --file <snapshot.json>')
  console.error('  node scripts/debug-solver.js --diff <earlier.json> <later.json>')
  process.exitCode = 1
}
