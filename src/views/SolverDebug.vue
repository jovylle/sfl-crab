<template>
  <div class="p-6 bg-base-200 min-h-screen">
    <h1 class="text-2xl font-bold mb-6">Solver Debug</h1>

    <!-- Real-land loader -->
    <div class="mb-8 bg-base-100 rounded-xl p-4 shadow">
      <h2 class="text-lg font-semibold mb-3">Live Land Loader</h2>
      <div class="flex gap-2 mb-3">
        <input
          v-model="liveLandId"
          type="text"
          placeholder="Land ID (e.g. 3321133018291793)"
          class="input input-bordered input-sm flex-1"
          @keydown.enter="loadLiveLand"
        />
        <button class="btn btn-sm btn-primary" :disabled="liveLoading" @click="loadLiveLand">
          {{ liveLoading ? 'Loading…' : 'Load' }}
        </button>
      </div>
      <p v-if="liveError" class="text-error text-sm mb-2">{{ liveError }}</p>

      <div v-if="liveResult">
        <div class="flex items-center gap-3 mb-2">
          <span class="font-mono text-sm opacity-70">Land {{ liveResult.id }}</span>
          <span class="badge badge-info badge-sm">live</span>
        </div>
        <p class="text-xs opacity-60 mb-2">
          patterns: {{ liveResult.patterns.join(', ') || '(none)' }}
        </p>

        <!-- Mini 10x10 grid -->
        <div class="grid grid-cols-10 gap-px mb-2" style="width: 300px">
          <div
            v-for="(cell, idx) in liveResult.cells"
            :key="idx"
            :class="['tile', cell.cls]"
            :title="cell.label"
            style="width:28px;height:28px;font-size:0.5rem;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;"
          >
            <img v-if="cell.src" :src="cell.src" alt="" class="tile-img pointer-events-none" />
            <span v-if="!cell.src" class="text-[0.45rem] leading-none">{{ cell.abbr }}</span>
          </div>
        </div>
        <p class="text-xs opacity-60">
          guaranteed: {{ liveResult.guaranteedCount }} cells
        </p>
      </div>
    </div>

    <!-- Scenario results -->
    <div v-for="s in results" :key="s.id" class="mb-10 bg-base-100 rounded-xl p-4 shadow">
      <div class="flex items-center gap-3 mb-3">
        <h2 class="text-lg font-semibold">{{ s.name }}</h2>
        <span :class="s.pass ? 'badge badge-success' : 'badge badge-error'">
          {{ s.pass ? 'PASS' : 'FAIL' }}
        </span>
      </div>

      <!-- Mini 10x10 grid -->
      <div class="grid grid-cols-10 gap-px mb-3" style="width: 300px">
        <div
          v-for="(cell, idx) in s.cells"
          :key="idx"
          :class="['tile', cell.cls]"
          :title="cell.label"
          style="width:28px;height:28px;font-size:0.5rem;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;"
        >
          <img v-if="cell.src" :src="cell.src" alt="" class="tile-img pointer-events-none" />
          <span v-if="!cell.src" class="text-[0.45rem] leading-none">{{ cell.abbr }}</span>
        </div>
      </div>

      <!-- Assertions list -->
      <ul class="text-sm space-y-0.5">
        <li v-for="a in s.assertions" :key="a.label" :class="a.ok ? 'text-success' : 'text-error'">
          {{ a.ok ? '✓' : '✗' }} {{ a.label }}
          <span v-if="!a.ok"> (got {{ a.got }})</span>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { solveTreasures } from '@/utils/treasureSolver.js'
import { gridArrayToTiles } from '@/utils/gridTileTransform.js'
import { SOLVER_SCENARIOS } from '@/dev/solverScenarios.js'

const SLUG_ABBR = {
  camel_bone: 'CB', salt_dino_egg: 'SDE', cockle_shell: 'CK',
  clam_shell: 'CS', vase: 'V', hieroglyph: 'H', seaweed: 'SW',
  wooden_compass: 'WC', wood: 'WD', old_bottle: 'OB',
  sea_cucumber: 'SC', pipi: 'Pi',
}

const G = 10

function evalScenario(scenario) {
  const tiles = gridArrayToTiles(scenario.grid, G)
  const { guaranteed, guaranteedSlugs } = solveTreasures(tiles, scenario.patterns, G)

  const cells = Array.from({ length: G * G }, (_, idx) => {
    const tileClasses = tiles[idx] || []
    const flat = [].concat(tileClasses).join(' ')
    const isSand = flat.includes('sand')
    const isCrab = flat.includes('crab')
    const isTreasure = flat.includes('actual-treasure')
    const isGuaranteed = guaranteed.has(idx)
    const slug = guaranteedSlugs.get(idx) ?? ''

    let cls = ''
    let abbr = ''
    let src = ''
    if (isSand) { cls = 'sand'; abbr = 'S'; src = '/world/sand.webp' }
    else if (isCrab) { cls = 'crab'; abbr = 'C'; src = '/world/crab.webp' }
    else if (isTreasure) {
      cls = 'treasure'
      const imgTok = flat.split(' ').find(t => t.startsWith('tileImage:'))
      const s = imgTok ? imgTok.slice('tileImage:'.length) : ''
      abbr = SLUG_ABBR[s] ?? s.slice(0, 3).toUpperCase()
      if (s) src = `/world/${s}.webp`
    } else if (isGuaranteed) {
      cls = 'predicted-guaranteed'
      abbr = slug ? (SLUG_ABBR[slug] ?? slug.slice(0, 3).toUpperCase()) : '?'
      if (slug) src = `/world/${slug}.webp`
    }

    return { cls, abbr, label: `idx ${idx}`, src }
  })

  const assertions = scenario.assertions.map(a => {
    let got, ok
    if (a.property === 'guaranteed') {
      got = guaranteed.has(a.idx)
      ok = got === a.expected
    } else if (a.property === 'slug') {
      got = guaranteedSlugs.get(a.idx)
      ok = got === a.expected
    } else {
      got = undefined
      ok = false
    }
    return { ...a, got, ok }
  })

  return {
    id: scenario.id,
    name: scenario.name,
    pass: assertions.every(a => a.ok),
    cells,
    assertions,
  }
}

function buildCells(tiles, guaranteed, guaranteedSlugs) {
  return Array.from({ length: G * G }, (_, idx) => {
    const tileClasses = tiles[idx] || []
    const flat = [].concat(tileClasses).join(' ')
    const isSand = flat.includes('sand')
    const isCrab = flat.includes('crab')
    const isTreasure = flat.includes('actual-treasure')
    const isGuaranteed = guaranteed.has(idx)
    const slug = guaranteedSlugs.get(idx) ?? ''

    let cls = ''
    let abbr = ''
    let src = ''
    if (isSand) { cls = 'sand'; abbr = 'S'; src = '/world/sand.webp' }
    else if (isCrab) { cls = 'crab'; abbr = 'C'; src = '/world/crab.webp' }
    else if (isTreasure) {
      cls = 'treasure'
      const imgTok = flat.split(' ').find(t => t.startsWith('tileImage:'))
      const s = imgTok ? imgTok.slice('tileImage:'.length) : ''
      abbr = SLUG_ABBR[s] ?? s.slice(0, 3).toUpperCase()
      if (s) src = `/world/${s}.webp`
    } else if (isGuaranteed) {
      cls = 'predicted-guaranteed'
      abbr = slug ? (SLUG_ABBR[slug] ?? slug.slice(0, 3).toUpperCase()) : '?'
      if (slug) src = `/world/${slug}.webp`
    }

    return { cls, abbr, label: `idx ${idx} ${slug || ''}`.trim(), src }
  })
}

const liveLandId = ref('')
const liveLoading = ref(false)
const liveError = ref('')
const liveResult = ref(null)

async function loadLiveLand() {
  const id = liveLandId.value.trim()
  if (!id) return
  liveLoading.value = true
  liveError.value = ''
  liveResult.value = null
  try {
    const url = `/.netlify/functions/sfl-api/community/farms/${id}`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    const digging = data?.farm?.desert?.digging || data?.desert?.digging || {}
    const rawGrid = digging.grid || []
    const patterns = digging.patterns || []
    const tiles = gridArrayToTiles(rawGrid, G)
    const { guaranteed, guaranteedSlugs } = solveTreasures(tiles, patterns, G)
    liveResult.value = {
      id,
      patterns,
      cells: buildCells(tiles, guaranteed, guaranteedSlugs),
      guaranteedCount: guaranteed.size,
    }
  } catch (err) {
    liveError.value = err?.message || 'Failed to load land data.'
  } finally {
    liveLoading.value = false
  }
}

const results = ref([])
onMounted(() => {
  results.value = SOLVER_SCENARIOS.map(evalScenario)
})
</script>
