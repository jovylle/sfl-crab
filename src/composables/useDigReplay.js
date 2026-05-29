import { ref, computed, watch, onBeforeUnmount } from 'vue'
import {
  buildDigTimeline,
  buildTreasureOrderMap,
} from '@/utils/buildDigTimeline.js'
import { buildReplayCellsAtStep } from '@/utils/buildReplayGrid.js'
import { useMarkJournal } from '@/composables/useMarkJournal.js'

const STEP_MS = 700

/**
 * Modal replay player: digs 0..N + marks by afterDigOrder (partial session OK).
 * Destructure refs at the call site (do not pass `replay.isOpen` from a plain object).
 * @param {string} landId
 * @param {import('vue').Ref | (() => object)} desertSource
 */
export function useDigReplay (landId, desertSource) {
  const isOpen = ref(false)
  const step = ref(0)
  const isPlaying = ref(false)
  let playTimer = null

  function getDesert () {
    const src = desertSource
    if (typeof src === 'function') return src() || {}
    return src?.value ?? src ?? {}
  }

  const digs = computed(() => buildDigTimeline(getDesert().digging?.grid || []))
  const maxStep = computed(() => digs.value.length)
  const canReplay = computed(() => maxStep.value > 0)

  const journal = useMarkJournal(landId)

  const replayCells = computed(() => {
    if (!isOpen.value || !canReplay.value) return []
    const marks = journal.getMarksAtStep(step.value)
    return buildReplayCellsAtStep(digs.value, step.value, marks)
  })

  const replayOrderMap = computed(() => {
    if (!isOpen.value) return []
    const rawGrid = getDesert().digging?.grid || []
    const map = buildTreasureOrderMap(rawGrid, 10)
    const cap = step.value
    return map.map((n) => (n != null && n <= cap ? n : null))
  })

  const stepLabel = computed(() => {
    if (!canReplay.value) return ''
    if (step.value === 0) return `Before first dig · 0 / ${maxStep.value}`
    return `After dig ${step.value} · ${step.value} / ${maxStep.value}`
  })

  function stopPlayTimer () {
    if (playTimer) {
      clearInterval(playTimer)
      playTimer = null
    }
  }

  function pause () {
    isPlaying.value = false
    stopPlayTimer()
  }

  function play () {
    if (!canReplay.value || !isOpen.value) return
    isPlaying.value = true
    stopPlayTimer()
    playTimer = setInterval(() => {
      if (step.value >= maxStep.value) {
        pause()
        return
      }
      step.value += 1
    }, STEP_MS)
  }

  function togglePlay () {
    if (isPlaying.value) {
      pause()
      return
    }
    if (step.value >= maxStep.value) step.value = 0
    play()
  }

  function openReplay () {
    if (!canReplay.value) return
    step.value = 0
    isOpen.value = true
    play()
  }

  function closeReplay () {
    pause()
    isOpen.value = false
  }

  function setStep (n) {
    pause()
    const clamped = Math.max(0, Math.min(maxStep.value, Math.round(Number(n) || 0)))
    step.value = clamped
  }

  function stepPrev () {
    setStep(step.value - 1)
  }

  function stepNext () {
    setStep(step.value + 1)
  }

  watch(maxStep, (n) => {
    if (step.value > n) step.value = n
  })

  watch(isOpen, (open) => {
    if (!open) pause()
  })

  onBeforeUnmount(() => pause())

  return {
    isOpen,
    step,
    maxStep,
    canReplay,
    isPlaying,
    digs,
    replayCells,
    replayOrderMap,
    stepLabel,
    openReplay,
    closeReplay,
    setStep,
    stepPrev,
    stepNext,
    togglePlay,
    pause,
  }
}
