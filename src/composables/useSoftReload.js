// src/composables/useSoftReload.js
import { ref } from 'vue'

// a shared ref—all components import the same one
export const reloadCounter = ref(0)

// call this to “soft reload” everywhere
export function triggerSoftReload () {
  reloadCounter.value++
}
