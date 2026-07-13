// src/utils/tileState.js
// Shared board-tile helpers.

// A tile is "revealed" when its (flattened) classes include a real API tile
// type. Revealed treasures are stored as one space-joined string
// ('treasure actual-treasure'), so flatten each class token before testing.
export function isRevealed (tile) {
  const classes = (Array.isArray(tile) ? tile : String(tile).split(' '))
    .flatMap(c => String(c).split(' '))
  return classes.some(c => c === 'sand' || c === 'crab' || c === 'treasure')
}
