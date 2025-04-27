// src/composables/softReloadRegistry.js
import { watch } from 'vue'
import { reloadCounter } from './useSoftReload'

const registry = []

/**
 * Register a named callback to run on soft reload.
 * @param {string} name — identifier for debugging
 * @param {Function} callback — function to run
 */
export function onSoftReload (name, callback) {
  registry.push(name)
  watch(
    reloadCounter,
    () => {
      console.debug(`[softReload] running handler: ${name}`)
      callback()
    },
    { immediate: true }
  )
}

/** List all registered soft‐reload handlers (by name) */
export function listSoftReloadHandlers () {
  return [...registry]
}
