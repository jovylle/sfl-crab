/** Per-land callbacks wired by useDigDayStore for useGridManager pick/clear. */
const handlersByLand = new Map()

/**
 * @param {string} landId
 * @param {{ getAfterDigOrder: () => number, onPick: (index: number, hintClass: string|string[]) => void, onClearAll: () => void } | null} handlers
 */
export function registerMarkJournalHandlers (landId, handlers) {
  if (!landId || landId === 'guest' || landId === '0') {
    handlersByLand.delete(landId)
    return
  }
  if (handlers) {
    handlersByLand.set(String(landId), handlers)
  } else {
    handlersByLand.delete(String(landId))
  }
}

export function getMarkJournalHandlers (landId) {
  return handlersByLand.get(String(landId)) || null
}
