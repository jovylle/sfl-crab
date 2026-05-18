import { ref, computed, watch } from 'vue'
import { buildDigTimeline } from '@/utils/buildDigTimeline.js'
import { buildReplayCellsAtStep } from '@/utils/buildReplayGrid.js'
import { useMarkJournal } from '@/composables/useMarkJournal.js'

/**
 * Step-through replay of today's digs + marks (partial session OK; max step = dig count).
 * @param {string} landId
 * @param {import('vue').Ref | (() => object)} desertSource
 */
export function useDigReplay (landId, desertSource) {
  const isOpen = ref(false)
  const step = ref(0)

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
    if (!isOpen.value || !canReplay.value) return null
    const marks = journal.getMarksAtStep(step.value)
    return buildReplayCellsAtStep(digs.value, step.value, marks)
  })

  const stepLabel = computed(() => {
    if (!canReplay.value) return ''
    if (step.value === 0) return `Before first dig · 0 / ${maxStep.value}`
    return `After dig ${step.value} · ${step.value} / ${maxStep.value}`
  })

  function openReplay () {
    if (!canReplay.value) return
    step.value = 0
    isOpen.value = true
  }

  function closeReplay () {
    isOpen.value = false
  }

  function setStep (n) {
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

  return {
    isOpen,
    step,
    maxStep,
    canReplay,
    digs,
    replayCells,
    stepLabel,
    openReplay,
    closeReplay,
    setStep,
    stepPrev,
    stepNext,
  }
}
