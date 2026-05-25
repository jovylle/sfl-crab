<template>
  <DiggingPageLayout>
    <template #toolbar>
      <p class="text-[0.65rem] text-base-content/60 text-center m-0">
        Unofficial training simulator — no in-game rewards. No data pulled from the live game.
      </p>

      <div class="flex flex-col gap-2 mt-1.5">
        <div class="flex items-center justify-center gap-2 flex-wrap">
          <h2 class="text-sm sm:text-base font-semibold m-0">
            Practice Mode
            <span class="badge badge-secondary badge-sm">Round {{ roundCount }}</span>
          </h2>
        </div>

        <div class="flex flex-wrap gap-2 justify-center items-center">
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
          <label class="label cursor-pointer gap-1 py-0">
            <input v-model="saveScores" type="checkbox" class="checkbox checkbox-xs" />
            <span class="label-text text-xs">Save score</span>
          </label>
          <button
            class="btn btn-sm btn-primary"
            :disabled="isLoading || isStartingTodayRound || todayRoundCooldownActive"
            @click="newTodayRound"
          >
            <span v-if="isStartingTodayRound" class="loading loading-spinner loading-xs"></span>
            <span v-else-if="todayRoundCooldownActive">
              Retry later
            </span>
            <span v-else>
              Today&apos;s Patterns ↺
            </span>
          </button>
          <button class="btn btn-sm btn-secondary" @click="newRandomRound">
            Random Round
          </button>
        </div>

        <div class="flex flex-wrap gap-2 justify-center items-center">
          <input
            v-model="nickname"
            type="text"
            maxlength="32"
            placeholder="Nickname (optional)"
            class="input input-bordered input-xs w-36"
          />
          <span class="text-xs text-base-content/40">shown on the hub</span>
        </div>
      </div>
    </template>

    <template #grid>
      <div class="flex flex-col gap-2">
        <div
          v-if="isLoading || isStartingTodayRound"
          class="flex justify-center text-xs text-base-content/60"
        >
          <span class="loading loading-dots loading-xs"></span>
        </div>

        <div v-if="todayRoundErrorMessage || error" class="alert alert-warning py-2 text-xs">
          <span v-if="todayRoundErrorMessage">{{ todayRoundErrorMessage }}</span>
          <span v-else>{{ error }}</span>
          <span class="block">
            Use <strong>Random Round</strong> for now.
          </span>
          <span v-if="todayRoundCooldownActive" class="block">
            Retry available in <strong>5s</strong>.
          </span>
        </div>

        <div class="flex items-center justify-center gap-3 sm:gap-4 text-sm flex-wrap">
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

        <div v-if="isGameOver" class="alert py-2 text-sm gap-2" :class="bannerClass">
          <div class="flex flex-col gap-1 w-full">
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
            <div v-if="saveScores" class="flex items-center gap-2 mt-0.5">
              <router-link
                v-if="lastRunId"
                :to="{ name: 'PublicPracticeRun', params: { id: lastRunId } }"
                class="btn btn-xs btn-ghost underline"
                target="_blank"
              >
                View &amp; share run
              </router-link>
              <span v-else class="text-xs opacity-60 italic">Saving to hub…</span>
            </div>
          </div>
        </div>

        <PracticeGrid
          :key="`round-${roundCount}`"
          :tiles="displayTiles"
          :hidden-grid="hiddenGrid"
          :game-over="isGameOver"
          :loading="isStartingTodayRound"
          @auto-finish="finishGame"
          @dig="dig"
        />

        <div class="flex gap-3 text-[0.65rem] text-base-content/50 flex-wrap justify-center">
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
    </template>

    <template #patterns>
      <PracticePatterns :pattern-keys="usedFormationKeys" />
    </template>

    <InfoFooter :show-what-is-this="false" :show-features="false" />
  </DiggingPageLayout>
</template>

<script setup>
import { computed, onMounted, onUnmounted, nextTick, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import DiggingPageLayout from '@/components/DiggingPageLayout.vue'
import { usePracticeEngine } from '@/composables/usePracticeEngine.js'
import { usePracticePatterns } from '@/composables/usePracticePatterns.js'
import { useReliableAssets } from '@/composables/useReliableAssets.js'
import { DIGGING_FORMATIONS } from '@/data/game/diggingFormations.js'
import PracticeGrid from '@/components/PracticeGrid.vue'
import PracticePatterns from '@/components/PracticePatterns.vue'
import InfoFooter from '@/components/InfoFooter.vue'
import { submitPracticeRun, isPracticeSaveScoresEnabled, setPracticeSaveScoresEnabled, getNickname, setNickname } from '@/services/practiceHubService.js'
import { getTodayUTC } from '@/utils/buildDigTimeline.js'
import { buildPracticeDigTimeline } from '@/utils/buildPracticeDigTimeline.js'

const ALL_FORMATION_KEYS = Object.keys(DIGGING_FORMATIONS)

const {
  displayTiles,
  digsMade,
  isGameOver,
  isVictory,
  usedFormationKeys,
  hiddenGrid,
  digHistory,
  formationPlacements,
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
  isLoading,
  patternKeys,
  refreshPracticePatterns,
} = usePracticePatterns()

const isStartingTodayRound = ref(false)
const MIN_TODAY_ROUND_LOADING_MS = 450
const TODAY_ROUND_ERROR_COOLDOWN_MS = 5000
const todayRoundCooldownActive = ref(false)
const todayRoundErrorMessage = ref('')
const showTimer = ref(true)
const saveScores = ref(isPracticeSaveScoresEnabled())
const nickname = ref(getNickname())
const lastRunId = ref(null)
const elapsedMs = ref(0)
const finalElapsedMs = ref(0)
const roundStartedAt = ref(Date.now())
const patternSource = ref('daily')
const patternDate = ref(getTodayUTC())
const lastSubmittedRound = ref(0)
let timerId = null

const practicePatternKeys = computed(() => {
  return patternKeys.value.length ? patternKeys.value : ALL_FORMATION_KEYS
})

const liveTimerText = computed(() => formatElapsed(elapsedMs.value))
const finalTimerText = computed(() => formatElapsed(finalElapsedMs.value || elapsedMs.value))
let todayRoundCooldownTimerId = null

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

function stopTodayRoundCooldown () {
  if (todayRoundCooldownTimerId !== null) {
    clearTimeout(todayRoundCooldownTimerId)
    todayRoundCooldownTimerId = null
  }
  todayRoundCooldownActive.value = false
}

function startTimer () {
  stopTimer()
  if (!showTimer.value) return
  if (isGameOver.value) {
    elapsedMs.value = finalElapsedMs.value || elapsedMs.value
    return
  }

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

  if (roundCount.value === lastSubmittedRound.value) return
  lastSubmittedRound.value = roundCount.value
  lastRunId.value = null

  const digs = buildPracticeDigTimeline(digHistory.value, hiddenGrid.value)

  void submitPracticeRun({
    patternSource: patternSource.value,
    patternDate: patternSource.value === 'daily' ? patternDate.value : null,
    patternKeys: [...usedFormationKeys.value],
    digCount: digsMade.value,
    durationMs: finalElapsedMs.value,
    victory: isVictory.value,
    treasureCount: totalTreasures.value,
    digs,
    formations: formationPlacements.value,
  }).then(data => {
    if (data?.id) lastRunId.value = data.id
  }).catch(() => {
    /* optional hub save — ignore failures */
  })
})

watch(saveScores, enabled => {
  setPracticeSaveScoresEnabled(enabled)
})

watch(nickname, val => {
  setNickname(val)
})

async function newTodayRound () {
  if (isStartingTodayRound.value || todayRoundCooldownActive.value) return

  isStartingTodayRound.value = true
  const startedAt = Date.now()
  todayRoundErrorMessage.value = ''
  patternSource.value = 'daily'
  patternDate.value = getTodayUTC()

  try {
    lastRunId.value = null
    await nextTick()
    await refreshPracticePatterns()
    startGame(practicePatternKeys.value, { exact: true })
    resetRoundTimer()
  } catch {
    todayRoundErrorMessage.value = "Today's pattern round failed to load."
    stopTodayRoundCooldown()
    todayRoundCooldownActive.value = true
    todayRoundCooldownTimerId = setTimeout(() => {
      todayRoundCooldownActive.value = false
      todayRoundCooldownTimerId = null
    }, TODAY_ROUND_ERROR_COOLDOWN_MS)
    newRandomRound({ preserveFailureState: true })
  } finally {
    const elapsed = Date.now() - startedAt
    const remaining = MIN_TODAY_ROUND_LOADING_MS - elapsed
    if (remaining > 0) {
      await new Promise(resolve => setTimeout(resolve, remaining))
    }
    isStartingTodayRound.value = false
  }
}

function newRandomRound ({ preserveFailureState = false } = {}) {
  if (!preserveFailureState) {
    todayRoundErrorMessage.value = ''
    stopTodayRoundCooldown()
  }
  lastRunId.value = null
  patternSource.value = 'random'
  patternDate.value = getTodayUTC()
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
  stopTodayRoundCooldown()
})
</script>
