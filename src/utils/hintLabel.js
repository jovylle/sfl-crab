/** Custom mark: number label (0–9) for dig order / notes — picker keys 1–0. */
export const HINT_LABEL_PREFIX = 'hint-label:'

export function toHintLabelClass (text) {
  const digit = String(text ?? '').trim()
  if (!/^[0-9]$/.test(digit)) return null
  return `${HINT_LABEL_PREFIX}${digit}`
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
