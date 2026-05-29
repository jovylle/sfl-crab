import { ref, computed } from 'vue'
import { DIGGING_FORMATIONS } from '@/data/game/diggingFormations.js'

const GRID_SIZE = 10
const PRACTICE_ROUND_LIMIT = 7
const MAX_ARTEFACT_PATTERNS_PER_ROUND = 3

function shuffle(values) {
  const result = [...values]

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }

  return result
}

function pickPracticePatterns(allKeys) {
  const uniqueKeys = [...new Set(allKeys)]
  const artefactKeys = uniqueKeys.filter(key => key.includes('ARTEFACT'))
  const otherKeys = uniqueKeys.filter(key => !key.includes('ARTEFACT'))

  const picked = [
    ...shuffle(artefactKeys).slice(0, MAX_ARTEFACT_PATTERNS_PER_ROUND),
  ]

  const remainingSlots = PRACTICE_ROUND_LIMIT - picked.length
  if (remainingSlots > 0) {
    picked.push(...shuffle(otherKeys).slice(0, remainingSlots))
  }

  return picked
}

export function usePracticeEngine() {
  const hiddenGrid = ref([])
  const revealedSet = ref(new Set())
  const digsMade = ref(0)
  const isGameOver = ref(false)
  const isVictory = ref(false)
  const usedFormationKeys = ref([])
  const roundCount = ref(0)
  const digHistory = ref([])
  const formationPlacements = ref([])

  function _buildGridFromPlacements(placements) {
    const occupied = new Set()
    const keyedPlacements = []
    const allTiles = []

    for (const { key, tiles } of placements) {
      const formation = DIGGING_FORMATIONS[key]
      if (!formation?.length || !tiles?.length) continue

      // tiles[] and formation[] are in the same order — match by index for names
      const namedTiles = tiles.map((t, i) => ({
        x: t.x,
        y: t.y,
        name: formation[i]?.name ?? formation[0].name,
      }))

      namedTiles.forEach(t => occupied.add(`${t.x},${t.y}`))
      allTiles.push(...namedTiles)
      keyedPlacements.push({ key, tiles: tiles.map(({ x, y }) => ({ x, y })) })
    }

    const DIRS = [{ dx: 0, dy: -1 }, { dx: 1, dy: 0 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }]
    const crabSet = new Set()
    allTiles.forEach(({ x, y }) => {
      DIRS.forEach(({ dx, dy }) => {
        const nx = x + dx, ny = y + dy
        if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE && !occupied.has(`${nx},${ny}`)) {
          crabSet.add(`${nx},${ny}`)
        }
      })
    })

    const grid = Array.from({ length: GRID_SIZE * GRID_SIZE }, () => ({ type: 'sand' }))
    allTiles.forEach(({ x, y, name }) => {
      grid[y * GRID_SIZE + x] = { type: 'treasure', name }
    })
    crabSet.forEach(k => {
      const [cx, cy] = k.split(',').map(Number)
      grid[cy * GRID_SIZE + cx] = { type: 'crab' }
    })

    return { grid, keyedPlacements }
  }

  function _buildGrid(keys) {
    const occupied = new Set()
    const placements = []
    const keyedPlacements = []

    for (const key of keys) {
      const formation = DIGGING_FORMATIONS[key]
      if (!formation?.length) continue

      const xs = formation.map(p => p.x)
      const ys = formation.map(p => p.y)
      const minFx = Math.min(...xs), maxFx = Math.max(...xs)
      const minFy = Math.min(...ys), maxFy = Math.max(...ys)

      const oxMin = -minFx
      const oxMax = GRID_SIZE - 1 - maxFx
      const oyMin = -minFy
      const oyMax = GRID_SIZE - 1 - maxFy

      if (oxMin > oxMax || oyMin > oyMax) continue

      for (let attempt = 0; attempt < 150; attempt++) {
        const ox = oxMin + Math.floor(Math.random() * (oxMax - oxMin + 1))
        const oy = oyMin + Math.floor(Math.random() * (oyMax - oyMin + 1))

        const tiles = formation.map(p => ({ x: ox + p.x, y: oy + p.y, name: p.name }))
        const valid = tiles.every(
          t => t.x >= 0 && t.x < GRID_SIZE && t.y >= 0 && t.y < GRID_SIZE && !occupied.has(`${t.x},${t.y}`)
        )

        if (valid) {
          tiles.forEach(t => {
            occupied.add(`${t.x},${t.y}`)
            placements.push(t)
          })
          keyedPlacements.push({ key, tiles: tiles.map(({ x, y }) => ({ x, y })) })
          break
        }
      }
    }

    // Place crabs on tiles adjacent to any treasure (if not already a treasure)
    const crabSet = new Set()
    const DIRS = [{ dx: 0, dy: -1 }, { dx: 1, dy: 0 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }]
    placements.forEach(({ x, y }) => {
      DIRS.forEach(({ dx, dy }) => {
        const nx = x + dx, ny = y + dy
        if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE && !occupied.has(`${nx},${ny}`)) {
          crabSet.add(`${nx},${ny}`)
        }
      })
    })

    const grid = Array.from({ length: GRID_SIZE * GRID_SIZE }, () => ({ type: 'sand' }))
    placements.forEach(({ x, y, name }) => {
      grid[y * GRID_SIZE + x] = { type: 'treasure', name }
    })
    crabSet.forEach(k => {
      const [cx, cy] = k.split(',').map(Number)
      grid[cy * GRID_SIZE + cx] = { type: 'crab' }
    })

    return { grid, keyedPlacements }
  }

  function startGame(allKeys, options = {}) {
    // When `exact` is requested, preserve the provided array as-is
    // (including duplicate entries). Previously this used `new Set()`
    // which removed duplicates from the practice-of-the-day list.
    const picked = options.exact
      ? (Array.isArray(allKeys) ? [...allKeys] : [allKeys])
      : pickPracticePatterns(allKeys)
    usedFormationKeys.value = picked
    const { grid, keyedPlacements } = _buildGrid(picked)
    hiddenGrid.value = grid
    formationPlacements.value = keyedPlacements
    revealedSet.value = new Set()
    digsMade.value = 0
    digHistory.value = []
    isGameOver.value = false
    isVictory.value = false
    roundCount.value++
  }

  function startGameFromPlacements(placements) {
    usedFormationKeys.value = placements.map(p => p.key)
    const { grid, keyedPlacements } = _buildGridFromPlacements(placements)
    hiddenGrid.value = grid
    formationPlacements.value = keyedPlacements
    revealedSet.value = new Set()
    digsMade.value = 0
    digHistory.value = []
    isGameOver.value = false
    isVictory.value = false
    roundCount.value++
  }

  function dig(index) {
    if (isGameOver.value || revealedSet.value.has(index)) return
    digHistory.value = [...digHistory.value, { index, at: Date.now() }]
    revealedSet.value = new Set([...revealedSet.value, index])
    digsMade.value++

    // Auto-win when every treasure is found
    const found = [...revealedSet.value].filter(i => hiddenGrid.value[i]?.type === 'treasure').length
    if (found > 0 && found === hiddenGrid.value.filter(t => t.type === 'treasure').length) {
      isGameOver.value = true
      isVictory.value = true
    }
  }

  function giveUp() {
    if (isGameOver.value) return
    isGameOver.value = true
    isVictory.value = false
  }

  function finishGame() {
    if (isGameOver.value) return
    isGameOver.value = true
    isVictory.value = true
  }

  // null = hidden, revealed tile, or ghosted (shown after game over without being dug)
  const displayTiles = computed(() =>
    hiddenGrid.value.map((tile, i) => {
      if (revealedSet.value.has(i)) return { ...tile, revealed: true }
      if (isGameOver.value) return { ...tile, ghosted: true }
      return null
    })
  )

  const treasuresFound = computed(() =>
    [...revealedSet.value].filter(i => hiddenGrid.value[i]?.type === 'treasure').length
  )

  const totalTreasures = computed(() =>
    hiddenGrid.value.filter(t => t.type === 'treasure').length
  )

  return {
    displayTiles,
    digsMade,
    isGameOver,
    isVictory,
    usedFormationKeys,
    roundCount,
    treasuresFound,
    totalTreasures,
    startGame,
    startGameFromPlacements,
    dig,
    giveUp,
    finishGame,
    hiddenGrid,
    digHistory,
    formationPlacements,
  }
}
