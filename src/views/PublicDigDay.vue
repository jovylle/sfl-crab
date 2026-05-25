<template>
  <section class="public-dig-day w-full max-w-3xl mx-auto text-left">
    <div class="card bg-base-100 shadow">
      <div class="card-body gap-4">
        <header class="space-y-2">
          <p class="text-xs uppercase tracking-wide text-base-content/50 m-0">
            Public dig day
          </p>
          <h1 class="card-title text-xl sm:text-2xl m-0">
            Land {{ landId }}
            <span v-if="displayName" class="font-normal text-base-content/70">
              · {{ displayName }}
            </span>
          </h1>
          <p class="text-sm text-base-content/70 m-0">
            {{ utcDate }} (UTC) · {{ digCount }} digs
            <span v-if="stats?.treasureCount != null">
              · {{ stats.treasureCount }} treasures
            </span>
          </p>
          <p class="text-xs text-base-content/50 m-0">
            Final grid for this day — not a step-by-step replay.
          </p>
        </header>

        <div
          v-if="loadState === 'loading'"
          class="flex justify-center py-12"
        >
          <span class="loading loading-spinner loading-lg" />
        </div>

        <div
          v-else-if="loadState === 'error'"
          class="alert alert-error"
        >
          <span>{{ errorMessage }}</span>
        </div>

        <div
          v-else-if="loadState === 'empty'"
          class="alert alert-info"
        >
          <span>No saved dig day for this land and date yet.</span>
        </div>

        <template v-else>
          <div class="flex flex-wrap gap-2 items-center justify-between">
            <label class="label cursor-pointer gap-2 py-0">
              <input
                v-model="showOrder"
                type="checkbox"
                class="checkbox checkbox-sm"
              />
              <span class="label-text text-sm">Show dig order</span>
            </label>
            <label class="label cursor-pointer gap-2 py-0">
              <input
                v-model="showLabels"
                type="checkbox"
                class="checkbox checkbox-sm"
              />
              <span class="label-text text-sm">Show item names</span>
            </label>
          </div>

          <PublicDigGrid
            :cells="gridView.cells"
            :cell-items="gridView.cellItems"
            :treasure-order-map="gridView.treasureOrderMap"
            :show-treasure-order="showOrder"
            :show-item-labels="showLabels"
          />
        </template>

        <div class="flex flex-wrap gap-2 items-end border-t border-base-300 pt-4">
          <label class="form-control w-full max-w-xs">
            <span class="label-text text-xs">UTC date</span>
            <input
              v-model="dateInput"
              type="date"
              class="input input-bordered input-sm"
              @change="goToDate"
            />
          </label>
          <router-link
            :to="diggingLink"
            class="btn btn-primary btn-sm"
          >
            Open digging assistant
          </router-link>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PublicDigGrid from '@/components/PublicDigGrid.vue'
import { fetchDigDay } from '@/services/digDayApiService.js'
import { buildPublicDigView } from '@/utils/buildPublicDigGrid.js'
import { getTodayUTC } from '@/utils/buildDigTimeline.js'
import { landDiggingPath } from '@/utils/landRoutes.js'
import { hasTestnetQuery } from '@/utils/testnet.js'

const route = useRoute()
const router = useRouter()

const landId = computed(() => String(route.params.landId || ''))
const utcDate = computed(() => {
  const q = String(route.query.date || '').trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(q)) return q
  return getTodayUTC()
})

const loadState = ref('loading')
const errorMessage = ref('')
const digs = ref([])
const markEvents = ref([])
const stats = ref(null)
const displayName = ref(null)
const showOrder = ref(true)
const showLabels = ref(true)
const dateInput = ref(utcDate.value)

const gridView = computed(() =>
  buildPublicDigView(digs.value, markEvents.value)
)
const digCount = computed(() => gridView.value.digCount)

const diggingLink = computed(() => ({
  path: landDiggingPath(landId.value, {
    test: hasTestnetQuery(route.query, route.fullPath),
  }),
}))

async function loadSnapshot () {
  if (!landId.value) {
    loadState.value = 'error'
    errorMessage.value = 'Missing land ID'
    return
  }

  loadState.value = 'loading'
  errorMessage.value = ''

  try {
    const remote = await fetchDigDay(landId.value, utcDate.value)
    dateInput.value = utcDate.value

    if (!remote?.digs?.length) {
      digs.value = []
      markEvents.value = remote?.markEvents || []
      stats.value = remote?.stats || null
      displayName.value = remote?.displayName || null
      loadState.value = 'empty'
      return
    }

    digs.value = remote.digs
    markEvents.value = remote.markEvents || []
    stats.value = remote.stats || null
    displayName.value = remote?.displayName || null
    loadState.value = 'ready'
  } catch (err) {
    loadState.value = 'error'
    errorMessage.value = err?.message || 'Failed to load dig day'
  }
}

function goToDate () {
  const d = dateInput.value
  if (!d || d === utcDate.value) return
  router.push({
    name: 'PublicDigDay',
    params: { landId: landId.value },
    query: { ...route.query, date: d },
  })
}

watch([landId, utcDate], loadSnapshot, { immediate: true })
</script>
