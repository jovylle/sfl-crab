// src/dev/solverScenariosPairwise.js
//
// Pairwise common-placement forcing (land-4485 A9 case, 2026-09).
//
// Mechanics: two anchors X≠Y share an identical (key, signature) candidate p,
// but each also has OTHER candidates — all belonging to ONE single-remaining
// key K, with DISJOINT signature sets across the two anchors. If p were unreal,
// X and Y would each need a distinct K placement — impossible with one instance
// left — so p IS the real instance.
//
// Live geometry (ARTEFACT_TWENTY ×1 + ARTEFACT_TWENTY_ONE ×1):
//   A9 (idx 80, seasonal dug): {T21@(0,8), T20@(0,7)}
//   C9 (idx 82, Camel Bone dug): {T21@(0,8), T20@(1,8), T20@(2,8)}
// The two TWENTY alternatives are distinct placements of a single-remaining
// key, so killing T21@(0,8) would need TWO twenties — impossible. T21@(0,8) is
// forced ⇒ A10 (idx 90) + B10 (idx 91) are Camel Bone.
//
// The dug sand at C7 (idx 62) is load-bearing for the scenario: without it,
// T21@(1,7) is a 4th legal candidate for C9 (Bone plots on undug cells), which
// breaks the single-alternative-key precondition — exactly as the live board's
// C8=Hieroglyph does. A sand dug with no adjacent treasure is ordinary.
//
// B9 (idx 81, Camel Bone dug) exercises the identical-signature exemption:
// A9×B9 share p=T21@(0,8) but both list the SAME TWENTY alternative T20@(0,7),
// so that pair must NOT force (a true instance's self-overlap across two of
// its own reveals is not a conflict).
//
// FAILS against the pre-pairwise solver (A10/B10 unflagged), PASSES after.
//
// idx = y*10 + x — hand-verified.

import { getCurrentSeasonalArtefact } from '@/data/game/seasonalArtefacts.js'

const SEASONAL = getCurrentSeasonalArtefact()
const SEASONAL_SLUG = SEASONAL.toLowerCase().replace(/\s+/g, '_')

export const SOLVER_SCENARIOS_PAIRWISE = [
  {
    id: 'pairwise-twenty-vs-twentyone-a9',
    name: 'P1 — Pairwise: one TWENTY cannot cover A9 and C9 at once, forcing TWENTY_ONE@A9',
    grid: [
      { x: 2, y: 6, items: { Sand: 2 } }, // C7 idx 62 — kills T21@(1,7) via sand-adjacency
      { x: 0, y: 8, items: { [SEASONAL]: 1 } }, // A9 idx 80
      { x: 1, y: 8, items: { 'Camel Bone': 1 } }, // B9 idx 81
      { x: 2, y: 8, items: { 'Camel Bone': 1 } }, // C9 idx 82
    ],
    patterns: ['ARTEFACT_TWENTY', 'ARTEFACT_TWENTY_ONE'],
    assertions: [
      { idx: 80, property: 'guaranteed', expected: true, label: 'A9 seasonal (dug)' },
      { idx: 80, property: 'slug', expected: SEASONAL_SLUG, label: 'A9 slug = seasonal' },
      { idx: 81, property: 'guaranteed', expected: true, label: 'B9 Camel Bone (dug)' },
      { idx: 81, property: 'slug', expected: 'camel_bone', label: 'B9 slug = camel_bone' },
      { idx: 82, property: 'guaranteed', expected: true, label: 'C9 Camel Bone (dug)' },
      { idx: 82, property: 'slug', expected: 'camel_bone', label: 'C9 slug = camel_bone' },
      // Pairwise delta: T21@(0,8) forced ⇒ A10/B10 certain Camel Bone.
      { idx: 90, property: 'guaranteed', expected: true, label: 'A10 Camel Bone (pairwise: TWENTY_ONE forced)' },
      { idx: 90, property: 'slug', expected: 'camel_bone', label: 'A10 slug = camel_bone' },
      { idx: 91, property: 'guaranteed', expected: true, label: 'B10 Camel Bone (pairwise: TWENTY_ONE forced)' },
      { idx: 91, property: 'slug', expected: 'camel_bone', label: 'B10 slug = camel_bone' },
      // Negatives: TWENTY still floats reveal-free — its other cells stay unknown.
      { idx: 71, property: 'guaranteed', expected: false, label: 'B8 NOT guaranteed (only in T20@(0,7))' },
      { idx: 83, property: 'guaranteed', expected: false, label: 'D9 NOT guaranteed (only in T20@(2,8))' },
      { idx: 92, property: 'guaranteed', expected: false, label: 'C10 NOT guaranteed (only in TWENTY alternatives)' },
      { idx: 93, property: 'guaranteed', expected: false, label: 'D10 NOT guaranteed (only in T20@(2,8))' },
    ],
  },
]
