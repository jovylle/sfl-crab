#!/usr/bin/env node

/**
 * Check for missing treasure assets
 * Run: node scripts/check-missing-assets.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import the digging formations
const formationsPath = path.join(__dirname, '../src/data/game/diggingFormations.js');
const worldDir = path.join(__dirname, '../public/world');

console.log('🔍 Checking for missing treasure assets...\n');

// Read the formations file
const formationsContent = fs.readFileSync(formationsPath, 'utf8');

// Extract all unique treasure names
const treasureNames = new Set();
const nameRegex = /name:\s*"([^"]+)"/g;
let match;

while ((match = nameRegex.exec(formationsContent)) !== null) {
  treasureNames.add(match[1]);
}

console.log(`📦 Found ${treasureNames.size} unique treasures in formations:\n`);

// Check which assets are missing
const missingAssets = [];
const existingAssets = [];

for (const treasureName of Array.from(treasureNames).sort()) {
  // Convert treasure name to filename
  const filename = treasureName.toLowerCase().replace(/\s+/g, '_') + '.webp';
  const filePath = path.join(worldDir, filename);
  
  // Also check .png as fallback
  const pngFilename = treasureName.toLowerCase().replace(/\s+/g, '_') + '.png';
  const pngFilePath = path.join(worldDir, pngFilename);
  
  if (fs.existsSync(filePath)) {
    existingAssets.push({ name: treasureName, file: filename, status: '✅' });
  } else if (fs.existsSync(pngFilePath)) {
    existingAssets.push({ name: treasureName, file: pngFilename, status: '✅ (PNG)' });
  } else {
    missingAssets.push({ name: treasureName, file: filename, status: '❌' });
  }
}

// Print results
if (missingAssets.length > 0) {
  console.log('❌ Missing assets:\n');
  missingAssets.forEach(({ name, file, status }) => {
    console.log(`  ${status} ${name} → ${file}`);
  });
  console.log(`\n📊 Summary: ${missingAssets.length} missing, ${existingAssets.length} found\n`);
  
  console.log('💡 To download missing assets:');
  console.log('   1. Visit: https://github.com/sunflower-land/sunflower-land/tree/main/public/world');
  console.log('   2. Download missing .webp files to public/world/\n');
  
  console.log('Or use curl:');
  missingAssets.forEach(({ file }) => {
    const url = `https://raw.githubusercontent.com/sunflower-land/sunflower-land/main/public/world/${file}`;
    console.log(`   curl -o public/world/${file} ${url}`);
  });
  
  process.exit(1);
} else {
  console.log('✅ All treasure assets found!\n');
  console.log(`📊 Total: ${existingAssets.length} assets\n`);
  process.exit(0);
}

