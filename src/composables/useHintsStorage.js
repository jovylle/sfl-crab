import { ref } from 'vue'

export function useHintsStorage (landId) {
  const KEY = `gridCustomHints_${landId}`
  const todayUTC = new Date().toISOString().slice(0, 10)
  const hints = ref({})

  function load () {
    try {
      const stored = JSON.parse(localStorage.getItem(KEY)) || {}

      // Check for stale date
      if (stored.date !== todayUTC) {
        clear() // wipe old data
        return
      }

      hints.value = stored.hints || {}
    } catch {
      hints.value = {}
    }
  }

  function save () {
    localStorage.setItem(KEY, JSON.stringify({
      date: todayUTC,
      hints: hints.value
    }))
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
