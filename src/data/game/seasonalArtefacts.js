// Seasonal Artefacts Data
// Extracted from Sunflower Land game repo for local use
// Last updated: 2025-11-05

/**
 * Maps season names to their corresponding seasonal artifact
 */
export const SEASONAL_ARTEFACT = {
  "Bull Run": "Cow Skull",
  "Pharaoh's Treasure": "Scarab",
  "Solar Flare": "Scarab",
  "Dawn Breaker": "Scarab",
  "Witches' Eve": "Scarab",
  "Catch the Kraken": "Scarab",
  "Spring Blossom": "Scarab",
  "Clash of Factions": "Scarab",
  "Winds of Change": "Ancient Clock",
  "Great Bloom": "Broken Pillar",
  "Better Together": "Coprolite",
  "Paw Prints": "Moon Crystal",
}

/**
 * Gets the current seasonal artifact based on date
 * Returns the latest season's artifact as default for dates beyond defined seasons
 */
export function getCurrentSeasonalArtefact() {
  const now = new Date()
  
  // Season date ranges
  const seasons = [
    { name: "Solar Flare", start: new Date("2023-01-01T00:00:00.000Z"), end: new Date("2023-05-01T00:00:00.000Z") },
    { name: "Dawn Breaker", start: new Date("2023-05-01T00:00:00.000Z"), end: new Date("2023-08-01T00:00:00.000Z") },
    { name: "Catch the Kraken", start: new Date("2023-11-01T00:00:00.000Z"), end: new Date("2024-02-01T00:00:00.000Z") },
    { name: "Spring Blossom", start: new Date("2024-02-01T00:00:00.000Z"), end: new Date("2024-05-01T00:00:00.000Z") },
    { name: "Clash of Factions", start: new Date("2024-05-01T00:00:00.000Z"), end: new Date("2024-08-01T00:00:00.000Z") },
    { name: "Bull Run", start: new Date("2024-11-01T00:00:00.000Z"), end: new Date("2025-02-03T00:00:00.000Z") },
    { name: "Winds of Change", start: new Date("2025-02-03T00:00:00.000Z"), end: new Date("2025-05-01T00:00:00.000Z") },
    { name: "Great Bloom", start: new Date("2025-05-01T00:00:00.000Z"), end: new Date("2025-08-04T00:00:00.000Z") },
    { name: "Better Together", start: new Date("2025-08-04T00:00:00.000Z"), end: new Date("2025-11-03T00:00:00.000Z") },
    { name: "Paw Prints", start: new Date("2025-11-03T00:00:00.000Z"), end: new Date("2026-02-02T00:00:00.000Z") },
  ]
  
  // Find current season
  const currentSeason = seasons.find(season => now >= season.start && now < season.end)
  
  // If no season found (we're past all defined seasons), return the latest season's artifact
  if (!currentSeason) {
    console.warn(`No active season found for date ${now.toISOString()}. Using latest season artifact.`)
    return SEASONAL_ARTEFACT["Paw Prints"] // Default to latest season
  }
  
  return SEASONAL_ARTEFACT[currentSeason.name]
}
