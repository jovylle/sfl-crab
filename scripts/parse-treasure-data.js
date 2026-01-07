#!/usr/bin/env node

import { Project } from 'ts-morph'
import { writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Ensure output directory exists
const outputDir = join(__dirname, '..', 'src', 'data', 'game')
mkdirSync(outputDir, { recursive: true })

// Create TypeScript project
const project = new Project()

// Add source files
const treasureFile = project.addSourceFileAtPath(join(__dirname, '..', 'temp', 'sfl', 'treasure.ts'))
const desertFile = project.addSourceFileAtPath(join(__dirname, '..', 'temp', 'sfl', 'desert.ts'))

// Extract treasure prices
function extractTreasurePrices() {
  const sellableTreasure = treasureFile.getVariableDeclaration('SELLABLE_TREASURES')
  if (!sellableTreasure) {
    throw new Error('SELLABLE_TREASURES not found in treasure.ts')
  }

  const prices = {}
  const objectLiteral = sellableTreasure.getInitializer()
  
  if (objectLiteral && objectLiteral.getKind() === 201) { // ObjectLiteralExpression
    objectLiteral.getProperties().forEach(prop => {
      if (prop.getKind() === 201) { // PropertyAssignment
        const treasureName = prop.getName()
        const sellPriceProp = prop.getInitializer()?.getProperties().find(p => 
          p.getName() === 'sellPrice'
        )
        
        if (sellPriceProp) {
          const priceValue = sellPriceProp.getInitializer()?.getText()
          if (priceValue) {
            prices[treasureName] = parseFloat(priceValue)
          }
        }
      }
    })
  }

  return prices
}

// Extract game constants
function extractGameConstants() {
  const constants = {}
  
  // Look for common constants in desert.ts
  const freeDigs = desertFile.getVariableDeclaration('FREE_DIGS')
  if (freeDigs) {
    const value = freeDigs.getInitializer()?.getText()
    if (value) {
      constants.FREE_DIGS_PER_DAY = parseInt(value)
    }
  }

  // Add more constants as needed
  constants.GRID_SIZE = 10 // Default grid size

  return constants
}

// Generate JSON files
function generateJsonFiles() {
  const timestamp = new Date().toISOString()
  
  // Treasure prices
  const treasurePrices = {
    lastUpdated: timestamp,
    source: 'https://github.com/sunflower-land/sunflower-land/blob/main/src/features/game/types/treasure.ts',
    version: '1.0.0',
    prices: extractTreasurePrices()
  }

  // Game constants
  const gameConstants = {
    lastUpdated: timestamp,
    source: 'https://github.com/sunflower-land/sunflower-land',
    version: '1.0.0',
    constants: extractGameConstants()
  }

  // Write files
  writeFileSync(
    join(outputDir, 'treasurePrices.json'),
    JSON.stringify(treasurePrices, null, 2)
  )

  writeFileSync(
    join(outputDir, 'gameConstants.json'),
    JSON.stringify(gameConstants, null, 2)
  )

  console.log('✅ Generated treasurePrices.json and gameConstants.json')
  console.log(`📊 Found ${Object.keys(treasurePrices.prices).length} treasure prices`)
  console.log(`⚙️ Found ${Object.keys(gameConstants.constants).length} game constants`)
}

// Run the parser
try {
  generateJsonFiles()
} catch (error) {
  console.error('❌ Error parsing game data:', error.message)
  process.exit(1)
}
