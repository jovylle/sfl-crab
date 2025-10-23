// Import from auto-synced JSON data
import treasureData from '@/data/game/treasurePrices.json'

export const TREASURE_PRICES = treasureData.prices
export const LAST_UPDATED = treasureData.lastUpdated
export const DATA_SOURCE = treasureData.source

/**
 * Get the sell price for a treasure by name
 * @param {string} treasureName - Name of the treasure
 * @returns {number} Price in coins, or 0 if not found
 */
export function getTreasurePrice(treasureName) {
  return TREASURE_PRICES[treasureName] || 0
}

/**
 * Calculate total value of treasures found
 * @param {Array} treasures - Array of treasure objects with name and count
 * @returns {number} Total value in coins
 */
export function calculateTotalValue(treasures) {
  return treasures.reduce((total, treasure) => {
    const price = getTreasurePrice(treasure.name)
    return total + (price * treasure.count)
  }, 0)
}

/**
 * Get treasure with price information
 * @param {Array} treasures - Array of treasure objects
 * @returns {Array} Array of treasure objects with price and totalValue added
 */
export function getTreasuresWithPrices(treasures) {
  return treasures.map(treasure => ({
    ...treasure,
    price: getTreasurePrice(treasure.name),
    totalValue: getTreasurePrice(treasure.name) * treasure.count
  }))
}
