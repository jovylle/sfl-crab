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
            <span v-if="isReplayMode" class="badge badge-accent badge-sm">Shared Grid</span>
          </h2>
        </div>

        <div class="flex flex-wrap gap-2 justify-center items-center">
          <button
            v-if="!isGameOver && !resumePromptVisible"
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
            class="btn btn-sm btn-outline"
            :class="showPrediction ? 'btn-info' : ''"
            @click="showPrediction = !showPrediction"
          >
            {{ showPrediction ? 'Hide Prediction' : 'Prediction' }}
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

        <div
          v-if="usedFormationKeys.length && !resumePromptVisible"
          class="flex flex-wrap gap-2 justify-center items-center"
        >
          <button class="btn btn-sm btn-outline" @click="retrySamePatterns">
            Retry patterns ↺
          </button>
          <button class="btn btn-sm btn-outline" @click="retrySameBoard">
            Retry same board ↺
          </button>
          <button class="btn btn-sm btn-outline" @click="copyBoardLink">
            {{ boardLinkCopied ? 'Copied!' : 'Copy board link' }}
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
        <div v-if="resumePromptVisible" class="alert alert-info py-3 text-sm">
          <div class="flex flex-col gap-2 w-full">
            <span class="font-medium">You have an unfinished round. Resume where you left off?</span>
            <span class="text-xs opacity-70">Only your digs are restored (hint marks are not).</span>
            <div class="flex gap-2 flex-wrap">
              <button class="btn btn-sm btn-primary" @click="resumeSavedRound(readInProgressRound())">
                Resume
              </button>
              <button class="btn btn-sm btn-ghost" @click="discardSavedRound">
                Start new round
              </button>
            </div>
          </div>
        </div>

        <template v-if="!resumePromptVisible">
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
          :show-prediction="showPrediction"
          :pattern-keys="usedFormationKeys"
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
        </template>
      </div>
    </template>

    <template #patterns>
      <PracticePatterns :pattern-keys="usedFormationKeys" />
    </template>

    <InfoFooter :show-features="false" :hide-build-hash="true" />
  </DiggingPageLayout>
</template>

<script setup>
import { computed, onMounted, onUnmounted, nextTick, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useLocalStorage } from '@vueuse/core'
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
import { fetchPracticeRun } from '@/services/practiceRunApiService.js'
import { getTodayUTC } from '@/utils/buildDigTimeline.js'
import { buildPracticeDigTimeline } from '@/utils/buildPracticeDigTimeline.js'
import { encodeBoard, decodeBoard } from '@/utils/practiceBoardCode.js'
import { PRACTICE_IN_PROGRESS_KEY } from '@/constants/storageKeys.js'

const ALL_FORMATION_KEYS = Object.keys(DIGGING_FORMATIONS)
const IN_PROGRESS_VERSION = 1

const route = useRoute()
const router = useRouter()

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
  startGameFromPlacements,
  restoreRound,
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
const showPrediction = useLocalStorage('showPrediction-practice', false)
const saveScores = ref(isPracticeSaveScoresEnabled())
const nickname = ref(getNickname())
const lastRunId = ref(null)
const elapsedMs = ref(0)
const finalElapsedMs = ref(0)
const roundStartedAt = ref(Date.now())
const patternSource = ref('daily')
const patternDate = ref(getTodayUTC())
const lastSubmittedRound = ref(0)
const replayRunId = ref(null)
const isReplayMode = ref(false)
const resumePromptVisible = ref(false)
const boardLinkCopied = ref(false)
let timerId = null
let boardLinkCopiedTimerId = null

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

// ---- Resume: persist the in-progress round to localStorage ----

function readInProgressRound () {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage?.getItem(PRACTICE_IN_PROGRESS_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed?.version !== IN_PROGRESS_VERSION) return null
    if (!Array.isArray(parsed.placements) || !parsed.placements.length) return null
    if (!Array.isArray(parsed.digHistory) || !parsed.digHistory.length) return null
    return parsed
  } catch {
    return null
  }
}

function saveInProgressRound () {
  if (typeof window === 'undefined') return
  try {
    window.localStorage?.setItem(PRACTICE_IN_PROGRESS_KEY, JSON.stringify({
      version: IN_PROGRESS_VERSION,
      savedAt: Date.now(),
      patternSource: patternSource.value,
      patternDate: patternDate.value,
      isReplayMode: isReplayMode.value,
      replayRunId: replayRunId.value,
      placements: formationPlacements.value,
      digHistory: digHistory.value,
      elapsedMs: elapsedMs.value,
    }))
  } catch {
    /* storage full / unavailable — ignore */
  }
}

function clearInProgressRound () {
  if (typeof window === 'undefined') return
  try {
    window.localStorage?.removeItem(PRACTICE_IN_PROGRESS_KEY)
  } catch {
    /* ignore */
  }
}

function resumeSavedRound (saved) {
  if (!saved) {
    discardSavedRound()
    return
  }
  resumePromptVisible.value = false
  patternSource.value = saved.patternSource || 'daily'
  patternDate.value = saved.patternDate || getTodayUTC()
  isReplayMode.value = Boolean(saved.isReplayMode)
  replayRunId.value = saved.replayRunId || null
  lastRunId.value = null
  restoreRound(saved)
  roundStartedAt.value = Date.now() - (saved.elapsedMs || 0)
  elapsedMs.value = saved.elapsedMs || 0
  finalElapsedMs.value = 0
  startTimer()
}

function discardSavedRound () {
  resumePromptVisible.value = false
  clearInProgressRound()
  void newTodayRound()
}

// ---- Retry the same content ----

function retrySamePatterns () {
  if (!usedFormationKeys.value.length) return
  lastRunId.value = null
  isReplayMode.value = false
  replayRunId.value = null
  startGame([...usedFormationKeys.value], { exact: true })
  resetRoundTimer()
}

function retrySameBoard () {
  if (!formationPlacements.value.length) return
  lastRunId.value = null
  isReplayMode.value = false
  replayRunId.value = null
  startGameFromPlacements(formationPlacements.value.map(p => ({ ...p, tiles: p.tiles.map(t => ({ ...t })) })))
  resetRoundTimer()
}

// ---- Shareable board link ----

// Keep the address bar in sync with the active board so the URL is always
// shareable — no need to click "Copy board link" first. Every round that has
// placements reflects its code as `?board=…`.
watch(formationPlacements, placements => {
  if (typeof window === 'undefined') return
  if (!placements?.length) return
  try {
    const code = encodeBoard(placements)
    if (route.query.board === code) return
    router.replace({ name: 'Practice', query: { board: code } })
  } catch {
    /* encoding/navigation failed — leave the URL as-is */
  }
})

async function copyBoardLink () {
  if (!formationPlacements.value.length) return
  try {
    const code = encodeBoard(formationPlacements.value)
    const href = location.origin + router.resolve({ name: 'Practice', query: { board: code } }).href
    await navigator.clipboard.writeText(href)
    boardLinkCopied.value = true
    if (boardLinkCopiedTimerId !== null) clearTimeout(boardLinkCopiedTimerId)
    boardLinkCopiedTimerId = setTimeout(() => {
      boardLinkCopied.value = false
      boardLinkCopiedTimerId = null
    }, 2000)
  } catch {
    /* clipboard blocked — ignore */
  }
}

watch(showTimer, () => {
  if (showTimer.value) {
    startTimer()
  } else {
    stopTimer()
  }
})

// Persist progress while a round is in play; a finished round is no longer "unfinished".
watch(digsMade, count => {
  if (isGameOver.value) return
  if (count > 0) {
    saveInProgressRound()
  } else {
    clearInProgressRound()
  }
})

watch(isGameOver, done => {
  if (!done) return

  clearInProgressRound()

  finalElapsedMs.value = Date.now() - roundStartedAt.value
  elapsedMs.value = finalElapsedMs.value
  stopTimer()

  if (roundCount.value === lastSubmittedRound.value) return
  lastSubmittedRound.value = roundCount.value
  lastRunId.value = null

  const digs = buildPracticeDigTimeline(digHistory.value, hiddenGrid.value)

  const submittedSource = patternSource.value === 'replay' ? 'random' : patternSource.value

  void submitPracticeRun({
    patternSource: submittedSource,
    patternDate: submittedSource === 'daily' ? patternDate.value : null,
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
  resumePromptVisible.value = false
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
  resumePromptVisible.value = false
  if (!preserveFailureState) {
    todayRoundErrorMessage.value = ''
    stopTodayRoundCooldown()
  }
  lastRunId.value = null
  isReplayMode.value = false
  replayRunId.value = null
  patternSource.value = 'random'
  patternDate.value = getTodayUTC()
  startGame(ALL_FORMATION_KEYS)
  resetRoundTimer()
}

async function startReplayRound (runId) {
  isStartingTodayRound.value = true
  todayRoundErrorMessage.value = ''
  lastRunId.value = null

  try {
    const run = await fetchPracticeRun(runId)
    if (!run?.formations?.length) {
      throw new Error('This run has no formation data to replay.')
    }
    isReplayMode.value = true
    replayRunId.value = runId
    patternSource.value = 'replay'
    patternDate.value = null
    startGameFromPlacements(run.formations)
    resetRoundTimer()
  } catch (err) {
    todayRoundErrorMessage.value = err?.message || 'Failed to load the replay grid.'
    stopTodayRoundCooldown()
    todayRoundCooldownActive.value = true
    todayRoundCooldownTimerId = setTimeout(() => {
      todayRoundCooldownActive.value = false
      todayRoundCooldownTimerId = null
    }, TODAY_ROUND_ERROR_COOLDOWN_MS)
    newRandomRound({ preserveFailureState: true })
  } finally {
    isStartingTodayRound.value = false
  }
}

const bannerClass = computed(() => {
  if (isVictory.value) return 'alert-success'
  if (treasuresFound.value > 0) return 'alert-info'
  return 'alert-warning'
})

function persistOnHide () {
  if (!isGameOver.value && digsMade.value > 0) saveInProgressRound()
}

onMounted(() => {
  const boardCode = String(route.query.board || '').trim()
  const runId = String(route.query.run || '').trim()

  if (boardCode) {
    const placements = decodeBoard(boardCode)
    if (placements?.length) {
      isReplayMode.value = true
      replayRunId.value = null
      patternSource.value = 'random'
      patternDate.value = getTodayUTC()
      startGameFromPlacements(placements)
      resetRoundTimer()
    } else {
      void newTodayRound()
    }
  } else if (runId) {
    void startReplayRound(runId)
  } else {
    const saved = readInProgressRound()
    if (saved) {
      resumePromptVisible.value = true
    } else {
      void newTodayRound()
    }
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', persistOnHide)
    document.addEventListener('visibilitychange', persistOnHide)
  }
})

onUnmounted(() => {
  persistOnHide()
  stopTimer()
  stopTodayRoundCooldown()
  if (boardLinkCopiedTimerId !== null) clearTimeout(boardLinkCopiedTimerId)
  if (typeof window !== 'undefined') {
    window.removeEventListener('beforeunload', persistOnHide)
    document.removeEventListener('visibilitychange', persistOnHide)
  }
})
</script>
