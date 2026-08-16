// src/dev/solverScenariosOverlap.js
//
// Layer-1 target scenarios: same-name cross-shape overlap exclusion.
//
// Mechanics: the real board has exactly ONE item per cell — two formation
// instances can never share a cell. But all 24 artefact formations + 7 daily
// formations share just two names ("Camel Bone" + the seasonal artefact), so a
// candidate placement of one shape whose plots land on cells already PROVEN to
// belong to another formation instance is currently accepted (names match) and
// bloats the candidate set. These scenarios assert what the solver proves ONCE
// candidate generation excludes cells committed to other instances.
//
// They FAIL against the pre-Layer-1 solver and PASS after the exclusion lands —
// which is the point: they lock in the strengthened guarantee.
//
// idx = y*10 + x — hand-verified.

import { getCurrentSeasonalArtefact } from '@/data/game/seasonalArtefacts.js'

const SEASONAL = getCurrentSeasonalArtefact()
const SEASONAL_SLUG = SEASONAL.toLowerCase().replace(/\s+/g, '_')

export const SOLVER_SCENARIOS_OVERLAP = [
  {
    id: 'overlap-one-vs-twentyfour',
    name: 'O1 — Layer 1: confirmed ARTEFACT_ONE excludes same-name overlapping TWENTY_FOUR candidate',
    // ONE@(0,0) = {0 seasonal, 10 CB, 20 CB}; real TWENTY_FOUR@(2,1) = {12 CB, 13 OP, 14 CB, 22 CB, 24 CB}.
    // Reveal 12 (CB) has three candidates: real (2,1), real (2,0), and spurious
    // (0,1) whose CB plots land on ONE's committed 10/20 (names match, so the
    // pre-Layer-1 solver keeps it). Excluding it shrinks the intersection from
    // {12} to {12,14} — 14 becomes provable.
    grid: [
      { x: 0, y: 0, items: { [SEASONAL]: 1 } },
      { x: 2, y: 1, items: { 'Camel Bone': 1 } },
    ],
    patterns: ['ARTEFACT_ONE', 'ARTEFACT_TWENTY_FOUR'],
    assertions: [
      { idx: 0, property: 'guaranteed', expected: true, label: 'A1 seasonal (dug, ONE)' },
      { idx: 0, property: 'slug', expected: SEASONAL_SLUG, label: 'A1 slug = seasonal' },
      { idx: 10, property: 'guaranteed', expected: true, label: 'A2 Camel Bone (ONE pinned)' },
      { idx: 10, property: 'slug', expected: 'camel_bone', label: 'A2 slug = camel_bone' },
      { idx: 20, property: 'guaranteed', expected: true, label: 'A3 Camel Bone (ONE pinned)' },
      { idx: 12, property: 'guaranteed', expected: true, label: 'C2 Camel Bone (dug, TWENTY_FOUR)' },
      { idx: 12, property: 'slug', expected: 'camel_bone', label: 'C2 slug = camel_bone' },
      // Layer-1 delta: the spurious (0,1) candidate overlaps ONE's committed
      // 10/20; once excluded, 14 falls inside the remaining intersection.
      { idx: 14, property: 'guaranteed', expected: true, label: 'E2 Camel Bone (Layer 1: overlap candidate excluded)' },
      { idx: 14, property: 'slug', expected: 'camel_bone', label: 'E2 slug = camel_bone' },
      { idx: 13, property: 'guaranteed', expected: false, label: 'D2 NOT guaranteed (single candidate only)' },
      { idx: 22, property: 'guaranteed', expected: false, label: 'C3 NOT guaranteed (missing from the (2,0) candidate)' },
    ],
  },
  {
    id: 'overlap-one-vs-seventeen',
    name: 'O5 — Layer 1: confirmed ARTEFACT_ONE excludes same-name overlapping SEVENTEEN candidate',
    grid: [
      { x: 0, y: 0, items: { [SEASONAL]: 1 } },
      { x: 1, y: 2, items: { 'Camel Bone': 1 } },
    ],
    patterns: ['ARTEFACT_ONE', 'ARTEFACT_SEVENTEEN'],
    assertions: [
      { idx: 0, property: 'guaranteed', expected: true, label: 'A1 seasonal (dug, ONE)' },
      { idx: 0, property: 'slug', expected: SEASONAL_SLUG, label: 'A1 slug = seasonal' },
      { idx: 10, property: 'guaranteed', expected: true, label: 'A2 Camel Bone (ONE pinned)' },
      { idx: 20, property: 'guaranteed', expected: true, label: 'A3 Camel Bone (ONE pinned)' },
      { idx: 21, property: 'guaranteed', expected: true, label: 'B3 Camel Bone (dug, SEVENTEEN)' },
      { idx: 21, property: 'slug', expected: 'camel_bone', label: 'B3 slug = camel_bone' },
      // Without Layer 1 the SEVENTEEN candidate overlapping ONE (A3) survives
      // and only B3 is guaranteed.
      { idx: 22, property: 'guaranteed', expected: true, label: 'C3 Camel Bone (Layer 1: overlap candidate excluded)' },
      { idx: 22, property: 'slug', expected: 'camel_bone', label: 'C3 slug = camel_bone' },
      { idx: 32, property: 'guaranteed', expected: true, label: 'C4 seasonal (Layer 1)' },
      { idx: 32, property: 'slug', expected: SEASONAL_SLUG, label: 'C4 slug = seasonal' },
      { idx: 31, property: 'guaranteed', expected: false, label: 'B4 NOT guaranteed (only in the spurious overlap candidate)' },
    ],
  },
]
