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
 * @param {string[]} completedPatternKeys - optional multiset of already-completed formation keys (from API desert.digging.completedPatterns). When provided, those instances are pre-committed if their plots are fully revealed, so they don't linger as competing hypotheses for undug cells (e.g. FOURTEEN completed at C4/C6 frees TWENTY_ONE to be provably at G8).
 * @returns {{ guaranteed: Set<number>, guaranteedSlugs: Map<number,string>, guaranteedCandidates: Map<number,string[]>, guaranteedFormationCounts: Map<string,number>, remainingCounts: Map<string,number>, remainingRegions: Map<string,Set<number>>, possibleTreasureCells: Set<number>, partial: boolean }}
 */
export function solveTreasures(tiles, patternKeys, gridSize = 10, completedPatternKeys = []) {
  const guaranteed = new Set()
  if (!patternKeys?.length) {
    return { guaranteed, guaranteedSlugs: new Map(), guaranteedCandidates: new Map(), guaranteedFormationCounts: new Map(), partial: false }
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
  const shapes = [...new Set(patternKeys)]
    .filter(key => Array.isArray(DIGGING_FORMATIONS[key]) && DIGGING_FORMATIONS[key].length)
    .map(key => ({ key, formation: DIGGING_FORMATIONS[key] }))

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
  //
  // Soundness of the committed-cell exclusion (Layer 1): the real board has
  // exactly ONE item per cell — two formation instances can never share a
  // treasure cell. A cell already proven to belong to a CONFIRMED instance
  // (committedCellOrigin) therefore cannot host a plot of any other instance —
  // including another instance of the SAME shape. Most artefact formations
  // share the names "Camel Bone"/seasonal-artefact, so without this check a
  // same-name overlapping candidate survives and bloats the candidate set,
  // hiding guarantees the intersection would otherwise prove.
  const buildPlacement = (key, formation, ox, oy) => {
    const plots = new Map()
    for (const p of formation) {
      const x = ox + p.x
      const y = oy + p.y
      if (!inBounds(x, y)) return null
      const idx = y * gridSize + x
      if (revealedSand.has(idx) || revealedCrab.has(idx)) return null
      const rn = revealedTreasureName.get(idx)
      if (rn !== undefined && !namesMatch(rn, p.name)) return null
      if (committedCellOrigin.has(idx)) return null
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
  // Disputed names for guaranteed-but-ambiguous cells, unioned across every
  // anchor/candidate that touched the cell (idx -> Set<slug>). Pure reporting:
  // feeds the UI's "?" tooltip with the possible identities; never influences
  // deduction. Cleared the moment the cell is ever confirmed (see
  // recordConfirmedPlots), at which point its name is ground truth.
  const ambiguousCandidates = new Map()

  const markAmbiguous = (idx, names) => {
    ambiguousIdx.add(idx)
    guaranteedNames.delete(idx)
    let set = ambiguousCandidates.get(idx)
    if (!set) { set = new Set(); ambiguousCandidates.set(idx, set) }
    for (const n of names) set.add(normName(n))
  }

  const recordName = (idx, name) => {
    if (ambiguousIdx.has(idx)) {
      // Keep accumulating the possible identities for reporting — a cell can
      // be touched by several anchors, each adding a candidate name.
      ambiguousCandidates.get(idx)?.add(normName(name))
      return
    }
    if (guaranteedNames.has(idx)) {
      if (!namesMatch(guaranteedNames.get(idx), name)) {
        markAmbiguous(idx, [guaranteedNames.get(idx), name])
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
      else markAmbiguous(idx, names)
    }
  }

  // Record the cells of a placement KNOWN to be the one true confirmed
  // instance (i.e. the sole candidate/survivor, always paired with a
  // recordConfirmedInstance call) — as opposed to intersectCandidates, which
  // may be merging several STILL-LIVE alternatives that haven't been
  // eliminated yet. Bypasses (and overrides) `ambiguousIdx`: an earlier pass
  // may have provisionally called a cell ambiguous because, at the time, a
  // competing candidate for a DIFFERENT anchor also touched it and disagreed
  // on the name — but once a candidate is eliminated (its shape's
  // remainingCount hits 0 or it's excluded by committedCellOrigin), that
  // disagreement is moot. A confirmed instance's names are ground truth and
  // can never later contradict themselves (committedCellOrigin locks an idx
  // to its first-confirmed origin forever), so overriding a stale ambiguous
  // mark here is always safe.
  // Collects the placements of CONFIRMED instances (deduped by signature), so
  // the global-consistency search (Pass 5) can treat them as fixed ground
  // truth rather than re-solving them.
  const confirmedPlacements = []
  const confirmedPlacementSet = new Set()

  const recordConfirmedPlots = (plots) => {
    const sig = placementSignature(plots)
    if (!confirmedPlacementSet.has(sig)) {
      confirmedPlacementSet.add(sig)
      confirmedPlacements.push(plots)
    }
    for (const [idx, name] of plots) {
      guaranteed.add(idx)
      ambiguousIdx.delete(idx)
      ambiguousCandidates.delete(idx)
      guaranteedNames.set(idx, name)
    }
  }

  // Shape bookkeeping for single-instance reasoning (Passes 2 & 3). Depends
  // only on patternKeys/DIGGING_FORMATIONS, not on reveals, so it's computed
  // once outside the iterative loop below.
  const shapeCount = new Map() // key -> occurrences (duplicates preserved)
  for (const key of patternKeys) shapeCount.set(key, (shapeCount.get(key) ?? 0) + 1)

  // Remaining instance count per key — decremented when Phase A locks an actual
  // reveal to a unique placement. Once a key reaches 0, no further candidates
  // of that shape are generated, unblocking other anchors that were ambiguous
  // only because of the now-committed instance.
  const remainingCount = new Map(shapeCount)

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
  // Static by name only — does NOT account for a same-name sibling shape
  // having already been fully consumed (remainingCount 0). See
  // `revealIsExclusiveTo` below for the dynamic version Pass 2/3 actually use.
  const confinedTo = (name, key) => {
    const keys = nameToKeys.get(normName(name))
    return keys && keys.size === 1 && keys.has(key)
  }

  // Every still-live candidate placement (any shape with remainingCount > 0)
  // that could explain revealed/pseudo-revealed treasure `tName` at `tIdx`.
  // Hoisted above the iterative loop (rather than redefined each pass) so
  // Pass 2/3's dynamic-confinement check below can call it too. Reads
  // `remainingCount`/`committedCellOrigin` by closure — both are declared
  // further down in this function but never invoked until inside the
  // iterative loop, by which point they're initialized (same pattern already
  // relied on by `enumerateSingleInstanceSurvivors` referencing
  // `committedCellOrigin`).
  const computeCandidates = (tIdx, tName) => {
    const origin = committedCellOrigin.get(tIdx)
    if (origin) return [origin]

    const tx = tIdx % gridSize
    const ty = Math.floor(tIdx / gridSize)
    const candidates = []
    for (const { key, formation } of shapes) {
      if ((remainingCount.get(key) ?? 0) === 0) continue
      for (const anchor of formation) {
        if (!namesMatch(anchor.name, tName)) continue
        const ox = tx - anchor.x
        const oy = ty - anchor.y
        const plots = buildPlacement(key, formation, ox, oy)
        if (!plots) continue
        // Cross-check for single-remaining-instance shapes: every revealed
        // treasure whose name is confined to this key — and not already
        // attributed to a previously committed (consumed) instance — must be
        // covered by this candidate. There is no other instance left to explain
        // uncovered reveals, so any candidate that misses one is impossible.
        if ((remainingCount.get(key) ?? 0) === 1) {
          const hasUncovered = [...revealedTreasureName].some(
            ([rIdx, rName]) =>
              confinedTo(rName, key) &&
              !committedCellOrigin.has(rIdx) &&
              !plots.has(rIdx),
          )
          if (hasUncovered) continue
        }
        candidates.push({ key, plots })
      }
    }
    return candidates
  }

  // Dynamic (per-reveal) confinement: true iff, given the board's CURRENT
  // state (including sibling shapes of the same name already consumed this
  // run), `key` is the ONLY shape that can explain this specific reveal.
  // Strictly more precise than `confinedTo` (which only ever looks at static
  // name ownership and can never notice a sibling shape running out) — e.g.
  // three formations sharing "Camel Bone"/seasonal-artefact names are never
  // `confinedTo` any one of them, but once two of the three are pinned to
  // their true placements, a reveal that only the third's remaining
  // candidates can cover becomes dynamically exclusive to it. Used by Pass 2/3
  // (not by computeCandidates' own internal cross-check above, to avoid
  // unbounded recursion re-deriving the very candidates being computed).
  const revealIsExclusiveTo = (idx, name, key) => {
    if (committedCellOrigin.has(idx)) return false
    const cands = computeCandidates(idx, name)
    return cands.length > 0 && cands.every(c => c.key === key)
  }

  // Enumerate every still-legal placement of `key` across the whole board
  // (multi-remaining-instance shapes use this — the global-consistency search
  // picks N pairwise non-overlapping placements from it).
  const enumerateAllPlacements = (key) => {
    const formation = DIGGING_FORMATIONS[key]
    const minX = Math.min(...formation.map(p => p.x))
    const maxX = Math.max(...formation.map(p => p.x))
    const minY = Math.min(...formation.map(p => p.y))
    const maxY = Math.max(...formation.map(p => p.y))
    const allPlacements = []
    for (let oy = -minY; oy <= gridSize - 1 - maxY; oy++) {
      for (let ox = -minX; ox <= gridSize - 1 - maxX; ox++) {
        const plots = buildPlacement(key, formation, ox, oy)
        if (plots) allPlacements.push(plots)
      }
    }
    return allPlacements
  }

  // Enumerate every still-legal placement of a single-instance formation
  // `key`, against whatever `revealedTreasureName` holds at call time. If a
  // revealed (or pseudo-revealed) treasure name is (dynamically) confined to
  // this shape, anchor on it — cheap and exact (Pass 2's approach). Otherwise
  // fall back to full-board enumeration (Pass 3's approach). Shared by
  // Pass 2, Pass 3, and the whole-pattern-guarantee finalization below.
  const enumerateSingleInstanceSurvivors = (key) => {
    const formation = DIGGING_FORMATIONS[key]
    const confined = [...revealedTreasureName].filter(
      ([idx, name]) => revealIsExclusiveTo(idx, name, key),
    )

    if (confined.length) {
      const [aIdx, aName] = confined[0]
      const ax = aIdx % gridSize
      const ay = Math.floor(aIdx / gridSize)
      const survivors = []
      for (const anchor of formation) {
        if (!namesMatch(anchor.name, aName)) continue
        const plots = buildPlacement(key, formation, ax - anchor.x, ay - anchor.y)
        if (!plots) continue
        const coversAll = confined.every(([cIdx, cName]) => namesMatch(plots.get(cIdx), cName))
        if (coversAll) survivors.push(plots)
      }
      return survivors
    }

    return enumerateAllPlacements(key)
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

  // A single surviving candidate for a treasure anchor pins that placement as
  // the real instance, regardless of whether the shape has 1 or N occurrences
  // on the board (same soundness argument either way — see Pass 1 below). We
  // remember WHICH instance was pinned, per key, keyed by a canonical
  // signature of its cell indices, so finalization can count how many
  // DISTINCT instances of a duplicated shape are individually proven. A
  // Set<signature> (not a counter) is required because the same real instance
  // can be independently re-confirmed by two different anchors within it
  // (e.g. two plots sharing a name) — deduping by signature avoids
  // double-counting one instance as two.
  const confirmedInstances = new Map() // key -> Set<signature>

  const placementSignature = (plots) => [...plots.keys()].sort((a, b) => a - b).join(',')

  // idx -> the exact {key, plots} that a confirmed instance pinned it to.
  // Once a key is fully consumed (remainingCount reaches 0), computeCandidates
  // stops generating that key's placements — but a pseudo-revealed cell that
  // came FROM that consumed instance still needs re-explaining every time
  // Phase A/B re-examines it as an anchor. Without this map, the search would
  // exclude the (correct, but now-consumed) key and could latch onto a
  // different, spurious single-candidate explanation for the same cell — a
  // real false positive (e.g. re-deriving a since-consumed ARTEFACT_TWENTY_THREE
  // cell as an alternate, wrong ARTEFACT_TWENTY placement). Short-circuiting
  // to the already-known origin avoids ever re-searching for an anchor whose
  // answer is already settled.
  const committedCellOrigin = new Map() // idx -> { key, plots }

  // Returns true iff this signature was not already recorded for `key` — i.e.
  // this call establishes a NEW instance rather than re-confirming one already
  // known. Callers use this (not "was this anchor a real dig?") to decide
  // whether to consume a remainingCount slot: two different real-dug anchors
  // (e.g. Vase then Hieroglyph) can both independently confirm the SAME
  // instance, and only the first such confirmation may consume a slot —
  // otherwise a single real instance gets double-counted as two, starving
  // remainingCount before any evidence of the second real instance exists.
  const recordConfirmedInstance = (key, plots) => {
    if (!confirmedInstances.has(key)) confirmedInstances.set(key, new Set())
    const sig = placementSignature(plots)
    const set = confirmedInstances.get(key)
    const isNewInstance = !set.has(sig)
    set.add(sig)
    for (const idx of plots.keys()) {
      if (!committedCellOrigin.has(idx)) committedCellOrigin.set(idx, { key, plots })
    }
    return isNewInstance
  }

  // ── Pre-commit completed formations ──────────────────────────────────
  // A completed formation's instance is fully dug (every plot is a revealed
  // treasure with the matching name). If we leave its key in the live pool,
  // its placement lingers as a spurious competing hypothesis for undug
  // cells — e.g. G8=OT has FOURTEEN@(6,7) vs TWENTY_ONE@(6,7) as equal
  // candidates, so the intersection is only G8 and I8/G9/H9 stay hidden.
  // But FOURTEEN is in completedPatterns and its true placement C4/C6 is
  // already fully revealed; it should be locked and its remainingCount
  // consumed before any deduction, freeing TWENTY_ONE to be the sole
  // candidate for G8 and thus guaranteeing I8/G9/H9.
  //
  // We pre-commit one fully-revealed placement per completed occurrence
  // (multiset-aware), picking the first non-overlapping legal placement whose
  // every plot is already a revealed treasure with the correct name. This is
  // sound because a completed instance's plots are by definition all dug.
  if (completedPatternKeys?.length) {
    const needed = new Map()
    for (const k of completedPatternKeys) needed.set(k, (needed.get(k) ?? 0) + 1)
    // Only consider completed keys that are actually present on the board
    for (const [key, count] of needed) {
      if (!shapeCount.has(key)) continue
      const formation = DIGGING_FORMATIONS[key]
      if (!Array.isArray(formation) || !formation.length) continue
      let committed = 0
      // Enumerate all origins for this key
      const minX = Math.min(...formation.map(p => p.x))
      const maxX = Math.max(...formation.map(p => p.x))
      const minY = Math.min(...formation.map(p => p.y))
      const maxY = Math.max(...formation.map(p => p.y))
      const candidates = []
      for (let oy = -minY; oy <= gridSize - 1 - maxY; oy++) {
        for (let ox = -minX; ox <= gridSize - 1 - maxX; ox++) {
          const plots = buildPlacement(key, formation, ox, oy)
          if (!plots) continue
          // Fully revealed? every plot already dug with correct name
          let fullyRevealed = true
          for (const [idx, name] of plots) {
            const rn = revealedTreasureName.get(idx)
            if (rn === undefined || !namesMatch(rn, name)) { fullyRevealed = false; break }
          }
          if (fullyRevealed) candidates.push({ ox, oy, plots })
        }
      }
      // Commit up to `count` non-overlapping candidates, preferring those that
      // cover the most reveals (deterministic). For the usual 0/1 case this
      // is a single pick.
      for (const c of candidates) {
        if (committed >= count) break
        if ([...c.plots.keys()].some(idx => committedCellOrigin.has(idx))) continue
        const sig = placementSignature(c.plots)
        const already = confirmedInstances.get(key)?.has(sig)
        if (already) continue
        const isNew = recordConfirmedInstance(key, c.plots)
        if (isNew) {
          const rem = remainingCount.get(key) ?? 0
          if (rem > 0) remainingCount.set(key, rem - 1)
        }
        recordConfirmedPlots(c.plots)
        committed++
      }
      // Fallback: if no fully-revealed placement was found for some completed
      // occurrences (API lag or seasonal name rotation), just consume the
      // remaining count for the un-pinned completions so the key doesn't
      // pollute undug reasoning. Handles partial commits (e.g. 2 needed, 1
      // pinned → still need to consume 1 more). Trusts API completedPatterns
      // as authoritative; conservative alternative would be to leave the key
      // live (fewer guarantees but never a false positive).
      if (committed < count) {
        const rem = remainingCount.get(key) ?? 0
        remainingCount.set(key, Math.max(0, rem - (count - committed)))
      }
    }
  }

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
    // (computeCandidates itself is hoisted above the loop — see its definition
    // near enumerateSingleInstanceSurvivors — since Pass 2/3's dynamic
    // confinement check needs to call it too.)

    // Phase A: immediately promote single-candidate anchors.
    // Only actual reveals (not pseudo-reveals) source instance-consumption locks —
    // pseudo-revealed cells are already attributed to a committed formation instance
    // and must not be used to consume a second one. Likewise, a second real-dug
    // anchor that re-confirms an ALREADY-recorded instance (e.g. both the Vase and
    // the Hieroglyph of the same HIEROGLYPH placement got dug) must not consume a
    // second slot — see recordConfirmedInstance's isNewInstance.
    for (const [tIdx, tName] of revealedTreasureName) {
      const candidates = computeCandidates(tIdx, tName)
      if (candidates.length !== 1) continue
      const { key, plots } = candidates[0]
      const isNewInstance = recordConfirmedInstance(key, plots)
      // Guarantee immediately — Phase B won't see this anchor if the instance
      // is consumed below (count drops to 0), so we can't rely on Phase B.
      // recordConfirmedPlots (not intersectCandidates): this IS the one true
      // confirmed instance, so its names are ground truth even if an earlier
      // pass this same iteration had provisionally flagged one of these cells
      // ambiguous against a since-eliminated alternative.
      recordConfirmedPlots(plots)
      // Consume the instance only when the anchor is a real dug tile AND this is
      // the first confirmation of this specific instance.
      if (!pseudoRevealed.has(tIdx) && isNewInstance) {
        const rem = remainingCount.get(key) ?? 0
        if (rem > 0) {
          remainingCount.set(key, rem - 1)
          iterChanged = true
        }
      }
      for (const [idx, name] of plots) {
        if (!revealedTreasureName.has(idx) && !pseudoRevealed.has(idx)) {
          revealedTreasureName.set(idx, name)
          pseudoRevealed.add(idx)
          iterChanged = true
        }
      }
    }

    // Phase B: recompute with Phase A promotions applied, then intersect.
    // Mirrors Phase A's consume-on-confirm: a single-candidate anchor found
    // only here (not in Phase A) still pins a real instance and must consume
    // its remainingCount slot — otherwise other anchors keep seeing this
    // already-confirmed shape as a live competing hypothesis forever (it can
    // never reach candidates.length === 1 for them, since the confirmed
    // instance's own reveal keeps re-adding it as a candidate).
    for (const [tIdx, tName] of revealedTreasureName) {
      const candidates = computeCandidates(tIdx, tName)
      if (!candidates.length) continue // inconsistent — skip safely
      if (candidates.length === 1) {
        const { key, plots } = candidates[0]
        const isNewInstance = recordConfirmedInstance(key, plots)
        if (!pseudoRevealed.has(tIdx) && isNewInstance) {
          const rem = remainingCount.get(key) ?? 0
          if (rem > 0) {
            remainingCount.set(key, rem - 1)
            iterChanged = true
          }
        }
        recordConfirmedPlots(plots)
      } else {
        intersectCandidates(candidates.map(c => c.plots))
      }
    }

    // ── Pass 2: single-instance forcing ─────────────────────────────────
    // When exactly one formation of a shape is on the board, every revealed
    // treasure that (dynamically — see revealIsExclusiveTo) can ONLY be
    // explained by that shape must belong to that single instance.
    // Enumerating the instance's legal placements that cover all such
    // reveals and intersecting them pins the in-between tiles even when
    // nothing adjacent has been dug.
    for (const key of presentKeys) {
      if (remainingCount.get(key) !== 1) continue
      const hasConfinedReveal = [...revealedTreasureName].some(([idx, name]) => revealIsExclusiveTo(idx, name, key))
      if (!hasConfinedReveal) continue

      const survivors = enumerateSingleInstanceSurvivors(key)
      if (!survivors.length) continue // inconsistent data — skip safely
      // A single survivor pins this shape's one remaining instance, exactly
      // like Phase A/B's single-candidate anchors — must consume its
      // remainingCount slot too, or shapes sharing its treasure names (e.g.
      // three artefact formations sharing "Camel Bone") keep seeing it as a
      // live competing hypothesis forever (see the Phase B regression this
      // mirrors, in the 2026-07-27 snapshot test above).
      if (survivors.length === 1) {
        const isNewInstance = recordConfirmedInstance(key, survivors[0])
        if (isNewInstance) {
          const rem = remainingCount.get(key) ?? 0
          if (rem > 0) { remainingCount.set(key, rem - 1); iterChanged = true }
        }
        recordConfirmedPlots(survivors[0])
      } else {
        intersectCandidates(survivors)
      }
    }

    // ── Pass 3: pure-elimination ─────────────────────────────────────────
    // For a single-instance formation with no (dynamically) confined-name
    // reveal to anchor on, enumerate EVERY legal placement across the whole
    // board. If sand, crab, edges, and (from prior iterations) pseudo-reveals
    // rule out all but one, that lone survivor's cells are guaranteed.
    for (const key of presentKeys) {
      if (remainingCount.get(key) !== 1) continue
      const hasConfinedReveal = [...revealedTreasureName].some(([idx, n]) => revealIsExclusiveTo(idx, n, key))
      if (hasConfinedReveal) continue // Pass 2 already covers this shape with a tighter candidate set

      const allPlacements = enumerateSingleInstanceSurvivors(key)
      if (allPlacements.length === 1) {
        const isNewInstance = recordConfirmedInstance(key, allPlacements[0])
        if (isNewInstance) {
          const rem = remainingCount.get(key) ?? 0
          if (rem > 0) { remainingCount.set(key, rem - 1); iterChanged = true }
        }
        recordConfirmedPlots(allPlacements[0])
      }
    }

    // ── Pass 4: crab-satisfaction forcing ────────────────────────────────
    // Every crab borders at least one treasure. If a crab has no known treasure
    // neighbour yet and exactly one candidate neighbour remains, that neighbour
    // must be the treasure. Only marks the cell guaranteed (no name known).
    for (const cIdx of revealedCrab) {
      const cx = cIdx % gridSize
      const cy = Math.floor(cIdx / gridSize)
      const ns = [[1, 0], [-1, 0], [0, 1], [0, -1]]
        .map(([dx, dy]) => [cx + dx, cy + dy])
        .filter(([nx, ny]) => inBounds(nx, ny))

      const satisfied = ns.some(([nx, ny]) => {
        const nIdx = ny * gridSize + nx
        return revealedTreasureName.has(nIdx) || guaranteed.has(nIdx)
      })
      if (satisfied) continue

      const candidates = ns.filter(([nx, ny]) => {
        const nIdx = ny * gridSize + nx
        if (revealedSand.has(nIdx) || revealedCrab.has(nIdx) || revealedTreasureName.has(nIdx)) return false
        return ![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
          const sx = nx + dx
          const sy = ny + dy
          return inBounds(sx, sy) && revealedSand.has(sy * gridSize + sx) &&
            !(sx === cx && sy === cy)
        })
      })
      if (candidates.length === 1) {
        const [nx, ny] = candidates[0]
        const nIdx = ny * gridSize + nx
        if (!guaranteed.has(nIdx)) { guaranteed.add(nIdx); iterChanged = true }
      }
    }

    // ── Pass 5: global-consistency name disambiguation ───────────────────
    // The per-anchor local passes are sound but incomplete: a cell can be
    // provably a treasure while its NAME is only provable via global
    // constraints — every formation instance occurs exactly once, placements
    // may not overlap, and every revealed treasure must be covered by exactly
    // one placement. Live case: C4=CB + D5=OP are diagonal, so no straight-line
    // artefact (FIFTEEN/TWENTY_FOUR) can cover both — only SEVENTEEN's L can —
    // hence D4 is provably Camel Bone even though the local passes saw
    // disagreeing candidates. For each disputed name, run a bounded exact
    // search for a full consistent assignment in which the cell carries that
    // name; names with NO consistent assignment are eliminated.
    //
    // Soundness: the real board's placement of every remaining instance is one
    // of the enumerated legal placements, and it satisfies every revealed
    // crab (each crab borders a real treasure), so "no consistent assignment
    // with name n at cell X" ⇒ the real board does not name X=n ⇒ eliminating
    // n is sound. The search checks placement legality (buildPlacement),
    // non-overlap, reveal coverage, AND crab-satisfaction (a candidate
    // assignment whose covered cells leave any revealed crab with no adjacent
    // treasure is rejected — live case 3863900154075909: I6's only viable
    // treasure neighbour is H6=Pipi, forcing SEA_CUCUMBERS@ox=4 and G6=Sea
    // Cucumber). Budget exhaustion yields no conclusion (stays ambiguous —
    // never a wrong name).
    if (ambiguousCandidates.size) {
      const groups = []
      let groupsValid = true
      for (const key of presentKeys) {
        const need = remainingCount.get(key) ?? 0
        if (need === 0) continue
        const placements = need === 1
          ? enumerateSingleInstanceSurvivors(key)
          : enumerateAllPlacements(key)
        if (!placements.length || placements.length < need) { groupsValid = false; break }
        groups.push({ key, need, placements })
      }
      // Most-constrained first: fewest placement options → fewest branches.
      groups.sort((a, b) => a.placements.length - b.placements.length)

      const BUDGET = Symbol('budget')
      const fixedCovered = new Set()
      for (const plots of confirmedPlacements) {
        for (const idx of plots.keys()) fixedCovered.add(idx)
      }

      // Find ANY full assignment (fixed placements + one non-overlapping
      // placement per remaining instance) covering every revealed treasure
      // cell. `extraReveals` adds a hypothetical reveal (cell → name) so we
      // can test "could this cell be name n?". Returns true/false, or null on
      // budget.
      //
      // Search strategy — backtrack over REVEALS, most-constrained first
      // (a reveal with 1-2 covering placements prunes the tree far harder
      // than a shape with 50 free placements), with sound reductions:
      //  - a placement that CONTAINS a reveal cell but names it wrongly is
      //    invalid (matters for the hypothetical extra reveals — the real
      //    ones are already enforced by buildPlacement);
      //  - shapes that end up covering no reveal ("floated") only need SOME
      //    non-overlapping placement to exist — checked once at the leaf.
      const search = (extraReveals) => {
        const revealName = new Map(revealedTreasureName)
        for (const [idx, name] of extraReveals) revealName.set(idx, name)

        // Per-group precomputation: placement conflict flags (extra reveals
        // only — regular ones are guaranteed clean by buildPlacement).
        const groupPlacementOk = groups.map(g => g.placements.map(p => {
          for (const [eIdx, eName] of extraReveals) {
            const n = p.get(eIdx)
            if (n !== undefined && !namesMatch(n, eName)) return false
          }
          return true
        }))

        // Options per reveal: which (group, placement) can cover it correctly.
        const options = new Map()
        for (const [idx, name] of revealName) {
          if (fixedCovered.has(idx)) continue
          const opts = []
          for (let gi = 0; gi < groups.length; gi++) {
            const { placements } = groups[gi]
            for (let pi = 0; pi < placements.length; pi++) {
              const n = placements[pi].get(idx)
              if (n !== undefined && namesMatch(n, name) && groupPlacementOk[gi][pi]) {
                opts.push([gi, pi])
              }
            }
          }
          options.set(idx, opts)
        }

        const slots = groups.map(g => g.need)
        const placed = []
        const occupied = new Set(fixedCovered)
        const covered = new Set(fixedCovered)
        let nodes = 0

        const uncoveredReveals = () => {
          const out = []
          for (const idx of revealName.keys()) {
            if (!covered.has(idx)) out.push(idx)
          }
          return out
        }

        const floatsOk = () => {
          for (let gi = 0; gi < groups.length; gi++) {
            if (slots[gi] === 0) continue
            const { placements } = groups[gi]
            let ok = false
            for (let pi = 0; pi < placements.length; pi++) {
              if (!groupPlacementOk[gi][pi]) continue
              if (![...placements[pi].keys()].some(idx => occupied.has(idx))) { ok = true; break }
            }
            if (!ok) return false
          }
          return true
        }

        // Crab-satisfaction at the leaf: every revealed crab must border a
        // revealed treasure or a cell covered by this candidate assignment.
        // Sound — the true board satisfies every crab, so its branch always
        // passes this filter. Only runs at the leaf (all reveals covered),
        // so it costs O(crabs) per complete assignment, never per node.
        const crabsOk = () => {
          for (const cIdx of revealedCrab) {
            const cx = cIdx % gridSize
            const cy = Math.floor(cIdx / gridSize)
            let ok = false
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
              const nx = cx + dx
              const ny = cy + dy
              if (!inBounds(nx, ny)) continue
              const nIdx = ny * gridSize + nx
              if (revealName.has(nIdx) || covered.has(nIdx)) { ok = true; break }
            }
            if (!ok) return false
          }
          return true
        }

        const bt = () => {
          if (++nodes > 50000) throw BUDGET
          const uncovered = uncoveredReveals()
          if (!uncovered.length) return floatsOk() && crabsOk()

          // Most-constrained reveal first: fewest live options.
          let best = null
          for (const idx of uncovered) {
            const live = options.get(idx).filter(([gi]) => slots[gi] > 0)
            if (!live.length) return false // a reveal nobody can cover → dead end
            if (!best || live.length < best.live.length) best = { idx, live }
          }
          const { idx, live } = best

          for (const [gi, pi] of live) {
            const p = groups[gi].placements[pi]
            if ([...p.keys()].some(i => occupied.has(i))) continue
            // Apply: occupy, cover, consume a slot of group gi.
            const pKeys = [...p.keys()]
            for (const i of pKeys) occupied.add(i)
            for (const i of pKeys) covered.add(i)
            slots[gi] -= 1
            placed.push(p)
            if (bt()) return true
            placed.pop()
            slots[gi] += 1
            for (const i of pKeys) covered.delete(i)
            for (const i of pKeys) occupied.delete(i)
          }
          return false
        }

        try { return bt() } catch (e) {
          if (e === BUDGET) return null
          throw e
        }
      }

      const toResolve = [...ambiguousCandidates.keys()]
      for (const idx of toResolve) {
        const names = [...ambiguousCandidates.get(idx)]
        const possible = []
        let budgetHit = false
        for (const n of names) {
          const ok = search(new Map([[idx, n]]))
          if (ok === true) possible.push(n)
          else if (ok === null) { budgetHit = true; break }
        }
        if (budgetHit) continue // no conclusions this iteration — stay conservative
        if (possible.length === 1) {
          // Exactly one disputed name survives global consistency → provable.
          guaranteedNames.set(idx, possible[0])
          ambiguousCandidates.delete(idx)
          ambiguousIdx.delete(idx)
          iterChanged = true
        }
        // possible.length === 0 → the revealed state contradicts the game
        // rules; keep ambiguous rather than manufacture a name.
      }
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

  // Disputed-name reporting for guaranteed-but-ambiguous cells (UI "?" tooltip):
  // idx -> possible treasure slugs, unioned across every candidate that touched
  // the cell. Absent for named cells. Read-only info — never used in deduction.
  const guaranteedCandidates = new Map()
  for (const [idx, names] of ambiguousCandidates) {
    guaranteedCandidates.set(idx, [...names])
  }

  // ── Whole-pattern-guarantee finalization ────────────────────────────
  // For each present key, the count of individually-proven instances is the
  // number of distinct signatures Pass 1 pinned for it (sound regardless of
  // shapeCount — two real formation instances can never occupy overlapping
  // cells, so N distinct confirmed signatures means N real instances are
  // individually known, full stop). When exactly one instance of a key
  // remains uncommitted (remainingCount === 1 — true for originally
  // single-instance shapes, and also for a duplicated shape once its other
  // instances have been consumed by Pass 1), also fold in the confined-name/
  // full-board enumeration route (e.g. COCKLE/SEAWEED, or the last instance
  // of a cascade-consumed duplicate) — but only bump the count if that
  // survivor's signature isn't already one of the confirmed ones, since
  // enumerateSingleInstanceSurvivors re-derives the SAME instance Pass 1 may
  // have already confirmed (double-counting it would overcount past the
  // real number of instances on the board).
  const guaranteedFormationCounts = new Map()
  for (const key of presentKeys) {
    const confirmed = confirmedInstances.get(key)
    let count = confirmed?.size ?? 0
    if (remainingCount.get(key) === 1) {
      const survivors = enumerateSingleInstanceSurvivors(key)
      if (survivors.length === 1 && !confirmed?.has(placementSignature(survivors[0]))) {
        count += 1
      }
    }
    if (count > 0) guaranteedFormationCounts.set(key, count)
  }

  // ── Layer 3: remaining-instance reporting ────────────────────────────
  // Pure reporting — never feeds deduction. For every shape with unconfirmed
  // instances left, HOW MANY remain and WHICH cells can still host one of
  // them. A region is the union of all still-legal placements (buildPlacement
  // already excludes sand/crab/name-mismatch/committed cells), so a cell
  // absent from every region is provably NOT an undiscovered treasure — the
  // complement of `guaranteed`. This answers "what's still out there, and
  // where can it still be?" for the UI.
  const remainingCounts = new Map()
  const remainingRegions = new Map()
  for (const key of presentKeys) {
    const rem = remainingCount.get(key) ?? 0
    if (rem === 0) continue
    remainingCounts.set(key, rem)
    // Tighter survivor set when a single instance remains (Pass 2/3
    // semantics), full-board enumeration otherwise — same sets the solver
    // itself reasons over, so the report can never contradict the deduction.
    const placements = rem === 1
      ? enumerateSingleInstanceSurvivors(key)
      : enumerateAllPlacements(key)
    const region = new Set()
    for (const p of placements) {
      for (const idx of p.keys()) region.add(idx)
    }
    remainingRegions.set(key, region)
  }
  const possibleTreasureCells = new Set()
  for (const region of remainingRegions.values()) {
    for (const idx of region) possibleTreasureCells.add(idx)
  }

  return { guaranteed, guaranteedSlugs, guaranteedCandidates, guaranteedFormationCounts, remainingCounts, remainingRegions, possibleTreasureCells, partial: false }
}
