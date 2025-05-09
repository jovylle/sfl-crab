// src/composables/useHintsStorage.js
import { ref } from 'vue'

export function useHintsStorage (landId) {
  const KEY = `gridCustomHints_${landId}`
  const hints = ref({})

  function load () {
    try {
      hints.value = JSON.parse(localStorage.getItem(KEY)) || {}
    } catch {
      hints.value = {}
    }
  }

  function save () {
    localStorage.setItem(KEY, JSON.stringify(hints.value))
  }

  function clear () {
    localStorage.removeItem(KEY)
    hints.value = {}
  }

  function toggle (idx, classes) {
    if (classes && classes.length) {
      hints.value[idx] = classes
    } else {
      delete hints.value[idx]
    }
    save()
  }

  // initialize
  load()

  return {
    hints,
    load,
    save,
    clear,
    toggle
  }
}
