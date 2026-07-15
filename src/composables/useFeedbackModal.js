import { ref } from 'vue'

const feedbackOpen = ref(false)
const feedbackPrefill = ref(null) // { tileLabel, landId, source } | null

export function useFeedbackModal () {
  return {
    feedbackOpen,
    feedbackPrefill,
    openFeedback (prefill = null) {
      feedbackPrefill.value = prefill
      feedbackOpen.value = true
    },
    closeFeedback () {
      feedbackOpen.value = false
    },
  }
}
