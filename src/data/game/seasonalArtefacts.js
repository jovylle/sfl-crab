// Seasonal Artefacts Data
// Extracted from Sunflower Land game repo for local use
// Last updated: November 2025

/**
 * Maps season names to their corresponding seasonal artifact
 */
export const SEASONAL_ARTEFACT = {
  "Solar Flare": "Scarab",
  "Dawn Breaker": "Scarab",
  "Witches' Eve": "Scarab",
  "Catch the Kraken": "Scarab",
  "Spring Blossom": "Scarab",
  "Clash of Factions": "Scarab",
  "Pharaoh's Treasure": "Scarab",
  "Bull Run": "Cow Skull",
  "Winds of Change": "Ancient Clock",
  "Great Bloom": "Broken Pillar",
  "Better Together": "Coprolite",
}

/**
 * Gets the current seasonal artifact based on date
 * Returns "Coprolite" as default for dates beyond defined seasons
 */
export function getCurrentSeasonalArtefact() {
  const now = new Date()
  
  // Season date ranges
  const seasons = [
    { name: "Solar Flare", start: new Date("2023-01-01"), end: new Date("2023-05-01") },
    { name: "Dawn Breaker", start: new Date("2023-05-01"), end: new Date("2023-08-01") },
    { name: "Witches' Eve", start: new Date("2023-08-01"), end: new Date("2023-11-01") },
    { name: "Catch the Kraken", start: new Date("2023-11-01"), end: new Date("2024-02-01") },
    { name: "Spring Blossom", start: new Date("2024-02-01"), end: new Date("2024-05-01") },
    { name: "Clash of Factions", start: new Date("2024-05-01"), end: new Date("2024-08-01") },
    { name: "Pharaoh's Treasure", start: new Date("2024-08-01"), end: new Date("2024-11-01") },
    { name: "Bull Run", start: new Date("2024-11-01"), end: new Date("2025-02-03") },
    { name: "Winds of Change", start: new Date("2025-02-03"), end: new Date("2025-05-01") },
    { name: "Great Bloom", start: new Date("2025-05-01"), end: new Date("2025-08-04") },
    { name: "Better Together", start: new Date("2025-08-04"), end: new Date("2025-11-03") },
  ]
  
  // Find current season
  const currentSeason = seasons.find(season => now >= season.start && now < season.end)
  
  // If no season found (we're past all defined seasons), return the latest season's artifact
  if (!currentSeason) {
    console.warn(`No active season found for date ${now.toISOString()}. Using latest season artifact.`)
    return SEASONAL_ARTEFACT["Better Together"] // Default to latest season
  }
  
  return SEASONAL_ARTEFACT[currentSeason.name]
}

