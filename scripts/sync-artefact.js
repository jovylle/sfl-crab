#!/usr/bin/env node

/**
 * Auto-update seasons data from Sunflower Land repository
 * 
 * This script:
 * 1. Fetches chapters.ts from SFL GitHub repo
 * 2. Parses TypeScript to extract chapter data and artifacts
 * 3. Updates src/data/game/seasonalArtefacts.js if changes detected
 * 4. Downloads any new artifact .webp files to public/world/
 * 
 * Run: npm run sync-artefact
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SFL_REPO_BASE = 'https://raw.githubusercontent.com/sunflower-land/sunflower-land/main';
const CHAPTERS_URL = `${SFL_REPO_BASE}/src/features/game/types/chapters.ts`;
const IMAGES_URL = `${SFL_REPO_BASE}/src/features/game/types/images.ts`;
const ASSETS_BASE_URL = `${SFL_REPO_BASE}/public/world`;
const ASSETS_FALLBACK_URL = 'https://sunflower-land.com/testnet-assets/resources/treasures'; // Fallback for missing assets

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

// Escape text for safe usage in RegExp
function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Parse artefact image import paths from images.ts so we can download the right file/extension
function parseArtifactAssets(imagesContent, artifacts) {
  const importMap = {};
  const importRegex = /import\s+(\w+)\s+from\s+["']([^"']+)["'];/g;
  let importMatch;

  while ((importMatch = importRegex.exec(imagesContent)) !== null) {
    importMap[importMatch[1]] = importMatch[2];
  }

  const artifactAssetPaths = {};

  for (const artifactName of Object.values(artifacts)) {
    const artifactRegex = new RegExp(
      `"${escapeRegExp(artifactName)}":\\s*{[^}]*?image:\\s*([\\w]+)`,
      'm',
    );
    const match = artifactRegex.exec(imagesContent);
    if (match) {
      const importName = match[1];
      if (importMap[importName]) {
        artifactAssetPaths[artifactName] = importMap[importName];
      }
    }
  }

  return artifactAssetPaths;
}

const IMAGES_TS_DIR = 'src/features/game/types';

// Build a raw GitHub URL from an import path
function buildRawAssetUrl(assetPath) {
  const normalized = assetPath.replace(/^\.?\/*/, '');
  const isRelative = normalized.startsWith('.') || normalized.startsWith('..');
  const resolved = isRelative
    ? path.posix.normalize(path.posix.join(IMAGES_TS_DIR, normalized))
    : normalized;

  return `${SFL_REPO_BASE}/${resolved}`;
}

// Ensure an asset exists locally, downloading from the first working URL
async function ensureAsset(filename, candidateUrls) {
  const localPath = path.join(ASSETS_DIR, filename);

  if (fs.existsSync(localPath)) {
    return { success: false, reason: 'already exists' };
  }

  const errors = [];

  for (const url of candidateUrls) {
    try {
      await downloadFile(url, localPath);
      console.log(`✅ Downloaded ${filename} from ${url}`);
      console.log(`   saved to ${localPath}`);
      return { success: true, path: localPath };
    } catch (error) {
      const message = `⚠️  Failed to download ${filename} from ${url}: ${error.message}`;
      console.warn(message);
      errors.push(message);
    }
  }

  const reason = errors.join('\n');
  console.warn(`❌ Could not download ${filename} from any candidate URL`);
  return { success: false, reason };
}

// If targetFile is missing but sourceFile exists, duplicate it (used to provide a slugged .webp when source is .png)
function copyIfMissing(sourceFile, targetFile) {
  const sourcePath = path.join(ASSETS_DIR, sourceFile);
  const targetPath = path.join(ASSETS_DIR, targetFile);

  if (!fs.existsSync(sourcePath) || fs.existsSync(targetPath)) {
    return false;
  }

  fs.copyFileSync(sourcePath, targetPath);
  console.log(`✅ Copied ${sourceFile} -> ${targetFile} (fallback copy)`);
  return true;
}

// Parse chapters from chapters.ts
function parseSeasons(chaptersContent) {
  const seasons = [];
  
  // Extract chapter names from the type definition
  const seasonNamesMatch = chaptersContent.match(/export type ChapterName =\s*([\s\S]*?);/);
  if (!seasonNamesMatch) {
    throw new Error('Could not find ChapterName type definition');
  }
  
  const seasonNames = seasonNamesMatch[1]
    .split('|')
    .map(s => s.trim().replace(/['"]/g, ''))
    .filter(s => s.length > 0);
  
  // Extract chapter dates from CHAPTERS object
  const seasonsObjectMatch = chaptersContent.match(/export const CHAPTERS: Record<ChapterName, ChapterDates> = {([\s\S]*?)};/);
  if (!seasonsObjectMatch) {
    throw new Error('Could not find CHAPTERS object');
  }
  
  // Parse each chapter's dates
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

// Parse seasonal artifacts from chapters.ts (was moved from desert.ts)
function parseSeasonalArtifacts(chaptersContent) {
  const artifacts = {};
  
  // Extract CHAPTER_ARTEFACT_NAME object (new location for artifacts)
  const artifactsMatch = chaptersContent.match(/export const CHAPTER_ARTEFACT_NAME: Record<[\s\S]*?> = {([\s\S]*?)};/);
  if (!artifactsMatch) {
    throw new Error('Could not find CHAPTER_ARTEFACT_NAME object');
  }
  
  // Parse each chapter's artifact
  const artifactLines = artifactsMatch[1].split('\n');
  for (const line of artifactLines) {
    const match = line.match(/"([^"]+)":\s*"([^"]+)"/);
    if (match) {
      artifacts[match[1]] = match[2];
    }
  }
  
  return artifacts;
}

function parseExistingArtifactsFile(content) {
  const match = content.match(/export const SEASONAL_ARTEFACT\s*=\s*{([\s\S]*?)};/);
  if (!match) {
    return {};
  }

  const parsed = {};
  for (const line of match[1].split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const entryMatch = trimmed.match(/["']([^"']+)["']\s*:\s*["']([^"']+)["']/);
    if (entryMatch) {
      parsed[entryMatch[1]] = entryMatch[2];
    }
  }

  return parsed;
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
    // Fetch TypeScript file
    console.log('📥 Downloading chapters.ts...');
    const chaptersContent = await fetchText(CHAPTERS_URL);
    console.log('📥 Downloading images.ts (for artefact assets)...');
    const imagesContent = await fetchText(IMAGES_URL);
    
    // Parse data
    console.log('\n🔬 Parsing chapter data...');
    const seasons = parseSeasons(chaptersContent);
    const artifacts = parseSeasonalArtifacts(chaptersContent);
    const artifactAssetPaths = parseArtifactAssets(imagesContent, artifacts);
    
    console.log(`✅ Found ${seasons.length} seasons`);
    console.log(`✅ Found ${Object.keys(artifacts).length} seasonal artifacts\n`);
    
    // Check for new seasons
    const currentContent = fs.existsSync(LOCAL_ARTIFACTS_FILE)
      ? fs.readFileSync(LOCAL_ARTIFACTS_FILE, 'utf8')
      : '';
    const previousArtifacts = currentContent
      ? parseExistingArtifactsFile(currentContent)
      : {};
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
    
    // Determine which artifact assets really need downloading
    const artifactChanges = Object.entries(artifacts).filter(
      ([season, artifact]) => previousArtifacts[season] !== artifact,
    );
    const artifactsToDownload = [
      ...new Set(artifactChanges.map(([, artifact]) => artifact)),
    ];
    console.log('🖼️  Checking for missing artifact images...');
    const downloadedAssets = [];
    const failureReasons = [];

    if (artifactsToDownload.length === 0) {
      console.log('✨ No new artifact images to download.\n');
    } else {
      for (const artifact of artifactsToDownload) {
        // Prefer the filename/extension from the official import path when available
        const mappedPath = artifactAssetPaths[artifact];
        const mappedExt = mappedPath ? path.extname(mappedPath).toLowerCase() : '';
        const slugBase = mappedPath
          ? path.basename(mappedPath, path.extname(mappedPath))
          : artifact.toLowerCase().replace(/\s+/g, '_');

        const slugFilename = `${slugBase}.webp`; // canonical filename used by the app

        // Candidate URLs should always prefer the canonical world asset
        const candidateUrls = [
          `${ASSETS_BASE_URL}/${slugFilename}`,
          `${ASSETS_FALLBACK_URL}/${slugFilename}`,
        ];

        const slugResult = await ensureAsset(slugFilename, candidateUrls);
        if (slugResult.success) {
          downloadedAssets.push(slugFilename);
          hasChanges = true;
        } else if (slugResult.reason && slugResult.reason !== 'already exists') {
          failureReasons.push(`${slugFilename}: ${slugResult.reason}`);
        }

        // If the official asset exists but isn't webp, download it as-is too (for reference and future-proofing)
        if (mappedPath && mappedExt && mappedExt !== '.webp') {
          const mappedFilename = path.basename(mappedPath);
          const mappedResult = await ensureAsset(mappedFilename, [
            buildRawAssetUrl(mappedPath),
          ]);
          if (mappedResult.success) {
            downloadedAssets.push(mappedFilename);
            hasChanges = true;
          } else if (mappedResult.reason && mappedResult.reason !== 'already exists') {
            failureReasons.push(`${mappedFilename}: ${mappedResult.reason}`);
          }

          // If we have the official asset (e.g., .png) but still lack the slugged .webp, copy it as a fallback
          const copied = copyIfMissing(mappedFilename, slugFilename);
          if (copied) {
            downloadedAssets.push(`${mappedFilename}→${slugFilename}`);
            hasChanges = true;
          }
        }

        // If we had no mapped path (or still missing), try generic icon/raw paths as a last resort and copy to slug .webp
        if (!fs.existsSync(path.join(ASSETS_DIR, slugFilename))) {
          const genericCandidates = [
            buildRawAssetUrl(`assets/icons/${slugBase}.png`),
            buildRawAssetUrl(`assets/icons/${slugBase}.webp`),
            buildRawAssetUrl(`assets/resources/${slugBase}.png`),
            buildRawAssetUrl(`assets/resources/${slugBase}.webp`),
          ];

          const genericResult = await ensureAsset(slugFilename, genericCandidates);
          if (genericResult.success) {
            downloadedAssets.push(slugFilename);
            hasChanges = true;
          } else if (genericResult.reason && genericResult.reason !== 'already exists') {
            failureReasons.push(`${slugFilename}: ${genericResult.reason}`);
          }
        }
      }

      if (downloadedAssets.length === 0) {
        console.log('\n⚠️  Unable to download the new artifact assets.');
        if (failureReasons.length > 0) {
          console.log('Reasons:');
          failureReasons.forEach(reason => console.log(`  - ${reason}`));
        }
        console.log('');
      } else {
        console.log(`\n✅ Downloaded ${downloadedAssets.length} new assets\n`);
      }
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
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating seasons:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();



