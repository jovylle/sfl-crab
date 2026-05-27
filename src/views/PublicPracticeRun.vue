<template>
  <section class="public-practice-run w-full max-w-3xl mx-auto text-left">
    <div class="card bg-base-100 shadow">
      <div class="card-body gap-4">

        <div v-if="loadState === 'loading'" class="flex justify-center py-12">
          <span class="loading loading-spinner loading-lg" />
        </div>

        <div v-else-if="loadState === 'error'" class="alert alert-error">
          <span>{{ errorMessage }}</span>
        </div>

        <template v-else>
          <header class="space-y-2">
            <p class="text-xs uppercase tracking-wide text-base-content/50 m-0">
              Practice run
            </p>
            <h1 class="card-title text-xl sm:text-2xl m-0">
              {{ run.nickname || 'Anonymous' }}
              <span
                class="badge badge-sm font-normal"
                :class="run.patternSource === 'daily' ? 'badge-primary' : 'badge-secondary'"
              >
                {{ run.patternSource === 'daily' ? 'Daily' : 'Random' }}
              </span>
              <span v-if="run.patternSource === 'daily' && run.patternDate" class="font-normal text-base-content/60 text-base">
                · {{ run.patternDate }}
              </span>
            </h1>

            <div class="flex flex-wrap gap-3 text-sm text-base-content/70">
              <span>
                <strong :class="run.victory ? 'text-success' : 'text-warning'">
                  {{ run.victory ? 'Victory' : 'Gave up' }}
                </strong>
              </span>
              <span>{{ run.digCount }} digs</span>
              <span v-if="run.treasureCount != null">{{ run.treasureCount }} treasures</span>
              <span v-if="run.durationMs">{{ formatDuration(run.durationMs) }}</span>
            </div>

            <p class="text-xs text-base-content/40 m-0">
              Final grid — no step replay.
            </p>
          </header>

          <div class="flex flex-wrap gap-2 items-center justify-between">
            <label class="label cursor-pointer gap-2 py-0">
              <input v-model="showOrder" type="checkbox" class="checkbox checkbox-sm" />
              <span class="label-text text-sm">Show dig order</span>
            </label>
            <label class="label cursor-pointer gap-2 py-0">
              <input v-model="showLabels" type="checkbox" class="checkbox checkbox-sm" />
              <span class="label-text text-sm">Show item names</span>
            </label>
            <button class="btn btn-xs btn-outline" @click="copyShareUrl">
              {{ copied ? 'Copied!' : 'Copy share link' }}
            </button>
          </div>

          <PublicDigGrid
            :cells="gridView.cells"
            :cell-items="gridView.cellItems"
            :treasure-order-map="gridView.treasureOrderMap"
            :show-treasure-order="showOrder"
            :show-item-labels="showLabels"
          />

          <div v-if="run.patternKeys?.length" class="space-y-2">
            <h2 class="text-sm font-semibold m-0">Patterns in this round</h2>
            <div class="flex flex-wrap gap-3">
              <div
                v-for="(key, i) in run.patternKeys"
                :key="i"
                class="flex flex-col items-center gap-1"
              >
                <div class="pattern-preview-sm bg-base-200 rounded p-1">
                  <div
                    class="grid"
                    style="grid-template-columns: repeat(4, 1fr); gap: 1px; width: 52px; height: 52px;"
                  >
                    <div
                      v-for="cell in 16"
                      :key="cell"
                      class="flex items-center justify-center"
                    >
                      <img
                        v-if="getPlotAt(key, cell)"
                        :src="getImageSrc(getImageUrl(getPlotAt(key, cell).name)).value"
                        :alt="getPlotAt(key, cell).name"
                        class="w-full h-full object-contain"
                      />
                    </div>
                  </div>
                </div>
                <span class="text-xs text-base-content/60 text-center leading-tight max-w-[60px]">
                  {{ formatKey(key) }}
                </span>
              </div>
            </div>
          </div>

          <div class="flex flex-wrap gap-2 items-center border-t border-base-300 pt-4">
            <router-link :to="{ name: 'Practice' }" class="btn btn-outline btn-sm">
              Try a new round
            </router-link>
            <router-link
              v-if="run.formations?.length"
              :to="{ name: 'Practice', query: { run: runId } }"
              class="btn btn-primary btn-sm"
            >
              Play this exact grid
            </router-link>
            <span
              v-else
              class="text-xs text-base-content/40 italic"
            >
              (Grid replay not available for this run)
            </span>
          </div>
        </template>

      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import PublicDigGrid from '@/components/PublicDigGrid.vue'
import { fetchPracticeRun } from '@/services/practiceRunApiService.js'
import { buildPublicDigView } from '@/utils/buildPublicDigGrid.js'
import { DIGGING_FORMATIONS } from '@/data/game/diggingFormations.js'
import { useReliableAssets } from '@/composables/useReliableAssets.js'

const route = useRoute()
const { getImageSrc } = useReliableAssets()

const runId = computed(() => String(route.params.id || ''))

const loadState = ref('loading')
const errorMessage = ref('')
const run = ref({})
const showOrder = ref(true)
const showLabels = ref(false)
const copied = ref(false)

const gridView = computed(() => buildPublicDigView(run.value.digs || []))

async function loadRun () {
  if (!runId.value) {
    loadState.value = 'error'
    errorMessage.value = 'Missing run ID'
    return
  }

  loadState.value = 'loading'
  errorMessage.value = ''

  try {
    run.value = await fetchPracticeRun(runId.value)
    loadState.value = 'ready'
  } catch (err) {
    loadState.value = 'error'
    errorMessage.value = err?.message || 'Failed to load practice run'
  }
}

function formatDuration (ms) {
  const totalSeconds = Math.floor(ms / 1000)
  const m = String(Math.floor(totalSeconds / 60)).padStart(2, '0')
  const s = String(totalSeconds % 60).padStart(2, '0')
  return `${m}:${s}`
}

async function copyShareUrl () {
  try {
    await navigator.clipboard.writeText(window.location.href)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  } catch {
    /* ignore */
  }
}

// Pattern preview helpers (same logic as PracticePatterns.vue)
const GRID_SIZE = 4

function formatKey (key) {
  return key.toLowerCase().split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

function getFormationBounds (formation) {
  if (!formation?.length) return { minX: 0, minY: 0, width: 0, height: 0 }
  const xs = formation.map(p => p.x)
  const ys = formation.map(p => p.y)
  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    width: Math.max(...xs) - Math.min(...xs) + 1,
    height: Math.max(...ys) - Math.min(...ys) + 1,
  }
}

function getPreviewOffset (formation) {
  const { minX, minY, width, height } = getFormationBounds(formation)
  return {
    x: Math.floor((GRID_SIZE - width) / 2) - minX,
    y: Math.floor((GRID_SIZE - height) / 2) - minY,
  }
}

function getPlotAt (key, cellIndex) {
  const formation = DIGGING_FORMATIONS[key] || []
  const idx = cellIndex - 1
  const col = idx % GRID_SIZE
  const row = Math.floor(idx / GRID_SIZE)
  const offset = getPreviewOffset(formation)
  const x = col - offset.x
  const y = row - offset.y
  return formation.find(p => p.x === x && p.y === y) || null
}

function getImageUrl (name) {
  return `/world/${name.toLowerCase().replace(/\s+/g, '_')}.webp`
}

watch(runId, loadRun, { immediate: true })
</script>
