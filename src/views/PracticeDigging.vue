<template>
  <div class="flex [@media(max-width:639px)]:flex-col lg:gap-4 justify-center">
    <div
      class="card w-full min-w-[260px] sm:min-w-[300px] flex-1 max-w-md md:max-w-xl sm:basis-[410px] mx-auto sm:mx-0"
    >
      <div class="card-body [@media(max-width:639px)]:px-3 [@media(max-width:639px)]:pt-1">

        <!-- Header row -->
        <div class="flex items-center justify-between gap-2 flex-wrap">
          <h2 class="card-title text-sm sm:text-base">
            Practice Mode
            <span class="badge badge-secondary badge-sm">Round {{ roundCount }}</span>
          </h2>
          <div class="flex gap-2 flex-wrap">
            <button
              v-if="!isGameOver"
              class="btn btn-sm btn-warning"
              @click="giveUp"
            >
              Give Up
            </button>
            <button
              class="btn btn-sm btn-outline"
              :class="showTimer ? 'btn-success' : ''"
              @click="showTimer = !showTimer"
            >
              {{ showTimer ? 'Hide Timer' : 'Show Timer' }}
            </button>
            <button
              class="btn btn-sm btn-primary"
              :disabled="isLoading || isStartingTodayRound"
              @click="newTodayRound"
            >
              <span v-if="isStartingTodayRound" class="loading loading-spinner loading-xs"></span>
              <span>{{ isStartingTodayRound ? "Loading today's round" : "New Today's Pattern Round ↺" }}</span>
            </button>
            <button class="btn btn-sm btn-secondary" @click="newRandomRound">
              New Random Pattern Round
            </button>
          </div>
        </div>

        <div class="flex items-center justify-between gap-2 text-xs text-base-content/60">
          <!-- <span>
            Today's shared patterns
            <span v-if="isCachedForToday" class="badge badge-outline badge-xs ml-1">cached</span>
          </span> -->
          <span v-if="isLoading || isStartingTodayRound" class="loading loading-dots loading-xs"></span>
        </div>

        <div v-if="error" class="alert alert-warning py-2 text-xs">
          {{ error }}
          <span v-if="!patternKeys.length" class="block">
            Falling back to the full practice set until the cache refreshes.
          </span>
        </div>

        <!-- Live stats -->
        <div class="flex items-center gap-4 text-sm">
          <span>
            Digs: <strong class="text-lg">{{ digsMade }}</strong>
          </span>
          <span>
            Treasures:
            <strong :class="treasuresFound > 0 ? 'text-success' : ''">{{ treasuresFound }}</strong>
            / {{ totalTreasures }}
          </span>
          <span v-if="showTimer" class="badge badge-outline font-mono">
            {{ liveTimerText }}
          </span>
          <span class="text-base-content/50 text-xs">lower digs = better</span>
        </div>

        <!-- Game over / victory banner -->
        <div v-if="isGameOver" class="alert py-2 text-sm gap-2" :class="bannerClass">
          <span v-if="isVictory">
            🎉 Found all {{ totalTreasures }} treasure{{ totalTreasures !== 1 ? 's' : '' }} in
            <strong>{{ digsMade }} dig{{ digsMade !== 1 ? 's' : '' }}</strong>!
            <span v-if="showTimer" class="ml-1">
              Time: <strong class="font-mono">{{ finalTimerText }}</strong>.
            </span>
            <span v-if="digsMade <= totalTreasures + 2"> Impressive!</span>
          </span>
          <span v-else>
            Round over — found
            <strong>{{ treasuresFound }}</strong> / {{ totalTreasures }} in
            <strong>{{ digsMade }}</strong> digs.
            <span v-if="showTimer" class="ml-1">
              Time: <strong class="font-mono">{{ finalTimerText }}</strong>.
            </span>
            Ghosted tiles show what was hidden.
          </span>
        </div>

        <!-- Practice grid — keyed by round so it fully remounts each game -->
        <PracticeGrid
          :key="`round-${roundCount}`"
          :tiles="displayTiles"
          :hidden-grid="hiddenGrid"
          :game-over="isGameOver"
          :loading="isStartingTodayRound"
          @auto-finish="finishGame"
          @dig="dig"
        />

        <!-- Legend + controls hint -->
        <div class="flex gap-3 text-[0.65rem] text-base-content/50 mt-1 flex-wrap justify-center">
          <span class="flex items-center gap-1">
            <Icon icon="noto:shovel" class="w-3.5 h-3.5" /> Click to dig
          </span>
          <span class="flex items-center gap-1">
            <Icon icon="noto:crab" class="w-3.5 h-3.5" /> Crab
          </span>
          <span class="flex items-center gap-1">
            <img
              :src="getImageSrc('/my_images/sand.png').value"
              alt="Sand"
              class="w-3.5 h-3.5 object-contain"
            />
            Sand
          </span>
          <span class="flex items-center gap-1 text-base-content/30">
            Right-click to mark
          </span>
        </div>

      </div>
    </div>

    <!-- Right: pattern reference for this round -->
    <PracticePatterns :pattern-keys="usedFormationKeys" />
  </div>

  <div>
    <InfoFooter :show-what-is-this="false" :show-features="false" />
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, nextTick, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { usePracticeEngine } from '@/composables/usePracticeEngine.js'
import { usePracticePatterns } from '@/composables/usePracticePatterns.js'
import { useReliableAssets } from '@/composables/useReliableAssets.js'
import { DIGGING_FORMATIONS } from '@/data/game/diggingFormations.js'
import PracticeGrid from '@/components/PracticeGrid.vue'
import PracticePatterns from '@/components/PracticePatterns.vue'
import InfoFooter from '@/components/InfoFooter.vue'

const ALL_FORMATION_KEYS = Object.keys(DIGGING_FORMATIONS)

const {
  displayTiles,
  digsMade,
  isGameOver,
  isVictory,
  usedFormationKeys,
  hiddenGrid,
  roundCount,
  treasuresFound,
  totalTreasures,
  startGame,
  dig,
  giveUp,
  finishGame,
} = usePracticeEngine()

const { getImageSrc } = useReliableAssets()
const {
  error,
  isCachedForToday,
  isLoading,
  patternKeys,
  refreshPracticePatterns,
} = usePracticePatterns()

const isStartingTodayRound = ref(false)
const MIN_TODAY_ROUND_LOADING_MS = 450
const showTimer = ref(false)
const elapsedMs = ref(0)
const finalElapsedMs = ref(0)
const roundStartedAt = ref(Date.now())
let timerId = null

const practicePatternKeys = computed(() => {
  return patternKeys.value.length ? patternKeys.value : ALL_FORMATION_KEYS
})

const liveTimerText = computed(() => formatElapsed(elapsedMs.value))
const finalTimerText = computed(() => formatElapsed(finalElapsedMs.value || elapsedMs.value))

function formatElapsed(value) {
  const totalSeconds = Math.floor(value / 1000)
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0')
  const seconds = String(totalSeconds % 60).padStart(2, '0')
  return `${minutes}:${seconds}`
}

function stopTimer () {
  if (timerId !== null) {
    clearInterval(timerId)
    timerId = null
  }
}

function startTimer () {
  stopTimer()
  if (!showTimer.value) return

  elapsedMs.value = Date.now() - roundStartedAt.value
  timerId = setInterval(() => {
    elapsedMs.value = Date.now() - roundStartedAt.value
  }, 1000)
}

function resetRoundTimer () {
  roundStartedAt.value = Date.now()
  elapsedMs.value = 0
  finalElapsedMs.value = 0
  startTimer()
}

watch(showTimer, () => {
  if (showTimer.value) {
    startTimer()
  } else {
    stopTimer()
  }
})

watch(isGameOver, done => {
  if (!done) return

  finalElapsedMs.value = Date.now() - roundStartedAt.value
  elapsedMs.value = finalElapsedMs.value
  stopTimer()
})

async function newTodayRound () {
  if (isStartingTodayRound.value) return

  isStartingTodayRound.value = true
  const startedAt = Date.now()

  try {
    await nextTick()
    await refreshPracticePatterns()
    startGame(practicePatternKeys.value, { exact: true })
    resetRoundTimer()
  } catch {
    // If the network is unavailable and no cache exists yet, use the local fallback set.
    startGame(practicePatternKeys.value, { exact: true })
    resetRoundTimer()
  } finally {
    const elapsed = Date.now() - startedAt
    const remaining = MIN_TODAY_ROUND_LOADING_MS - elapsed
    if (remaining > 0) {
      await new Promise(resolve => setTimeout(resolve, remaining))
    }
    isStartingTodayRound.value = false
  }
}

function newRandomRound () {
  startGame(ALL_FORMATION_KEYS)
  resetRoundTimer()
}

const bannerClass = computed(() => {
  if (isVictory.value) return 'alert-success'
  if (treasuresFound.value > 0) return 'alert-info'
  return 'alert-warning'
})

onMounted(() => {
  void newTodayRound()
})

onUnmounted(() => {
  stopTimer()
})
</script>
