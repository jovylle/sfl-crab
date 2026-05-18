import { computed, unref } from 'vue'

/** ~7–8 daily patterns: mobile = 2 rows, desktop = 2 columns (see style.css). */
export function usePatternStripLayout (patternKeys) {
  const patternStripStyle = computed(() => {
    const keys = unref(patternKeys)
    const n = Array.isArray(keys) ? keys.length : 0
    const mobileCols = Math.max(1, Math.ceil(n / 2))
    return {
      '--pattern-mobile-cols': String(mobileCols),
    }
  })

  return { patternStripStyle }
}
