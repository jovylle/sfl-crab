#!/usr/bin/env node

/**
 * Auto-update seasons data from Sunflower Land repository
 * 
 * This script:
 * 1. Fetches seasons.ts and desert.ts from SFL GitHub repo
 * 2. Parses TypeScript to extract season data and artifacts
 * 3. Updates src/data/game/seasonalArtefacts.js if changes detected
 * 4. Downloads any new artifact .webp files to public/world/
 * 
 * Run: npm run update-seasons
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SFL_REPO_BASE = 'https://raw.githubusercontent.com/sunflower-land/sunflower-land/main';
const SEASONS_URL = `${SFL_REPO_BASE}/src/features/game/types/seasons.ts`;
const DESERT_URL = `${SFL_REPO_BASE}/src/features/game/types/desert.ts`;
const ASSETS_BASE_URL = `${SFL_REPO_BASE}/public/world`;

const LOCAL_ARTIFACTS_FILE = path.join(__dirname, '../src/data/game/seasonalArtefacts.js');
const ASSETS_DIR = path.join(__dirname, '../public/world');

// Fetch file from URL
async function fetchText(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Failed to fetch ${url}: ${res.statusCode}`));
        return;
      }
      
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

// Download binary file
async function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Failed to download ${url}: ${res.statusCode}`));
        return;
      }
      
      const file = fs.createWriteStream(destPath);
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
      file.on('error', reject);
    }).on('error', reject);
  });
}

// Parse seasons from seasons.ts
function parseSeasons(seasonsContent) {
  const seasons = [];
  
  // Extract season names from the type definition
  const seasonNamesMatch = seasonsContent.match(/export type SeasonName =\s*([\s\S]*?);/);
  if (!seasonNamesMatch) {
    throw new Error('Could not find SeasonName type definition');
  }
  
  const seasonNames = seasonNamesMatch[1]
    .split('|')
    .map(s => s.trim().replace(/['"]/g, ''))
    .filter(s => s.length > 0);
  
  // Extract season dates from SEASONS object
  const seasonsObjectMatch = seasonsContent.match(/export const SEASONS: Record<SeasonName, SeasonDates> = {([\s\S]*?)};/);
  if (!seasonsObjectMatch) {
    throw new Error('Could not find SEASONS object');
  }
  
  // Parse each season's dates
  for (const seasonName of seasonNames) {
    const seasonRegex = new RegExp(`"${seasonName}":\\s*{[^}]*startDate:\\s*new Date\\("([^"]+)"\\)[^}]*endDate:\\s*new Date\\("([^"]+)"\\)`, 'g');
    const match = seasonRegex.exec(seasonsObjectMatch[1]);
    
    if (match) {
      seasons.push({
        name: seasonName,
        startDate: match[1],
        endDate: match[2]
      });
    }
  }
  
  return seasons;
}

// Parse seasonal artifacts from desert.ts
function parseSeasonalArtifacts(desertContent) {
  const artifacts = {};
  
  // Extract SEASONAL_ARTEFACT object
  const artifactsMatch = desertContent.match(/export const SEASONAL_ARTEFACT: Record<[\s\S]*?> = {([\s\S]*?)};/);
  if (!artifactsMatch) {
    throw new Error('Could not find SEASONAL_ARTEFACT object');
  }
  
  // Parse each season's artifact
  const artifactLines = artifactsMatch[1].split('\n');
  for (const line of artifactLines) {
    const match = line.match(/"([^"]+)":\s*"([^"]+)"/);
    if (match) {
      artifacts[match[1]] = match[2];
    }
  }
  
  return artifacts;
}

// Generate the new seasonalArtefacts.js file content
function generateArtifactsFileContent(seasons, artifacts) {
  const header = `// Seasonal Artefacts Data
// Extracted from Sunflower Land game repo for local use
// Last updated: ${new Date().toISOString().split('T')[0]}

/**
 * Maps season names to their corresponding seasonal artifact
 */
export const SEASONAL_ARTEFACT = {`;

  const artifactEntries = Object.entries(artifacts)
    .map(([season, artifact]) => `  "${season}": "${artifact}",`)
    .join('\n');

  const middlePart = `}

/**
 * Gets the current seasonal artifact based on date
 * Returns the latest season's artifact as default for dates beyond defined seasons
 */
export function getCurrentSeasonalArtefact() {
  const now = new Date()
  
  // Season date ranges
  const seasons = [`;

  const seasonEntries = seasons
    .map(s => `    { name: "${s.name}", start: new Date("${s.startDate}"), end: new Date("${s.endDate}") },`)
    .join('\n');

  const latestSeason = seasons[seasons.length - 1];
  const footer = `  ]
  
  // Find current season
  const currentSeason = seasons.find(season => now >= season.start && now < season.end)
  
  // If no season found (we're past all defined seasons), return the latest season's artifact
  if (!currentSeason) {
    console.warn(\`No active season found for date \${now.toISOString()}. Using latest season artifact.\`)
    return SEASONAL_ARTEFACT["${latestSeason.name}"] // Default to latest season
  }
  
  return SEASONAL_ARTEFACT[currentSeason.name]
}
`;

  return header + '\n' + artifactEntries + '\n' + middlePart + '\n' + seasonEntries + '\n' + footer;
}

// Main execution
async function main() {
  console.log('🔍 Fetching season data from Sunflower Land repository...\n');
  
  try {
    // Fetch TypeScript files
    console.log('📥 Downloading seasons.ts...');
    const seasonsContent = await fetchText(SEASONS_URL);
    
    console.log('📥 Downloading desert.ts...');
    const desertContent = await fetchText(DESERT_URL);
    
    // Parse data
    console.log('\n🔬 Parsing season data...');
    const seasons = parseSeasons(seasonsContent);
    const artifacts = parseSeasonalArtifacts(desertContent);
    
    console.log(`✅ Found ${seasons.length} seasons`);
    console.log(`✅ Found ${Object.keys(artifacts).length} seasonal artifacts\n`);
    
    // Check for new seasons
    const currentContent = fs.readFileSync(LOCAL_ARTIFACTS_FILE, 'utf8');
    const newContent = generateArtifactsFileContent(seasons, artifacts);
    
    let hasChanges = false;
    
    if (currentContent !== newContent) {
      console.log('🆕 Season data has changed! Updating local file...');
      fs.writeFileSync(LOCAL_ARTIFACTS_FILE, newContent);
      console.log(`✅ Updated ${LOCAL_ARTIFACTS_FILE}\n`);
      hasChanges = true;
    } else {
      console.log('✨ Season data is up to date!\n');
    }
    
    // Download missing artifact images
    console.log('🖼️  Checking for missing artifact images...');
    const uniqueArtifacts = [...new Set(Object.values(artifacts))];
    const downloadedAssets = [];
    
    for (const artifact of uniqueArtifacts) {
      const filename = artifact.toLowerCase().replace(/\s+/g, '_') + '.webp';
      const localPath = path.join(ASSETS_DIR, filename);
      
      if (!fs.existsSync(localPath)) {
        console.log(`📥 Downloading ${filename}...`);
        const assetUrl = `${ASSETS_BASE_URL}/${filename}`;
        
        try {
          await downloadFile(assetUrl, localPath);
          console.log(`✅ Downloaded ${filename}`);
          downloadedAssets.push(filename);
          hasChanges = true;
        } catch (error) {
          console.warn(`⚠️  Failed to download ${filename}: ${error.message}`);
        }
      }
    }
    
    if (downloadedAssets.length === 0) {
      console.log('✨ All artifact images are present!\n');
    } else {
      console.log(`\n✅ Downloaded ${downloadedAssets.length} new assets\n`);
    }
    
    // Summary
    if (hasChanges) {
      console.log('🎉 Update complete! Changes have been made.');
      console.log('📝 Commit these changes to update the app.\n');
    } else {
      console.log('✨ Everything is up to date! No changes needed.\n');
    }
    
    // Display latest season info
    const latestSeason = seasons[seasons.length - 1];
    console.log('📊 Latest season info:');
    console.log(`   Name: ${latestSeason.name}`);
    console.log(`   Artifact: ${artifacts[latestSeason.name]}`);
    console.log(`   Start: ${latestSeason.startDate}`);
    console.log(`   End: ${latestSeason.endDate}`);
    
  } catch (error) {
    console.error('❌ Error updating seasons:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();



