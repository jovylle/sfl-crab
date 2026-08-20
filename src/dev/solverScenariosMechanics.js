// src/dev/solverScenariosMechanics.js
//
// Mechanics-combination scenarios — the "patterns × grid × rules" matrix:
// duplicate formations, shared-name collisions, sparse digs, edge pins,
// crab forcing, honest ambiguity. All assertions are TRUE against the current
// (pre-Layer-1) solver — these lock in sound behavior across the combination
// space. Non-seasonal formations only, except artefact boards which reference
// the seasonal artefact by computed name (stable across seasons).
//
// idx = y*10 + x — every assertion below was hand-verified against the grid.
//
// The same array feeds BOTH the vitest auto-suite (tests/solver.scenarios.test.js)
// and the /solver-debug page (src/views/SolverDebug.vue) — one source of truth.

import { getCurrentSeasonalArtefact } from '@/data/game/seasonalArtefacts.js'

const SEASONAL = getCurrentSeasonalArtefact()
const SEASONAL_SLUG = SEASONAL.toLowerCase().replace(/\s+/g, '_')

export const SOLVER_SCENARIOS_MECHANICS = [
  {
    id: 'mech-dup-cockle-partial',
    name: 'M1 — duplicate COCKLEs: one pinned at corner, other honestly ambiguous',
    grid: [
      { x: 0, y: 0, items: { 'Cockle Shell': 1 } },
      { x: 5, y: 5, items: { 'Cockle Shell': 1 } },
    ],
    patterns: ['COCKLE', 'COCKLE'],
    assertions: [
      { idx: 0, property: 'guaranteed', expected: true, label: 'A1 dug Cockle Shell guaranteed' },
      { idx: 11, property: 'guaranteed', expected: true, label: 'B2 guaranteed (corner-pinned instance)' },
      { idx: 11, property: 'slug', expected: 'cockle_shell', label: 'B2 slug = cockle_shell' },
      { idx: 22, property: 'guaranteed', expected: true, label: 'C3 guaranteed (corner-pinned instance)' },
      { idx: 22, property: 'slug', expected: 'cockle_shell', label: 'C3 slug = cockle_shell' },
      { idx: 33, property: 'guaranteed', expected: false, label: 'D4 NOT guaranteed (alternative diagonal)' },
      { idx: 44, property: 'guaranteed', expected: false, label: 'E5 NOT guaranteed (alternative diagonal)' },
      { idx: 66, property: 'guaranteed', expected: false, label: 'G7 NOT guaranteed (alternative diagonal)' },
      { idx: 77, property: 'guaranteed', expected: false, label: 'H8 NOT guaranteed (alternative diagonal)' },
    ],
  },
  {
    id: 'mech-dup-hieroglyph-both-pinned',
    name: 'M3 — duplicate HIEROGLYPHs, each pinned by its Hieroglyph tile',
    grid: [
      { x: 2, y: 3, items: { Hieroglyph: 1 } },
      { x: 6, y: 7, items: { Hieroglyph: 1 } },
    ],
    patterns: ['HIEROGLYPH', 'HIEROGLYPH'],
    assertions: [
      { idx: 22, property: 'guaranteed', expected: true, label: 'C3 Vase (instance A)' },
      { idx: 22, property: 'slug', expected: 'vase', label: 'C3 slug = vase' },
      { idx: 23, property: 'guaranteed', expected: true, label: 'D3 Vase (instance A)' },
      { idx: 66, property: 'guaranteed', expected: true, label: 'G7 Vase (instance B)' },
      { idx: 66, property: 'slug', expected: 'vase', label: 'G7 slug = vase' },
      { idx: 67, property: 'guaranteed', expected: true, label: 'H7 Vase (instance B)' },
      { idx: 32, property: 'guaranteed', expected: true, label: 'C4 Hieroglyph (dug)' },
      { idx: 76, property: 'guaranteed', expected: true, label: 'G8 Hieroglyph (dug)' },
    ],
  },
  {
    id: 'mech-shared-name-collision-one-vs-three',
    name: 'M4 — shared-name collision: ARTEFACT_ONE vs single-tile ARTEFACT_THREE',
    grid: [
      { x: 0, y: 3, items: { [SEASONAL]: 1 } },
      { x: 0, y: 4, items: { 'Camel Bone': 1 } },
      { x: 0, y: 5, items: { 'Camel Bone': 1 } },
      { x: 7, y: 7, items: { [SEASONAL]: 1 } },
    ],
    patterns: ['ARTEFACT_ONE', 'ARTEFACT_THREE'],
    assertions: [
      { idx: 30, property: 'guaranteed', expected: true, label: 'D4 seasonal (dug, ONE)' },
      { idx: 40, property: 'guaranteed', expected: true, label: 'E5 Camel Bone (ONE pinned)' },
      { idx: 40, property: 'slug', expected: 'camel_bone', label: 'E5 slug = camel_bone' },
      { idx: 50, property: 'guaranteed', expected: true, label: 'F6 Camel Bone (ONE pinned)' },
      { idx: 50, property: 'slug', expected: 'camel_bone', label: 'F6 slug = camel_bone' },
      { idx: 77, property: 'guaranteed', expected: true, label: 'H8 seasonal (THREE, dug)' },
      { idx: 77, property: 'slug', expected: SEASONAL_SLUG, label: 'H8 slug = seasonal' },
      { idx: 31, property: 'guaranteed', expected: false, label: 'B4 NOT guaranteed (free single-tile spot)' },
    ],
  },
  {
    id: 'mech-sparse-single-unique-anchor',
    name: 'M5 — sparse dig: single Hieroglyph reveal pins its two Vases',
    grid: [{ x: 5, y: 5, items: { Hieroglyph: 1 } }],
    patterns: ['HIEROGLYPH'],
    assertions: [
      { idx: 45, property: 'guaranteed', expected: true, label: 'F5 Vase guaranteed' },
      { idx: 45, property: 'slug', expected: 'vase', label: 'F5 slug = vase' },
      { idx: 46, property: 'guaranteed', expected: true, label: 'G5 Vase guaranteed' },
      { idx: 46, property: 'slug', expected: 'vase', label: 'G5 slug = vase' },
      { idx: 0, property: 'guaranteed', expected: false, label: 'A1 NOT guaranteed' },
    ],
  },
  {
    id: 'mech-corner-crab-forced',
    name: 'M6 — corner crab with one open neighbour is forced',
    grid: [
      { x: 0, y: 0, items: { Crab: 1 } },
      { x: 0, y: 1, items: { Crab: 1 } },
    ],
    patterns: ['HIEROGLYPH'], // unrelated shape present so Pass 4 runs
    assertions: [
      { idx: 1, property: 'guaranteed', expected: true, label: 'B1 forced (only open neighbour of A1 crab)' },
      { idx: 11, property: 'guaranteed', expected: false, label: 'B2 NOT forced (two candidates for A2 crab)' },
      { idx: 20, property: 'guaranteed', expected: false, label: 'A3 NOT forced' },
    ],
  },
  {
    id: 'mech-two-open-crab-not-forced',
    name: 'M7 — crab with two open neighbours forces nothing',
    grid: [{ x: 0, y: 0, items: { Crab: 1 } }],
    patterns: ['HIEROGLYPH'],
    assertions: [
      { idx: 1, property: 'guaranteed', expected: false, label: 'B1 NOT guaranteed' },
      { idx: 10, property: 'guaranteed', expected: false, label: 'A2 NOT guaranteed' },
    ],
  },
  {
    id: 'mech-edge-pinned-vertical-artefact',
    name: 'M8 — ARTEFACT_FOUR pinned against the left edge by its seasonal tile',
    grid: [{ x: 0, y: 5, items: { [SEASONAL]: 1 } }],
    patterns: ['ARTEFACT_FOUR'],
    assertions: [
      { idx: 50, property: 'guaranteed', expected: true, label: 'F6 seasonal (dug)' },
      { idx: 50, property: 'slug', expected: SEASONAL_SLUG, label: 'F6 slug = seasonal' },
      { idx: 60, property: 'guaranteed', expected: true, label: 'F7 Camel Bone guaranteed' },
      { idx: 60, property: 'slug', expected: 'camel_bone', label: 'F7 slug = camel_bone' },
      { idx: 70, property: 'guaranteed', expected: true, label: 'F8 Camel Bone guaranteed' },
      { idx: 80, property: 'guaranteed', expected: true, label: 'F9 Camel Bone guaranteed' },
    ],
  },
  {
    id: 'mech-coral-pearl-both-pinned',
    name: 'M9 — CORAL + PEARL: unique centre names pin both vertical trios',
    grid: [
      { x: 2, y: 2, items: { Coral: 1 } },
      { x: 6, y: 6, items: { Pearl: 1 } },
    ],
    patterns: ['CORAL', 'PEARL'],
    assertions: [
      { idx: 12, property: 'guaranteed', expected: true, label: 'B3 Stone (CORAL)' },
      { idx: 12, property: 'slug', expected: 'stone', label: 'B3 slug = stone' },
      { idx: 32, property: 'guaranteed', expected: true, label: 'B5 Stone (CORAL)' },
      { idx: 32, property: 'slug', expected: 'stone', label: 'B5 slug = stone' },
      { idx: 56, property: 'guaranteed', expected: true, label: 'F7 Stone (PEARL)' },
      { idx: 56, property: 'slug', expected: 'stone', label: 'F7 slug = stone' },
      { idx: 76, property: 'guaranteed', expected: true, label: 'F9 Stone (PEARL)' },
      { idx: 22, property: 'slug', expected: 'coral', label: 'C4 slug = coral' },
      { idx: 66, property: 'slug', expected: 'pearl', label: 'G8 slug = pearl' },
    ],
  },
  {
    id: 'mech-coral-pearl-honest-ambiguity',
    name: 'M10 — CORAL + PEARL, one Stone reveal: centre cell provably treasure, name honestly disputed',
    grid: [{ x: 2, y: 1, items: { Stone: 1 } }],
    patterns: ['CORAL', 'PEARL'],
    assertions: [
      { idx: 12, property: 'guaranteed', expected: true, label: 'B3 Stone guaranteed' },
      { idx: 12, property: 'slug', expected: 'stone', label: 'B3 slug = stone' },
      { idx: 22, property: 'guaranteed', expected: true, label: 'C3 guaranteed (Coral or Pearl — both cover it)' },
      { idx: 32, property: 'guaranteed', expected: true, label: 'B5 Stone guaranteed' },
      { idx: 32, property: 'slug', expected: 'stone', label: 'B5 slug = stone' },
    ],
  },
  {
    id: 'mech-dup-cockle-both-pinned',
    name: 'M11 — duplicate COCKLEs, both pinned by corner reveals (instance consumption)',
    grid: [
      { x: 0, y: 0, items: { 'Cockle Shell': 1 } },
      { x: 1, y: 1, items: { 'Cockle Shell': 1 } },
      { x: 3, y: 0, items: { 'Cockle Shell': 1 } },
    ],
    patterns: ['COCKLE', 'COCKLE'],
    assertions: [
      { idx: 22, property: 'guaranteed', expected: true, label: 'C3 guaranteed (instance A tail)' },
      { idx: 22, property: 'slug', expected: 'cockle_shell', label: 'C3 slug = cockle_shell' },
      { idx: 14, property: 'guaranteed', expected: true, label: 'E2 guaranteed (instance B middle)' },
      { idx: 14, property: 'slug', expected: 'cockle_shell', label: 'E2 slug = cockle_shell' },
      { idx: 25, property: 'guaranteed', expected: true, label: 'F3 guaranteed (instance B tail)' },
      { idx: 25, property: 'slug', expected: 'cockle_shell', label: 'F3 slug = cockle_shell' },
    ],
  },
  {
    id: 'mech-combo-five-formations',
    name: 'M15 — five formations on one board: mixed pins and honest open ends',
    grid: [
      { x: 1, y: 2, items: { Hieroglyph: 1 } },
      { x: 4, y: 4, items: { 'Old Bottle': 1 } },
      { x: 6, y: 0, items: { 'Cockle Shell': 1 } },
      { x: 0, y: 6, items: { Wood: 1 } },
      { x: 1, y: 6, items: { 'Wooden Compass': 1 } },
    ],
    patterns: ['HIEROGLYPH', 'OLD_BOTTLE', 'COCKLE', 'WOODEN_COMPASS'],
    assertions: [
      { idx: 11, property: 'guaranteed', expected: true, label: 'B2 Vase (HIEROGLYPH)' },
      { idx: 11, property: 'slug', expected: 'vase', label: 'B2 slug = vase' },
      { idx: 12, property: 'guaranteed', expected: true, label: 'C2 Vase (HIEROGLYPH)' },
      { idx: 17, property: 'guaranteed', expected: true, label: 'H2 Cockle Shell (COCKLE tail)' },
      { idx: 17, property: 'slug', expected: 'cockle_shell', label: 'H2 slug = cockle_shell' },
      { idx: 28, property: 'guaranteed', expected: true, label: 'I3 Cockle Shell (COCKLE tail)' },
      { idx: 62, property: 'guaranteed', expected: true, label: 'C7 Wood (WOODEN_COMPASS tail)' },
      { idx: 62, property: 'slug', expected: 'wood', label: 'C7 slug = wood' },
      { idx: 54, property: 'guaranteed', expected: false, label: 'E6 NOT guaranteed (OLD_BOTTLE still 4-way)' },
      { idx: 55, property: 'guaranteed', expected: false, label: 'F6 NOT guaranteed (OLD_BOTTLE still 4-way)' },
      { idx: 34, property: 'guaranteed', expected: false, label: 'E4 NOT guaranteed (OLD_BOTTLE alt)' },
    ],
  },
  {
    id: 'mech-dup-cockle-honest-ambiguity',
    name: 'M16 — duplicate COCKLEs: mid-diagonal reveals guarantee only the shared tails',
    grid: [
      { x: 1, y: 1, items: { 'Cockle Shell': 1 } },
      { x: 6, y: 1, items: { 'Cockle Shell': 1 } },
    ],
    patterns: ['COCKLE', 'COCKLE'],
    assertions: [
      { idx: 11, property: 'guaranteed', expected: true, label: 'B2 dug Cockle Shell guaranteed' },
      { idx: 22, property: 'guaranteed', expected: true, label: 'C3 guaranteed (in both instance-A candidates)' },
      { idx: 22, property: 'slug', expected: 'cockle_shell', label: 'C3 slug = cockle_shell' },
      { idx: 16, property: 'guaranteed', expected: true, label: 'G2 dug Cockle Shell guaranteed' },
      { idx: 27, property: 'guaranteed', expected: true, label: 'H3 guaranteed (in both instance-B candidates)' },
      { idx: 27, property: 'slug', expected: 'cockle_shell', label: 'H3 slug = cockle_shell' },
      { idx: 0, property: 'guaranteed', expected: false, label: 'A1 NOT guaranteed (one candidate only)' },
      { idx: 33, property: 'guaranteed', expected: false, label: 'D4 NOT guaranteed (one candidate only)' },
      { idx: 5, property: 'guaranteed', expected: false, label: 'F1 NOT guaranteed (one candidate only)' },
      { idx: 38, property: 'guaranteed', expected: false, label: 'I4 NOT guaranteed (one candidate only)' },
    ],
  },
]
