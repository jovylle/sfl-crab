// tests/gridTileTransform.test.js
//
// Locks the string contract between gridArrayToTiles (the emitter) and
// treasureSolver's flattenTile (the consumer). If either side changes the
// literal "treasure actual-treasure" or the tileImage: prefix, the solver
// silently sees zero treasures — no crash, just wrong output. This catches that.

import { describe, it, expect } from 'vitest'
import { gridArrayToTiles } from '@/utils/gridTileTransform.js'

const GRID_SIZE = 10

describe('gridArrayToTiles', () => {
  it('crab tile emits ["crab", "tileImage:crab"]', () => {
    const tiles = gridArrayToTiles([{ x: 0, y: 0, items: { Crab: 1 } }], GRID_SIZE)
    expect(tiles[0]).toEqual(['crab', 'tileImage:crab'])
  })

  it('sand tile emits ["sand", "tileImage:sand"]', () => {
    const tiles = gridArrayToTiles([{ x: 1, y: 0, items: { Sand: 2 } }], GRID_SIZE)
    expect(tiles[1]).toEqual(['sand', 'tileImage:sand'])
  })

  it('treasure tile emits ["treasure actual-treasure", "tileImage:<slug>"]', () => {
    const tiles = gridArrayToTiles([{ x: 2, y: 0, items: { 'Clam Shell': 1 } }], GRID_SIZE)
    expect(tiles[2]).toEqual(['treasure actual-treasure', 'tileImage:clam_shell'])
  })

  it('multi-word treasure name is slugified correctly', () => {
    const tiles = gridArrayToTiles([{ x: 0, y: 1, items: { 'Salt Dino Egg': 1 } }], GRID_SIZE)
    expect(tiles[10]).toEqual(['treasure actual-treasure', 'tileImage:salt_dino_egg'])
  })

  it('undug cells (absent from grid array) remain empty arrays', () => {
    const tiles = gridArrayToTiles([], GRID_SIZE)
    expect(tiles.every(t => Array.isArray(t) && t.length === 0)).toBe(true)
    expect(tiles).toHaveLength(GRID_SIZE * GRID_SIZE)
  })

  it('index mapping: x + y*10 is correct', () => {
    const tiles = gridArrayToTiles([{ x: 3, y: 7, items: { Crab: 1 } }], GRID_SIZE)
    expect(tiles[7 * 10 + 3]).toEqual(['crab', 'tileImage:crab'])
    // all other cells empty
    const others = tiles.filter((_, i) => i !== 7 * 10 + 3)
    expect(others.every(t => t.length === 0)).toBe(true)
  })

  it('the treasure string is parseable by flattenTile logic (split on space)', () => {
    // This mirrors treasureSolver.js flattenTile exactly:
    //   arr.flatMap(c => String(c).split(' '))
    const tiles = gridArrayToTiles([{ x: 0, y: 0, items: { Hieroglyph: 1 } }], GRID_SIZE)
    const tokens = tiles[0].flatMap(c => String(c).split(' '))
    expect(tokens).toContain('treasure')
    expect(tokens).toContain('actual-treasure')
    expect(tokens.some(t => t.startsWith('tileImage:'))).toBe(true)
  })
})
