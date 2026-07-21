// src/dev/solverScenarios.js
export const SOLVER_SCENARIOS = [
  {
    id: 'pass1-vase',
    name: 'Pass 1 — Vase from Hieroglyph reveal',
    grid: [{ x: 0, y: 1, items: { Hieroglyph: 1 } }],
    patterns: ['HIEROGLYPH'],
    assertions: [
      { idx: 0, property: 'guaranteed', expected: true, label: 'A1 guaranteed (Vase)' },
      { idx: 1, property: 'guaranteed', expected: true, label: 'B1 guaranteed (Vase)' },
      { idx: 0, property: 'slug', expected: 'vase', label: 'A1 slug = vase' },
      { idx: 1, property: 'slug', expected: 'vase', label: 'B1 slug = vase' },
    ],
  },
  {
    id: 'pass1-no-false-positives',
    name: 'Pass 1 — No false positives (no reveals)',
    grid: [],
    patterns: ['HIEROGLYPH'],
    assertions: [
      { idx: 0, property: 'guaranteed', expected: false, label: 'A1 NOT guaranteed (ambiguous)' },
    ],
  },
  {
    id: 'pass2-wooden-compass',
    name: 'Pass 2 — Wooden Compass forces flanking Wood tiles',
    grid: [{ x: 4, y: 4, items: { 'Wooden Compass': 1 } }],
    patterns: ['WOODEN_COMPASS'],
    assertions: [
      { idx: 43, property: 'guaranteed', expected: true, label: 'D5 (idx 43) guaranteed Wood' },
      { idx: 45, property: 'guaranteed', expected: true, label: 'F5 (idx 45) guaranteed Wood' },
      { idx: 43, property: 'slug', expected: 'wood', label: 'D5 slug = wood' },
      { idx: 45, property: 'slug', expected: 'wood', label: 'F5 slug = wood' },
    ],
  },
  {
    id: 'pass3-pure-elimination',
    name: 'Pass 3 — Pure elimination (single survivor)',
    // OLD_BOTTLE 2x2 placed against corners with surrounding sand to force it
    grid: [
      { x: 0, y: 0, items: { 'Old Bottle': 1 } },
      { x: 1, y: 0, items: { 'Old Bottle': 1 } },
      { x: 0, y: 1, items: { 'Old Bottle': 1 } },
    ],
    patterns: ['OLD_BOTTLE'],
    assertions: [
      { idx: 11, property: 'guaranteed', expected: true, label: 'B2 (idx 11) forced' },
      { idx: 11, property: 'slug', expected: 'old_bottle', label: 'B2 slug = old_bottle' },
    ],
  },
  {
    id: 'pass4-crab-forcing-vase',
    name: 'Pass 4 — Crab forces Vase (bug repro)',
    // A crab at B1 (idx 1) with only A1 (idx 0) as the open neighbor — sand at C1 (idx 2) eliminates C1, board edge eliminates top/bottom
    // HIEROGLYPH: Vase at (0,0), Vase at (1,0), Hieroglyph at (0,1)
    // Place sand at x=2,y=0 and crab at x=1,y=0 — crab has only one undug non-sand neighbor
    // Actually: use a simpler setup: crab at (5,5) with sand at (4,5),(6,5),(5,4) leaving only (5,6) open
    grid: [
      { x: 5, y: 5, items: { Crab: 1 } },
      { x: 4, y: 5, items: { Sand: 1 } },
      { x: 6, y: 5, items: { Sand: 1 } },
      { x: 5, y: 4, items: { Sand: 1 } },
    ],
    patterns: ['COCKLE'],
    assertions: [
      { idx: 65, property: 'guaranteed', expected: true, label: 'F7 (idx 65) forced by crab' },
    ],
  },
  {
    id: 'pass4-crab-two-candidates',
    name: 'Pass 4 — Crab with two candidates (no forcing)',
    grid: [
      { x: 5, y: 5, items: { Crab: 1 } },
      { x: 4, y: 5, items: { Sand: 1 } },
      { x: 6, y: 5, items: { Sand: 1 } },
    ],
    patterns: ['COCKLE'],
    assertions: [
      { idx: 45, property: 'guaranteed', expected: false, label: 'F5 (idx 45) NOT forced (two candidates)' },
      { idx: 65, property: 'guaranteed', expected: false, label: 'F7 (idx 65) NOT forced (two candidates)' },
    ],
  },
  {
    id: 'pass4-crab-satisfied',
    name: 'Pass 4 — Satisfied crab (no extra forcing)',
    grid: [
      { x: 5, y: 5, items: { Crab: 1 } },
      { x: 5, y: 6, items: { 'Cockle Shell': 1 } },
    ],
    patterns: ['COCKLE'],
    assertions: [
      { idx: 55, property: 'guaranteed', expected: false, label: 'F6 (idx 55, crab) not in guaranteed' },
    ],
  },
  {
    id: 'pass1-cockle-diagonal',
    name: 'Pass 1 — COCKLE diagonal: three reveals force two unknowns',
    // COCKLE = diagonal of 3 Cockle Shell tiles at offsets (0,0),(1,1),(2,2)
    // Reveal all three so every legal placement is confirmed → nothing new to force,
    // but the revealed cells themselves are in guaranteed (always-guaranteed rule).
    grid: [
      { x: 3, y: 3, items: { 'Cockle Shell': 1 } },
      { x: 4, y: 4, items: { 'Cockle Shell': 1 } },
      { x: 5, y: 5, items: { 'Cockle Shell': 1 } },
    ],
    patterns: ['COCKLE'],
    assertions: [
      { idx: 33, property: 'guaranteed', expected: true, label: 'D4 (idx 33) guaranteed (revealed cockle)' },
      { idx: 44, property: 'guaranteed', expected: true, label: 'E5 (idx 44) guaranteed (revealed cockle)' },
      { idx: 55, property: 'guaranteed', expected: true, label: 'F6 (idx 55) guaranteed (revealed cockle)' },
    ],
  },
  {
    id: 'pass1-clam-2of4',
    name: 'Pass 1 — CLAM_SHELLS: two adjacent reveals narrow placement',
    // CLAM_SHELLS = 2x2 of Clam Shell. Reveal two cells in a single valid 2x2 at (5,5)-(6,6).
    // Two cells dug means there are still multiple 2x2 placements possible unless the pair
    // is unique. (5,5)+(6,5) is the top row — could come from placement (5,5) or (5,4).
    // No forced cells beyond the revealed ones.
    grid: [
      { x: 5, y: 5, items: { 'Clam Shell': 1 } },
      { x: 6, y: 5, items: { 'Clam Shell': 1 } },
    ],
    patterns: ['CLAM_SHELLS'],
    assertions: [
      { idx: 55, property: 'guaranteed', expected: true, label: 'F6 (idx 55) in guaranteed (revealed)' },
      { idx: 56, property: 'guaranteed', expected: true, label: 'G6 (idx 56) in guaranteed (revealed)' },
    ],
  },
  {
    id: 'pass1-multi-instance-one-revealed',
    name: 'Pass 1 — Two HIEROGLYPH on board; only one dug',
    // Two HIEROGLYPH patterns. Only one Hieroglyph tile dug at (0,1).
    // Forces (0,0) and (1,0) as Vase. The second instance has no reveals → zero forcing.
    grid: [
      { x: 0, y: 1, items: { Hieroglyph: 1 } },
    ],
    patterns: ['HIEROGLYPH', 'HIEROGLYPH'],
    assertions: [
      { idx: 0, property: 'guaranteed', expected: true, label: 'A1 (idx 0) Vase forced by first HIEROGLYPH' },
      { idx: 1, property: 'guaranteed', expected: true, label: 'B1 (idx 1) Vase forced by first HIEROGLYPH' },
      { idx: 0, property: 'slug', expected: 'vase', label: 'A1 slug = vase' },
    ],
  },
  {
    id: 'pass2-seaweed-row',
    name: 'Pass 2 — SEAWEED: unique Starfish cell forces three Seaweed tiles',
    // Actual SEAWEED formation: (0,0)=Seaweed, (1,0)=Seaweed, (2,0)=Seaweed, (2,1)=Starfish.
    // "Starfish" is the only uniquely-named tile in this formation.
    // Reveal Starfish at (7,6) → anchor pinned at (5,5) → forces Seaweed at (5,5),(6,5),(7,5).
    grid: [
      { x: 7, y: 6, items: { Starfish: 1 } },
    ],
    patterns: ['SEAWEED'],
    assertions: [
      { idx: 55, property: 'guaranteed', expected: true, label: 'F6 (idx 55) Seaweed forced' },
      { idx: 56, property: 'guaranteed', expected: true, label: 'G6 (idx 56) Seaweed forced' },
      { idx: 57, property: 'guaranteed', expected: true, label: 'H6 (idx 57) Seaweed forced' },
      { idx: 55, property: 'slug', expected: 'seaweed', label: 'idx 55 slug = seaweed' },
    ],
  },
  {
    id: 'pass3-edge-corner',
    name: 'Pass 3 — OLD_BOTTLE pushed to corner by board edges',
    // OLD_BOTTLE is a 2x2. Place one tile at (0,0) — the 2x2 must start at (0,0)
    // because any other placement would put it off-board or miss (0,0).
    // With only one valid 2x2, all four cells are forced.
    grid: [
      { x: 0, y: 0, items: { 'Old Bottle': 1 } },
      { x: 1, y: 0, items: { 'Old Bottle': 1 } },
      { x: 0, y: 1, items: { 'Old Bottle': 1 } },
      { x: 1, y: 1, items: { 'Old Bottle': 1 } },
    ],
    patterns: ['OLD_BOTTLE'],
    assertions: [
      { idx: 0, property: 'guaranteed', expected: true, label: 'A1 (idx 0) guaranteed' },
      { idx: 1, property: 'guaranteed', expected: true, label: 'B1 (idx 1) guaranteed' },
      { idx: 10, property: 'guaranteed', expected: true, label: 'A2 (idx 10) guaranteed' },
      { idx: 11, property: 'guaranteed', expected: true, label: 'B2 (idx 11) guaranteed' },
    ],
  },
  {
    id: 'pass3-cockle-surrounded-sand',
    name: 'Pass 3 — COCKLE surrounded by sand forces single survivor',
    // COCKLE diagonal is (0,0),(1,1),(2,2) relative. Place sand to block all but one placement.
    // Reveal Cockle Shell at (4,4). Sand at (3,3) and (5,5) blocks the two adjacent diagonals
    // → only the placement anchored at (4,4) is valid → (3,3) would be sand, (5,5) would be sand.
    // Actually we just need one valid placement. Let's test: cockle at (4,4) + sand at (3,3)
    // blocks the (3,3)→(4,4)→(5,5) placement (since (3,3) is sand, not cockle), and
    // sand at (5,5) blocks the (4,4)→(5,5)→(6,6) option.
    // Only valid placement: anchored at (2,2): (2,2),(3,3),(4,4) → but (3,3) is sand → blocked.
    // Let's use a simpler setup: three Cockle Shell tiles at (2,2),(3,3),(4,4) with sand elsewhere.
    grid: [
      { x: 2, y: 2, items: { 'Cockle Shell': 1 } },
      { x: 3, y: 3, items: { 'Cockle Shell': 1 } },
      { x: 4, y: 4, items: { 'Cockle Shell': 1 } },
    ],
    patterns: ['COCKLE'],
    assertions: [
      { idx: 22, property: 'guaranteed', expected: true, label: 'C3 (idx 22) guaranteed cockle' },
      { idx: 33, property: 'guaranteed', expected: true, label: 'D4 (idx 33) guaranteed cockle' },
      { idx: 44, property: 'guaranteed', expected: true, label: 'E5 (idx 44) guaranteed cockle' },
    ],
  },
  {
    id: 'pass4-corner-crab',
    name: 'Pass 4 — Crab at (0,0) corner: single open neighbor forced',
    // Crab at (0,0). Board edges eliminate (-1,0),(0,-1),(-1,-1).
    // Only possible neighbors: (1,0) and (0,1). Sand at (1,0) → only (0,1) remains.
    grid: [
      { x: 0, y: 0, items: { Crab: 1 } },
      { x: 1, y: 0, items: { Sand: 1 } },
    ],
    patterns: ['COCKLE'],
    assertions: [
      { idx: 10, property: 'guaranteed', expected: true, label: 'A2 (idx 10) forced (only open neighbor of corner crab)' },
    ],
  },
  {
    id: 'pass4-crab-edge-row',
    name: 'Pass 4 — Crab at left edge (x=0): two neighbors, one sand → forced',
    // Crab at (0,5). Left edge eliminates (-1,5). Neighbors: (1,5),(0,4),(0,6).
    // Sand at (0,4) and (0,6) → only (1,5) remains.
    grid: [
      { x: 0, y: 5, items: { Crab: 1 } },
      { x: 0, y: 4, items: { Sand: 1 } },
      { x: 0, y: 6, items: { Sand: 1 } },
    ],
    patterns: ['SEAWEED'],
    assertions: [
      { idx: 51, property: 'guaranteed', expected: true, label: 'B6 (idx 51) forced (only open neighbor of edge crab)' },
    ],
  },
  {
    id: 'pass4-cascade-chain',
    name: 'Pass 4 — Crab cascade: first forces a cell which satisfies second crab',
    // Crab at (3,3) with sand at (2,3),(3,2),(4,3) → forces (3,4)=idx 43.
    // Crab at (3,5) with sand at (2,5),(4,5),(3,6) → also only (3,4) open.
    // After (3,4) is forced, second crab is satisfied.
    grid: [
      { x: 3, y: 3, items: { Crab: 1 } },
      { x: 2, y: 3, items: { Sand: 1 } },
      { x: 3, y: 2, items: { Sand: 1 } },
      { x: 4, y: 3, items: { Sand: 1 } },
      { x: 3, y: 5, items: { Crab: 1 } },
      { x: 2, y: 5, items: { Sand: 1 } },
      { x: 4, y: 5, items: { Sand: 1 } },
      { x: 3, y: 6, items: { Sand: 1 } },
    ],
    patterns: ['COCKLE', 'SEAWEED'],
    assertions: [
      { idx: 43, property: 'guaranteed', expected: true, label: 'D5 (idx 43) forced by cascade' },
    ],
  },
  {
    id: 'pass1-false-positive-guard-multi',
    name: 'Pass 1 — Two HIEROGLYPH, zero reveals → zero guaranteed',
    // With two HIEROGLYPH instances and no dug tiles, nothing should be guaranteed.
    grid: [],
    patterns: ['HIEROGLYPH', 'HIEROGLYPH'],
    assertions: [
      { idx: 0, property: 'guaranteed', expected: false, label: 'A1 NOT guaranteed (no reveals)' },
      { idx: 1, property: 'guaranteed', expected: false, label: 'B1 NOT guaranteed (no reveals)' },
    ],
  },
  {
    id: 'pass2-old-bottle-3of4-then-4th',
    name: 'Pass 2 — OLD_BOTTLE: 3-of-4 reveals force the 4th cell',
    // Reveal three corners of the 2×2 at (5,5)→(6,6). Only one valid 2×2 placement.
    // Fourth corner (6,6) = idx 66 must be forced.
    grid: [
      { x: 5, y: 5, items: { 'Old Bottle': 1 } },
      { x: 6, y: 5, items: { 'Old Bottle': 1 } },
      { x: 5, y: 6, items: { 'Old Bottle': 1 } },
    ],
    patterns: ['OLD_BOTTLE'],
    assertions: [
      { idx: 66, property: 'guaranteed', expected: true, label: 'G7 (idx 66) forced as 4th Old Bottle' },
      { idx: 66, property: 'slug', expected: 'old_bottle', label: 'G7 slug = old_bottle' },
    ],
  },
  {
    id: 'pass4-crab-all-neighbors-sand',
    name: 'Pass 4 — Crab with all neighbors sand: nothing forced',
    // Crab at (5,5). Sand on all 4 cardinal neighbors. No open cells → crab unsatisfiable
    // but solver should not crash or add false guarantees.
    grid: [
      { x: 5, y: 5, items: { Crab: 1 } },
      { x: 4, y: 5, items: { Sand: 1 } },
      { x: 6, y: 5, items: { Sand: 1 } },
      { x: 5, y: 4, items: { Sand: 1 } },
      { x: 5, y: 6, items: { Sand: 1 } },
    ],
    patterns: ['COCKLE'],
    assertions: [
      { idx: 55, property: 'guaranteed', expected: false, label: 'F6 (crab cell) not in guaranteed' },
      { idx: 54, property: 'guaranteed', expected: false, label: 'E6 (sand) not in guaranteed' },
    ],
  },

  // ── Cross-check regression tests (bug: single Vase/SeaCucumber not pinning) ──

  {
    id: 'crosscheck-hieroglyph-two-vases',
    name: 'Cross-check — HIEROGLYPH: two adjacent Vases force Hieroglyph cell',
    // HIEROGLYPH = Vase@(0,0), Vase@(1,0), Hieroglyph@(0,1).
    // Reveal both Vases at (5,3) and (6,3).  Without cross-check, each Vase has 2
    // candidates and nothing pins.  With cross-check, the only candidate that covers
    // BOTH confined Vase reveals is ox=5,oy=3 → uniquely pins Hieroglyph@(5,4).
    grid: [
      { x: 5, y: 3, items: { Vase: 1 } },
      { x: 6, y: 3, items: { Vase: 1 } },
    ],
    patterns: ['HIEROGLYPH'],
    assertions: [
      { idx: 35, property: 'guaranteed', expected: true, label: 'F4 (idx 35) Vase guaranteed (revealed)' },
      { idx: 36, property: 'guaranteed', expected: true, label: 'G4 (idx 36) Vase guaranteed (revealed)' },
      { idx: 45, property: 'guaranteed', expected: true, label: 'F5 (idx 45) Hieroglyph forced by cross-check' },
      { idx: 45, property: 'slug', expected: 'hieroglyph', label: 'F5 slug = hieroglyph' },
    ],
  },

  {
    id: 'crosscheck-sea-cucumbers-three-in-row',
    name: 'Cross-check — SEA_CUCUMBERS: three Sea Cucumbers in a row force Pipi',
    // SEA_CUCUMBERS = SC@(0,0), SC@(1,0), SC@(2,0), Pipi@(3,0).
    // Reveal SC at (3,5),(4,5),(5,5) → idx 53,54,55.
    // Candidate anchor (1,0) at ox=2: Pipi@(5,5)=55 conflicts with revealed SC@55.
    // Candidate anchor (2,0) at ox=1: Pipi@(4,5)=54 conflicts with revealed SC@54.
    // Only anchor (0,0) at ox=3 survives → pins Pipi@(6,5) = idx 5*10+6 = 56.
    grid: [
      { x: 3, y: 5, items: { 'Sea Cucumber': 1 } },
      { x: 4, y: 5, items: { 'Sea Cucumber': 1 } },
      { x: 5, y: 5, items: { 'Sea Cucumber': 1 } },
    ],
    patterns: ['SEA_CUCUMBERS'],
    assertions: [
      { idx: 53, property: 'guaranteed', expected: true, label: '(3,5) idx 53 SC guaranteed (revealed)' },
      { idx: 54, property: 'guaranteed', expected: true, label: '(4,5) idx 54 SC guaranteed (revealed)' },
      { idx: 55, property: 'guaranteed', expected: true, label: '(5,5) idx 55 SC guaranteed (revealed)' },
      { idx: 56, property: 'guaranteed', expected: true, label: '(6,5) idx 56 Pipi forced by cross-check' },
      { idx: 56, property: 'slug', expected: 'pipi', label: '(6,5) idx 56 slug = pipi' },
    ],
  },

  {
    id: 'crosscheck-sea-cucumbers-two-in-row',
    name: 'Cross-check — SEA_CUCUMBERS: two Sea Cucumbers narrow candidates',
    // Reveal SC at (3,5)=53 and (4,5)=54.  Surviving candidates after cross-check:
    //   anchor (0,0) ox=3: SC@53,SC@54,SC@55,Pipi@56
    //   anchor (1,0) ox=2: SC@52,SC@53,SC@54,Pipi@55
    //   anchor (0,0) ox=4 (would cover 54 but miss 53) → eliminated by cross-check.
    // Intersection of survivors: 53 (SC), 54 (SC) already revealed; 55 in both
    // (names differ: SC vs Pipi) → guaranteed but ambiguous (no slug).
    // idx 56 only in first candidate → NOT guaranteed.
    grid: [
      { x: 3, y: 5, items: { 'Sea Cucumber': 1 } },
      { x: 4, y: 5, items: { 'Sea Cucumber': 1 } },
    ],
    patterns: ['SEA_CUCUMBERS'],
    assertions: [
      { idx: 53, property: 'guaranteed', expected: true, label: '(3,5) idx 53 SC guaranteed (revealed)' },
      { idx: 54, property: 'guaranteed', expected: true, label: '(4,5) idx 54 SC guaranteed (revealed)' },
      { idx: 55, property: 'guaranteed', expected: true, label: '(5,5) idx 55 guaranteed (in both survivors)' },
      { idx: 56, property: 'guaranteed', expected: false, label: '(6,5) idx 56 NOT guaranteed (Pipi only in one candidate)' },
    ],
  },

  {
    id: 'stale-confined-anchor-two-seaweed',
    name: 'Stale confined-reveal anchor — two SEAWEED instances (grid ref F6, land 7242422682754425)',
    // Instance A is fully confirmed via Starfish@(7,6) → pins Seaweed at
    // (5,5),(6,5),(7,5). Instance B's own Seaweed reveal at (9,0) is far
    // enough away that only a corner placement anchored there is legal.
    // Without excluding instance A's already-committed cells from the
    // confined-reveal anchor search, no single SEAWEED placement can cover
    // both instances' reveals at once → zero survivors, instance B silently
    // unforced. See tests/solver.scenarios.test.js for the full regression
    // (asserts guaranteedFormationCounts too, not just per-cell `guaranteed`).
    grid: [
      { x: 7, y: 6, items: { Starfish: 1 } },
      { x: 9, y: 0, items: { Seaweed: 1 } },
    ],
    patterns: ['SEAWEED', 'SEAWEED'],
    assertions: [
      { idx: 55, property: 'guaranteed', expected: true, label: 'instance A Seaweed (idx 55)' },
      { idx: 56, property: 'guaranteed', expected: true, label: 'instance A Seaweed (idx 56)' },
      { idx: 57, property: 'guaranteed', expected: true, label: 'instance A Seaweed (idx 57)' },
      { idx: 7, property: 'guaranteed', expected: true, label: 'instance B Seaweed (idx 7) forced post-fix' },
      { idx: 8, property: 'guaranteed', expected: true, label: 'instance B Seaweed (idx 8) forced post-fix' },
      { idx: 19, property: 'guaranteed', expected: true, label: 'instance B Starfish (idx 19) forced post-fix' },
    ],
  },
]
