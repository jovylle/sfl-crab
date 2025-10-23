// Treasure prices from Sunflower Land game data
// Source: src_other/features/game/types/treasure.ts - SELLABLE_TREASURE

export const TREASURE_PRICES = {
  "Sand": 10,
  "Camel Bone": 10,
  "Crab": 15,
  "Old Bottle": 22.5,
  "Sea Cucumber": 22.5,
  "Vase": 50,
  "Seaweed": 75,
  "Cockle Shell": 100,
  "Starfish": 112.5,
  "Wooden Compass": 131.25,
  "Iron Compass": 187.5,
  "Emerald Compass": 187.5,
  "Pipi": 187.5,
  "Hieroglyph": 250,
  "Clam Shell": 375,
  "Coral": 1500,
  "Pearl": 3750,
  "Pirate Bounty": 7500,
  // Seasonal artefacts
  "Scarab": 200,
  "Cow Skull": 200,
  "Ancient Clock": 200,
  "Broken Pillar": 200,
  "Coprolite": 200
}

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
