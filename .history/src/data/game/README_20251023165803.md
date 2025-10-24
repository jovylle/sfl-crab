# Game Data (Auto-synced from Sunflower Land)

Auto-synced daily from https://github.com/sunflower-land/sunflower-land

## Files
- `treasurePrices.json` - Treasure sell prices
- `gameConstants.json` - Game constants (FREE_DIGS, GRID_SIZE, etc.)

## Updates
- **Automatic**: Daily at 00:00 UTC via GitHub Actions
- **Manual**: Run `npm run sync-game-data`

## Format
```json
{
  "lastUpdated": "ISO timestamp",
  "source": "GitHub URL",
  "version": "1.0.0",
  "data": { ... }
}
```
