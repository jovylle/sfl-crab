/** Custom mark: short text label (1–2 chars) for dig priority / notes. */
export const HINT_LABEL_PREFIX = 'hint-label:'
export const HINT_LABEL_ACTION = 'action:hint-label'

export function toHintLabelClass (text) {
  const trimmed = String(text ?? '').trim()
  if (!trimmed) return null
  const safe = trimmed.slice(0, 2)
  return `${HINT_LABEL_PREFIX}${safe}`
}

export function fromHintLabelClass (cls) {
  if (typeof cls !== 'string' || !cls.startsWith(HINT_LABEL_PREFIX)) return null
  return cls.slice(HINT_LABEL_PREFIX.length) || null
}

export function getLabelFromTile (tile) {
  if (!Array.isArray(tile)) return null
  for (const cls of tile) {
    const label = fromHintLabelClass(cls)
    if (label) return label
  }
  return null
}
