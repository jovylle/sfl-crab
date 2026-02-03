# Season Update Guide

Every few months, Sunflower Land releases a new chapter/season. This guide helps you update the app when that happens.

## 🤖 Automated Updates (Recommended)

**Good news!** Season updates are now automated via GitHub Actions!

### How It Works

- **Automatic:** Runs on the 1st of every month at 00:00 UTC
- **Manual Trigger:** You can also trigger it manually from GitHub Actions tab
- **What It Does:**
  1. Fetches latest season data from SFL repository
  2. Updates `src/data/game/seasonalArtefacts.js` if changes detected
  3. Downloads new artifact `.webp` images to `public/world/`
  4. Commits and pushes changes automatically to `development` branch

### Manual Trigger

1. Go to: https://github.com/jovylle/sfl-crab/actions
2. Select "Update Seasons Data" workflow
3. Click "Run workflow" button
4. Select branch (usually `development`)
5. Click "Run workflow" green button

### Test Locally Before Deployment

You can also run the sync script locally:
```bash
npm run sync-artefact
```

This will check for updates and show you what would change without committing anything.

---

## 📋 Manual Update Checklist (If Needed)

If the automated workflow fails or you need to update manually:

## 🔍 How to Know When to Update

You'll get the `"No Season found"` error when:
- The current date is past the last defined season's end date
- A new season has started in the game

## 📋 Update Checklist

### 1. Check the Official SFL Repository

Go to: https://github.com/sunflower-land/sunflower-land

Look at these files:
- `src/features/game/types/seasons.ts` - Season dates and names
- `src/features/game/types/desert.ts` - Seasonal artifacts
- `src/features/game/types/treasure.ts` - Treasure definitions

### 2. Update Season Data

Edit `src/data/game/seasonalArtefacts.js`:

```javascript
// Add new season to SEASONAL_ARTEFACT object
export const SEASONAL_ARTEFACT = {
  // ... existing seasons ...
  "Better Together": "Coprolite",
  "New Season Name": "Moon Crystal", // 👈 Add new season here
}

// Add new season to the seasons array in getCurrentSeasonalArtefact()
const seasons = [
  // ... existing seasons ...
  { name: "Better Together", start: new Date("2025-08-04"), end: new Date("2025-11-03") },
  { name: "New Season Name", start: new Date("2025-11-03"), end: new Date("2026-02-01") }, // 👈 Add here
]
```

### 3. Download Missing Asset Images

The app needs `.webp` images in `public/world/` folder.

**Option A: Manual Download**
1. Go to: https://github.com/sunflower-land/sunflower-land/tree/main/public/world
2. Find the new artifact image (e.g., `moon_crystal.webp`)
3. Download it to `public/world/` in your local project

**Option B: Using curl**
```bash
# Example: Download moon_crystal.webp
curl -o public/world/moon_crystal.webp \
  https://raw.githubusercontent.com/sunflower-land/sunflower-land/main/public/world/moon_crystal.webp
```

**Option C: Clone and Copy**
```bash
# Clone the SFL repo somewhere temporary
git clone https://github.com/sunflower-land/sunflower-land.git /tmp/sfl-temp

# Copy the world assets
cp /tmp/sfl-temp/public/world/*.webp public/world/
cp /tmp/sfl-temp/public/world/*.png public/world/

# Clean up
rm -rf /tmp/sfl-temp
```

### 4. Verify the Asset Filename

The app looks for treasure images using this pattern:
- Treasure name: `"Moon Crystal"`
- Filename: `moon_crystal.webp` (lowercase, spaces → underscores)

Make sure the filename matches! Check in `public/world/`:
```bash
ls -1 public/world/ | grep -i moon
```

### 5. Test Locally

```bash
npm run dev
```

Visit a land page and check:
- No console errors
- Today's patterns show correctly
- New artifact images display properly

### 6. Build and Deploy

```bash
# Build
npm run build

# Commit changes
git add -A
git commit -m "Update for [New Season Name] season - Added Moon Crystal artifact"
git push
```

## 🎯 Quick Reference

### Automated Tools:

| Command | Description |
|---------|-------------|
| `npm run sync-artefact` | Fetch and update season data from SFL repo |
| `npm run check-assets` | Check for missing treasure asset images |
| GitHub Actions | Auto-runs monthly on the 1st at 00:00 UTC |

### Where to Update (Manual):

| What | File | Action |
|------|------|--------|
| Season dates & artifacts | `src/data/game/seasonalArtefacts.js` | Add new season entry |
| Asset images | `public/world/` | Download new `.webp` files |
| Documentation | This file | Update examples if needed |

### Common Artifacts by Season:

- Solar Flare → Dawn Breaker → Witches' Eve → Catch the Kraken → Spring Blossom → Clash of Factions → Pharaoh's Treasure: **Scarab**
- Bull Run: **Cow Skull**
- Winds of Change: **Ancient Clock**
- Great Bloom: **Broken Pillar**
- Better Together: **Coprolite**
- Next Season (?): **Moon Crystal** (?)

## 🐛 Troubleshooting

### "No Season found" error
- Update `seasonalArtefacts.js` with new season dates

### Missing image (broken icon)
- Check filename matches pattern: `treasure_name.webp` (lowercase, underscores)
- Download from SFL repo if missing

### Wrong artifact showing
- Verify `SEASONAL_ARTEFACT` mapping in `seasonalArtefacts.js`
- Check that `getCurrentSeasonalArtefact()` has correct date ranges

## 🔧 Automation Details

### GitHub Actions Workflow

The automation is defined in `.github/workflows/sync-artefact.yml`:
- Scheduled to run monthly
- Can be triggered manually
- Automatically commits changes if updates are found

### Update Script

The script `scripts/sync-artefact.js`:
- Fetches `seasons.ts` and `desert.ts` from SFL repo
- Parses TypeScript using regex patterns
- Generates updated `seasonalArtefacts.js` file
- Downloads missing artifact images
- Safe to run multiple times (idempotent)

## 📚 Additional Resources

- **SFL GitHub:** https://github.com/sunflower-land/sunflower-land
- **SFL Discord:** Ask community for season info
- **Game Wiki:** Check for new season announcements
- **GitHub Actions:** https://github.com/jovylle/sfl-crab/actions

---

**Last Updated:** November 2025

