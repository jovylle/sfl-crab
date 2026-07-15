// treasureSolver.js — sound, treasure-anchored guaranteed-treasure solver.
//
// Mechanics: treasures only appear inside fixed formation shapes, placed by
// translation only (no rotation/reflection). Crabs surround treasures; sand is
// empty. Given the revealed tiles + the multiset of formation shapes on the
// board, we deduce tiles that MUST be treasures.
//
// Algorithm (local, per revealed treasure — always sound, never a false
// positive): a revealed treasure T belongs to exactly one real formation
// placement. Enumerate EVERY legal placement (of any shape) that could cover T
// — i.e. some plot of that shape lands on T with a matching name, and no plot
// lands on revealed sand/crab or on a differently-named revealed treasure. The
// real placement is necessarily one of these candidates, so any tile that is a
// treasure-plot in ALL candidates must be a treasure. Intersecting the
// candidate plot-sets yields guaranteed tiles.
//
// Why local (not a global "place all formations" search): the global search is
// exponential and, once capped, its solution set is incomplete — intersecting
// an incomplete set can mark a tile that an un-enumerated placement leaves
// empty (a wrong guarantee). The local method needs no cap and is instant.
//
// No Vue reactivity here — this is a pure, testable module.

import { DIGGING_FORMATIONS } from '@/data/game/diggingFormations.js'

/**
 * Subtract the completed-pattern multiset from the active-pattern multiset,
 * returning the formation keys still in play (preserving duplicates).
 * Retained as a utility; the solver itself does NOT require completed-pattern
 * removal (see solveTreasures — it anchors on revealed treasures and is sound
 * with the full board multiset).
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

function namesMatch(a, b) {
  return normName(a) === normName(b)
}

// Treasure slug for the asset path: normalize, then join words with '_'.
// e.g. "Clam Shell" → "clam_shell", "Salt Dino Egg" → "salt_dino_egg".
function slugify(name) {
  return normName(name).replace(/\s+/g, '_')
}

/**
 * Flatten a tile's class entries into individual tokens. A revealed treasure
 * tile is stored as `['treasure actual-treasure', 'tileImage:<slug>']` — the
 * first element is ONE space-joined string, so split on spaces before testing
 * membership.
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
 * @param {(string[]|string)[]} tiles - grid cells of CSS class arrays
 * @param {string[]} patternKeys - formation multiset on the board
 * @param {number} gridSize - default 10
 * @returns {{ guaranteed: Set<number>, guaranteedSlugs: Map<number,string>, guaranteedFormationKeys: Set<string>, partial: boolean }}
 */
export function solveTreasures(tiles, patternKeys, gridSize = 10) {
  const guaranteed = new Set()
  if (!patternKeys?.length) {
    return { guaranteed, guaranteedSlugs: new Map(), guaranteedFormationKeys: new Set(), partial: false }
  }

  // ── Parse revealed state ────────────────────────────────────────────
  const revealedSand = new Set()
  const revealedCrab = new Set()
  const revealedTreasureName = new Map() // idx -> display name

  const cells = tiles || []
  for (let idx = 0; idx < cells.length; idx++) {
    const tokens = flattenTile(cells[idx])
    if (!tokens.length) continue

    if (tokens.includes('treasure') && tokens.includes('actual-treasure')) {
      const imgTok = tokens.find(t => t.startsWith('tileImage:'))
      const slug = imgTok ? imgTok.slice('tileImage:'.length) : ''
      revealedTreasureName.set(idx, slug.replace(/_/g, ' '))
    } else if (tokens.includes('sand')) {
      revealedSand.add(idx)
    } else if (tokens.includes('crab')) {
      revealedCrab.add(idx)
    }
    // else: undug / hint-only — unknown, could be treasure
  }

  // Formation shapes present on the board. Dedup by key (one instance is enough
  // for local reasoning), and include every shape so a revealed treasure can be
  // anchored to whichever shape truly owns it.
  const shapeEntries = [...new Set(patternKeys)]
    .map(key => ({ key, formation: DIGGING_FORMATIONS[key] }))
    .filter(({ formation }) => Array.isArray(formation) && formation.length)

  const inBounds = (x, y) => x >= 0 && x < gridSize && y >= 0 && y < gridSize

  // Build a legal placement of `formation` translated so plot origin sits at
  // (ox, oy). Returns a Map<idx,name> of treasure-plots, or null if impossible.
  //
  // Soundness of the sand-adjacency check: per game mechanics every treasure is
  // orthogonally surrounded by crabs, same-formation treasures, or the board
  // edge — NEVER sand. So if a plot of this placement would land orthogonally
  // adjacent to a revealed sand tile (and that neighbor isn't itself a plot of
  // this same placement), the placement cannot be real. This only ever removes
  // impossible candidates, so it can never drop the real placement.
  const buildPlacement = (formation, ox, oy) => {
    const plots = new Map()
    for (const p of formation) {
      const x = ox + p.x
      const y = oy + p.y
      if (!inBounds(x, y)) return null
      const idx = y * gridSize + x
      if (revealedSand.has(idx) || revealedCrab.has(idx)) return null
      const rn = revealedTreasureName.get(idx)
      if (rn !== undefined && !namesMatch(rn, p.name)) return null
      plots.set(idx, p.name)
    }
    // Sand-adjacency: no plot may sit orthogonally next to revealed sand.
    for (const idx of plots.keys()) {
      const px = idx % gridSize
      const py = Math.floor(idx / gridSize)
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = px + dx
        const ny = py + dy
        if (!inBounds(nx, ny)) continue
        const nIdx = ny * gridSize + nx
        if (revealedSand.has(nIdx) && !plots.has(nIdx)) return null
      }
    }
    return plots
  }

  // Names for guaranteed tiles, merged across every anchor. Unambiguous entries
  // land in `guaranteedNames`; once two anchors disagree on the name for the same
  // guaranteed tile, it moves to `ambiguousIdx` (index stays guaranteed, but we
  // can no longer say WHICH treasure — so no image is shown).
  const guaranteedNames = new Map() // idx -> display name (unambiguous so far)
  const ambiguousIdx = new Set()

  const recordName = (idx, name) => {
    if (ambiguousIdx.has(idx)) return
    if (guaranteedNames.has(idx)) {
      if (!namesMatch(guaranteedNames.get(idx), name)) {
        guaranteedNames.delete(idx)
        ambiguousIdx.add(idx)
      }
    } else {
      guaranteedNames.set(idx, name)
    }
  }

  // Intersect a set of legal placements (Map<idx,name>): a tile that is a
  // treasure-plot in EVERY candidate is guaranteed. Names merge across anchors
  // via recordName; a tile the candidates name differently is demoted.
  const intersectCandidates = (candidates) => {
    if (!candidates.length) return
    const [first, ...rest] = candidates
    for (const [idx] of first) {
      if (!rest.every(c => c.has(idx))) continue
      guaranteed.add(idx)
      const names = new Set(candidates.map(c => normName(c.get(idx))))
      if (names.size === 1) recordName(idx, first.get(idx))
      else { guaranteedNames.delete(idx); ambiguousIdx.add(idx) }
    }
  }

  // Shape bookkeeping for single-instance reasoning (Passes 2 & 3). Depends
  // only on patternKeys/DIGGING_FORMATIONS, not on reveals, so it's computed
  // once outside the iterative loop below.
  const shapeCount = new Map() // key -> occurrences (duplicates preserved)
  for (const key of patternKeys) shapeCount.set(key, (shapeCount.get(key) ?? 0) + 1)

  const presentKeys = [...new Set(patternKeys)].filter(
    key => Array.isArray(DIGGING_FORMATIONS[key]) && DIGGING_FORMATIONS[key].length,
  )

  // normalized treasure name -> set of present shape keys whose plots use it.
  const nameToKeys = new Map()
  for (const key of presentKeys) {
    for (const p of DIGGING_FORMATIONS[key]) {
      const n = normName(p.name)
      if (!nameToKeys.has(n)) nameToKeys.set(n, new Set())
      nameToKeys.get(n).add(key)
    }
  }
  // A name is "confined to key" iff, among present shapes, only `key` owns it.
  const confinedTo = (name, key) => {
    const keys = nameToKeys.get(normName(name))
    return keys && keys.size === 1 && keys.has(key)
  }

  // Enumerate every still-legal placement of a single-instance formation
  // `key`, against whatever `revealedTreasureName` holds at call time. If a
  // revealed (or pseudo-revealed) treasure name is confined to this shape,
  // anchor on it — cheap and exact (Pass 2's approach). Otherwise fall back
  // to full-board enumeration (Pass 3's approach). Shared by Pass 2, Pass 3,
  // and the whole-pattern-guarantee finalization below.
  const enumerateSingleInstanceSurvivors = (key) => {
    const formation = DIGGING_FORMATIONS[key]
    const confined = [...revealedTreasureName].filter(([, name]) => confinedTo(name, key))

    if (confined.length) {
      const [aIdx, aName] = confined[0]
      const ax = aIdx % gridSize
      const ay = Math.floor(aIdx / gridSize)
      const survivors = []
      for (const anchor of formation) {
        if (!namesMatch(anchor.name, aName)) continue
        const plots = buildPlacement(formation, ax - anchor.x, ay - anchor.y)
        if (!plots) continue
        const coversAll = confined.every(([cIdx, cName]) => namesMatch(plots.get(cIdx), cName))
        if (coversAll) survivors.push(plots)
      }
      return survivors
    }

    const minX = Math.min(...formation.map(p => p.x))
    const maxX = Math.max(...formation.map(p => p.x))
    const minY = Math.min(...formation.map(p => p.y))
    const maxY = Math.max(...formation.map(p => p.y))

    const allPlacements = []
    for (let oy = -minY; oy <= gridSize - 1 - maxY; oy++) {
      for (let ox = -minX; ox <= gridSize - 1 - maxX; ox++) {
        const plots = buildPlacement(formation, ox, oy)
        if (plots) allPlacements.push(plots)
      }
    }
    return allPlacements
  }

  // ── Iterative deduction ──────────────────────────────────────────────
  // Each iteration runs three passes, then promotes any newly-guaranteed cell
  // with a known (unambiguous) name into `revealedTreasureName` as a
  // "pseudo-reveal": a cell already proven to be treasure T constrains other
  // formations' placements exactly the way an actually-dug treasure T would.
  // buildPlacement only ever REJECTS a placement that conflicts with a
  // pseudo-reveal's name, so this can only shrink candidate sets — it can
  // never manufacture a false guarantee. The loop stops once a pass produces
  // no new promotable cells.
  const pseudoRevealed = new Set()

  // Keys whose one true instance was pinned by Pass 1's per-anchor reasoning
  // (a single surviving candidate for a shapeCount(key) === 1 formation is the
  // same soundness condition used elsewhere to promote pseudo-reveals/mark
  // cells guaranteed — this just remembers WHICH key produced that proof, so
  // finalization doesn't have to weaker-rediscover it via full-board fallback).
  const confirmedInstanceKeys = new Set()

  let iterChanged = true
  while (iterChanged) {
    iterChanged = false

    // ── Pass 1: treasure-anchored deduction ────────────────────────────
    // Two-phase to avoid anchor-ordering ambiguity:
    //   Phase A — single-candidate anchors promote their cells immediately so
    //             subsequent anchors in Phase B see tighter constraints.
    //   Phase B — recompute all candidates (some may now be blocked) and intersect.
    //
    // Why sound: a single-candidate anchor means exactly one placement is legal
    // for that revealed treasure — all its cells are certain. Promoting them
    // before Phase B is equivalent to the end-of-iteration promotion, just earlier.
    const computeCandidates = (tIdx, tName) => {
      const tx = tIdx % gridSize
      const ty = Math.floor(tIdx / gridSize)
      const candidates = []
      for (const { key, formation } of shapeEntries) {
        for (const anchor of formation) {
          if (!namesMatch(anchor.name, tName)) continue
          const ox = tx - anchor.x
          const oy = ty - anchor.y
          const plots = buildPlacement(formation, ox, oy)
          if (plots) candidates.push({ key, plots })
        }
      }
      return candidates
    }

    // Phase A: immediately promote single-candidate anchors
    for (const [tIdx, tName] of revealedTreasureName) {
      const candidates = computeCandidates(tIdx, tName)
      if (candidates.length !== 1) continue
      const { key, plots } = candidates[0]
      if (shapeCount.get(key) === 1) confirmedInstanceKeys.add(key)
      for (const [idx, name] of plots) {
        if (!revealedTreasureName.has(idx) && !pseudoRevealed.has(idx)) {
          revealedTreasureName.set(idx, name)
          pseudoRevealed.add(idx)
          iterChanged = true
        }
      }
    }

    // Phase B: recompute with Phase A promotions applied, then intersect
    for (const [tIdx, tName] of revealedTreasureName) {
      const candidates = computeCandidates(tIdx, tName)
      if (!candidates.length) continue // inconsistent — skip safely
      if (candidates.length === 1 && shapeCount.get(candidates[0].key) === 1) {
        confirmedInstanceKeys.add(candidates[0].key)
      }
      intersectCandidates(candidates.map(c => c.plots))
    }

    // ── Pass 2: single-instance forcing ─────────────────────────────────
    // When exactly one formation of a shape is on the board, every revealed
    // treasure whose name is owned ONLY by that shape (among shapes present)
    // must belong to that single instance. Enumerating the instance's legal
    // placements that cover all such reveals and intersecting them pins the
    // in-between tiles even when nothing adjacent has been dug.
    for (const key of presentKeys) {
      if (shapeCount.get(key) !== 1) continue
      const hasConfinedReveal = [...revealedTreasureName].some(([, name]) => confinedTo(name, key))
      if (!hasConfinedReveal) continue

      const survivors = enumerateSingleInstanceSurvivors(key)
      if (!survivors.length) continue // inconsistent data — skip safely
      intersectCandidates(survivors)
    }

    // ── Pass 3: pure-elimination ─────────────────────────────────────────
    // For a single-instance formation with no confined-name reveal to anchor
    // on, enumerate EVERY legal placement across the whole board. If sand,
    // crab, edges, and (from prior iterations) pseudo-reveals rule out all
    // but one, that lone survivor's cells are guaranteed.
    for (const key of presentKeys) {
      if (shapeCount.get(key) !== 1) continue
      const hasConfinedReveal = [...revealedTreasureName].some(([, n]) => confinedTo(n, key))
      if (hasConfinedReveal) continue // Pass 2 already covers this shape with a tighter candidate set

      const allPlacements = enumerateSingleInstanceSurvivors(key)
      if (allPlacements.length === 1) intersectCandidates(allPlacements)
    }

    // Promote newly-guaranteed, unambiguously-named cells into
    // revealedTreasureName so the next iteration can use them as spatial
    // constraints for other formations (e.g. a single-instance shape whose
    // last ambiguity depends on treating this cell as taken). Ambiguous
    // guaranteed cells (unknown name) are intentionally left alone — treating
    // them as "unavailable to other formations" could wrongly eliminate the
    // real placement of a different shape.
    for (const [idx, name] of guaranteedNames) {
      if (!revealedTreasureName.has(idx) && !pseudoRevealed.has(idx)) {
        revealedTreasureName.set(idx, name)
        pseudoRevealed.add(idx)
        iterChanged = true
      }
    }
  }

  const guaranteedSlugs = new Map()
  for (const [idx, name] of guaranteedNames) {
    guaranteedSlugs.set(idx, slugify(name))
  }

  // ── Whole-pattern-guarantee finalization ────────────────────────────
  // Only single-instance shapes can ever be pinned to one specific placement
  // (a duplicated shape leaves ambiguity about which instance owns a proven
  // cell). Against the now-converged revealedTreasureName (including all
  // pseudo-reveals from the loop above), re-run the same survivor enumeration
  // one last time: if exactly one legal placement remains, that placement IS
  // the real instance — every one of its cells is a proven treasure at its
  // correct relative offset, so the whole formation is guaranteed.
  const guaranteedFormationKeys = new Set(confirmedInstanceKeys)
  for (const key of presentKeys) {
    if (shapeCount.get(key) !== 1) continue
    const survivors = enumerateSingleInstanceSurvivors(key)
    if (survivors.length === 1) guaranteedFormationKeys.add(key)
  }

  return { guaranteed, guaranteedSlugs, guaranteedFormationKeys, partial: false }
}
