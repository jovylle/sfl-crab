const GITHUB_WORLD_BASE =
  'https://raw.githubusercontent.com/sunflower-land/sunflower-land/main/public/world'

/**
 * Items to skip when picking the "primary" dig item for display.
 * Sand and Crab are secondary finds; prefer actual treasures when present.
 */
const SKIP_ITEMS = new Set(['Sand', 'Crab'])

/**
 * Return the most notable item name from a tile's items record.
 * Prioritises non-Sand/non-Crab items; falls back to Crab, then Sand.
 * @param {Record<string, number> | null | undefined} items
 * @returns {string | null}
 */
export function getPrimaryDigItem (items) {
  if (!items || typeof items !== 'object') return null
  const keys = Object.keys(items)
  if (!keys.length) return null

  const treasure = keys.find(k => !SKIP_ITEMS.has(k))
  if (treasure) return treasure

  if (items['Crab']) return 'Crab'
  return keys[0] ?? null
}

/**
 * Convert a display item name to its URL slug.
 * e.g. "Sunflower Seed" → "sunflower_seed"
 * @param {string | null | undefined} name
 * @returns {string}
 */
export function itemNameToSlug (name) {
  if (!name) return ''
  return name.toLowerCase().replace(/\s+/g, '_')
}

/**
 * Local asset path served from the /world/ public directory.
 * @param {string} slug
 * @returns {string}
 */
export function worldAssetPath (slug) {
  if (!slug) return ''
  return `/world/${slug}.webp`
}

/**
 * GitHub CDN fallback URL for world assets.
 * @param {string} slug
 * @returns {string}
 */
export function worldAssetGithubUrl (slug) {
  if (!slug) return ''
  return `${GITHUB_WORLD_BASE}/${slug}.webp`
}
