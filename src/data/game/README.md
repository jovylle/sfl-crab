# Game Data (Auto-synced from Sunflower Land)

Auto-synced daily from https://github.com/sunflower-land/sunflower-land

## Files
- `treasurePrices.json` - Treasure sell prices
- `gameConstants.json` - Game constants (FREE_DIGS, GRID_SIZE, etc.)
- `seasonalArtefacts.js` - Seasonal artifact mappings (manually extracted from SFL repo)
- `diggingFormations.js` - Treasure pattern formations (manually extracted from SFL repo)

## Updates
- **Automatic**: Weekly (Sundays 00:00 UTC) via the `sync-game-data` GitHub Action; seasonal artefacts monthly (1st–3rd) via `sync-artefact`
- **Manual**: Run `npm run sync-game-data`
- **Both branches**: syncs commit to `master` and are mirrored to `development` automatically (file-level copy of `src/data/game/` + `public/world/`), so prod and beta always carry identical game data

## Format
```json
{
  "lastUpdated": "ISO timestamp",
  "source": "GitHub URL",
  "version": "1.0.0",
  "data": { ... }
}
```
