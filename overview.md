# SFL Crab / d1g.uk - Project Overview

> **Purpose:** This document provides context for AI assistants in Cursor to quickly understand the project architecture, data flow, and key concepts.

---

## 🎯 Project Summary

**d1g.uk** (SFL Crab) is a visual assistant tool for **Sunflower Land** players to help with desert digging gameplay. It's a pure frontend application that fetches live game data and provides an interactive grid interface for tracking digs, hints, and treasures.

- **Live URLs:**
  - Main: https://d1g.uk
  - Mirrors: https://sfl.uft1.com, https://sfl-digging.uft1.com
  - Dev/Beta: https://beta.d1g.uk, https://development.d1g.uk

- **Tech Stack:**
  - Vue 3 (Composition API with `<script setup>`)
  - Vite (build tool & dev server)
  - TailwindCSS + DaisyUI (styling)
  - Vue Router (navigation)
  - Netlify Functions → **SFL Digging Hub API** (dig-day, practice, passwordless auth proxy)
  - Optional **passwordless sign-in** (Google or email OTP)—guests use Land ID only; see `src/constants/storageKeys.js`

- **Repository:** https://github.com/jovylle/sfl-crab

---

## 🎮 Game Mechanics Context

Understanding these Sunflower Land desert digging mechanics helps contextualize the code:

### Desert Digging Basics
- **Grid:** 10x10 tiles (coordinates 0-9 for both x and y)
- **Daily Digs:** Players get 5 free digs per day (can earn extra digs)
- **Objective:** Find treasures hidden in the desert sand

### Hints System
When players dig, they can find:
- **Crab** 🦀 - Indicates treasure is **1 tile away** (adjacent: up/down/left/right)
- **Sand** 🏖️ - Indicates treasure is **2 tiles away**
- **Treasure** 💎 - Actual treasure items (Hieroglyph, Cockle Shell, Wooden Compass, seasonal artifacts, etc.)

### Daily Treasure Patterns
Each day, the game server provides 7 treasure patterns (e.g., `"ARTEFACT_NINETEEN"`, `"HIEROGLYPH"`, `"COCKLE"`). These patterns map to specific coordinate formations defined in `DIGGING_FORMATIONS` (from the game's source code).

### Seasonal Artifacts
Each game season has a special artifact (e.g., "Coprolite" for "Better Together" season, "Broken Pillar" for "Great Bloom").

---

## 🏗️ Architecture Overview

### Directory Structure
```
sfl-crab/
├── src/
│   ├── views/              # Main page components (Digging, Details, TodaysChecklist)
│   ├── components/         # Reusable UI components (Grid, HintPicker, etc.)
│   ├── composables/        # Vue composables (state management)
│   ├── services/           # API integration layer
│   ├── router/             # Vue Router configuration
│   ├── utils/              # Helper functions
│   └── styles/             # CSS files
├── src_other/              # Copied from official Sunflower Land game repo
│   └── features/game/types/
│       └── desert.ts       # DIGGING_FORMATIONS and game type definitions
├── public/                 # Static assets (images, icons)
└── index.html              # Entry HTML file
```

### Key Composables (State Management)

**`useLandData.js`** - Central store for land/farm data
- Stores API response from `/api/community/farms/{landId}`
- Provides reactive `landData` ref
- Used by all components that need access to player's land info

**`useGridEngine.js`** - Core grid logic
- Manages 10x10 grid state (`tiles` array)
- Applies hint propagation logic (crabs → adjacent tiles, sand → 2 tiles away)
- Handles treasure detection and visual markers
- Key functions: `applyHint()`, `markTile()`, `clearTile()`

**`useGridManager.js`** - User interactions & custom marks
- Manages custom color marks (Red, Yellow, Green)
- Handles manual hint cycling (user can cycle through states)
- Stores marks in localStorage for persistence

**`useTodayTreasureNames.js`** - Pattern-to-treasure mapper
- Reads `patterns` array from API response
- Maps pattern keys to actual treasure names using `DIGGING_FORMATIONS`
- Returns array of today's treasure types

**`useHintsStorage.js`** - LocalStorage persistence
- Saves/loads custom hints and marks
- Key format: `hints_{landId}`

### Services

**`landApiService.js`** - API integration
- Fetches land data from Sunflower Land public API
- Endpoint: `/api/community/farms/{landId}`
- Normalizes response structure
- Handles errors (404, 429 rate limiting, network errors)

### Main Views

**`Digging.vue`** - Main interactive digging page
- Displays 10x10 grid
- Shows hint picker for manual marking
- Provides "Input Land ID" and "More" options menu
- Shows dig count and treasure order

**`Details.vue`** - Raw land data viewer
- Displays JSON/structured view of API response
- Useful for debugging and seeing all land properties

**`TodaysChecklist.vue`** - Focused checklist view
- Shows today's treasure patterns
- Displays which treasures to focus on
- Can refresh land data

---

## 🔄 Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. User enters Land ID (e.g., "12345")                       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. landApiService.fetchLandDataFromServer(landId)            │
│    → Calls: /api/community/farms/12345                       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. useLandData stores response                               │
│    → landData.value = { farm: { desert: {...}, ... } }      │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Components read from useLandData                          │
│    → Extract: desert.digging.grid, patterns, etc.           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. useGridEngine processes grid data                         │
│    → Applies hints (crabs → near-crab class)                │
│    → Applies treasures (actual-treasure class)              │
│    → Calculates hint propagation                            │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. Grid.vue renders interactive 10x10 grid                   │
│    → Each tile shows visual state (dug, hint, treasure)     │
│    → Users can click to cycle hints manually                │
└─────────────────────────────────────────────────────────────┘
```

---

## 📡 API Data Structure

### Endpoint
```
GET /api/community/farms/{landId}
```

### Response Structure
```json
{
  "farm": {
    "coins": 1676.20,
    "balance": "69.30744",
    "inventory": {
      "Sand Shovel": "2",
      "Sand Drill": "13",
      "Hieroglyph": "5",
      ...
    },
    "desert": {
      "digging": {
        "grid": [
          {
            "dugAt": 1746675720139,
            "x": 8,
            "y": 7,
            "items": {
              "Broken Pillar": 1
            },
            "tool": "Sand Shovel"
          },
          {
            "dugAt": 1746675733455,
            "x": 6,
            "y": 6,
            "items": {
              "Crab": 1
            },
            "tool": "Sand Shovel"
          }
        ],
        "extraDigs": 0,
        "streak": {
          "collectedAt": 1746460364677,
          "count": 1,
          "totalClaimed": 20
        },
        "patterns": [
          "ARTEFACT_NINETEEN",
          "ARTEFACT_SEVENTEEN",
          "ARTEFACT_SIXTEEN",
          "HIEROGLYPH",
          "COCKLE",
          "OLD_BOTTLE",
          "WOODEN_COMPASS"
        ]
      }
    },
    "henHouse": {...},
    "barn": {...}
  }
}
```

### Key Data Points Used
- `farm.desert.digging.grid[]` - Array of dug tiles with coordinates and items found
- `farm.desert.digging.patterns[]` - Today's 7 treasure patterns
- `farm.desert.digging.extraDigs` - Bonus digs available
- `farm.inventory` - Player's items (used to check shovel availability)

---

## 🗂️ Key Files Reference

### Core Application Files
- **`src/main.js`** - App entry point, sets up Vue app, router, and head management
- **`src/App.vue`** - Root component with drawer navigation
- **`src/router/index.js`** - Vue Router configuration (routes: /digging, /details, /todays-checklist)

### Views (Pages)
- **`src/views/Digging.vue`** - Main digging assistant page (default route)
- **`src/views/GuestDigging.vue`** - Alternative digging view
- **`src/views/Details.vue`** - Land details/raw data viewer
- **`src/views/TodaysChecklist.vue`** - Today's treasure focus list
- **`src/views/LandProfile.vue`** - Land profile information

### Critical Components
- **`src/components/Grid.vue`** - 10x10 interactive grid (the heart of the app)
- **`src/components/HintPicker.vue`** - Manual hint selection tool
- **`src/components/DigToolSection.vue`** - Dig tools and controls
- **`src/components/TodayPatterns.vue`** - Displays today's treasure patterns
- **`src/components/LandLoader.vue`** - Land ID input and data loading
- **`src/components/InputLandIdOrRefresh.vue`** - Modal for entering Land ID

### Composables (State Management)
- **`src/composables/useLandData.js`** - ⭐ Central land data store
- **`src/composables/useGridEngine.js`** - ⭐ Grid logic & hint propagation
- **`src/composables/useGridManager.js`** - User marks & manual hints
- **`src/composables/useTodayTreasureNames.js`** - Pattern to treasure mapper
- **`src/composables/useHintsStorage.js`** - LocalStorage persistence
- **`src/composables/useLandSync.js`** - Land data synchronization
- **`src/composables/useSoftReload.js`** - Soft reload functionality

### Services
- **`src/services/landApiService.js`** - API calls to Sunflower Land servers
- **`src/services/landSyncService.js`** - Land sync operations

### Game Data
- **`src/data/game/diggingFormations.js`** - ⭐ `DIGGING_FORMATIONS` object
  - Contains all treasure pattern formations (ARTEFACT_ONE through ARTEFACT_TWENTY_THREE, etc.)
  - Maps pattern names to coordinate arrays with treasure types
  - Extracted from official SFL repo for local use
- **`src/data/game/seasonalArtefacts.js`** - Seasonal artifact mappings
  - Maps season names to their artifacts (e.g., "Better Together" → "Coprolite")
  - Provides `getCurrentSeasonalArtefact()` helper function
  - Gracefully handles dates beyond defined seasons
- **`src_other/`** - ⚠️ **REFERENCE ONLY**: Temporary static data from SFL repo
  - DO NOT import directly from `src_other` in application code
  - Extract needed data to `src/data/game/` instead

### Utilities
- **`src/utils/api.js`** - API helper functions
- **`src/utils/getLandId.js`** - Extract Land ID from URL or storage
- **`src/utils/artefactIcons.ts`** - Treasure icon mappings

---

## 🔧 Common Development Tasks

### Adding a New Feature
1. Determine if it's a new page (add to `src/views/`) or component (add to `src/components/`)
2. If it needs state, create/use composables in `src/composables/`
3. Add route to `src/router/index.js` if it's a new page
4. Update navigation in `src/components/MainDrawer.vue` if needed

### Modifying Grid Behavior
- Edit `src/composables/useGridEngine.js`
- Key functions: `applyHint()`, `markTile()`, `clearTile()`, `resetGrid()`
- Hint propagation logic is in `applyHint()` function
- CSS classes for tiles: `near-crab`, `near-sand`, `near-hint-crab`, `actual-treasure`, `hint-treasure`

### Changing API Integration
- Edit `src/services/landApiService.js`
- API endpoint is configurable in `API_ENDPOINTS` constant
- Response normalization happens in `normalizeApiResponse()`

### Updating Game Data (Treasure Patterns, Seasons, etc.)
- **Local data files:** `src/data/game/diggingFormations.js` and `seasonalArtefacts.js`
- **Source of truth:** Official Sunflower Land game repository
- **Process:**
  1. Check `src_other/features/game/types/desert.ts` for updates
  2. Manually extract relevant data to `src/data/game/` files
  3. Never import directly from `src_other` in application code
  4. Update when new patterns/seasons are added to the game

### Styling Changes
- Global styles: `src/styles/style.css`
- Uses Tailwind utility classes throughout
- DaisyUI components (buttons, modals, drawers)
- Theme switching available via `src/components/ThemeToggle.vue`

---

## 💾 Data Persistence

### LocalStorage Keys
- `hints_{landId}` - Custom hints and marks for specific land
- `landId` - Last used Land ID
- `theme` - User's theme preference (light/dark)

### State Management Pattern
The app uses Vue's Composition API with composables instead of Vuex/Pinia:
- Composables return reactive refs/computed values
- Components import and use composables directly
- Shared state is managed through singleton composable instances

---

## 🎨 UI/UX Features

### Grid Interactions
- **Click tile** - Cycle through hint states (empty → crab → sand → treasure → custom)
- **Visual markers** - Color-coded tiles (near-crab, near-sand, actual treasures)
- **Custom marks** - Red, Yellow, Green labels for user notes
- **Treasure order** - Shows order to focus on today's treasures

### Responsive Design
- Mobile-friendly with drawer navigation
- Grid scales to fit screen size
- Touch-friendly tile interactions

### Theme Support
- Light/dark mode toggle
- DaisyUI theme system
- Persistent theme preference

---

## 🐛 Debugging Tips

### Console Logging
The app has extensive console logging for debugging:
- `useTodayTreasureNames` logs pattern processing
- `useGridEngine` logs hint application
- Check browser console for errors and state changes

### Common Issues
- **Grid not loading:** Check if Land ID is valid and API is responding
- **Patterns not showing:** Verify `DIGGING_FORMATIONS` has the pattern keys
- **Hints not propagating:** Check `applyHint()` logic in `useGridEngine.js`
- **API errors:** Check network tab for failed requests (404, 429 rate limit)

### Testing with Sample Data
- Use `api_response.json` or `new_api_response.json` in project root as sample data
- These files contain real API responses for testing

---

## 📦 Build & Deployment

### Development
```bash
npm install          # Install dependencies
npm run dev          # Start dev server at localhost:5173
```

### Production Build
```bash
npm run build        # Builds to dist/
npm run preview      # Preview production build locally
```

### Deployment
- Built files go to `dist/` directory
- Static hosting (Netlify, Vercel, etc.)
- No server-side rendering needed
- No environment variables required (API is public)

---

## 🤝 Contributing

See `CONTRIBUTING.md` for contribution guidelines.

Key points:
- Fork + Pull Request workflow
- Create feature branches
- Clear commit messages
- No direct pushes to `main`

---

## 📝 License

MIT License - See `LICENSE` file

---

## 🔗 Related Resources

- **Sunflower Land Official:** https://sunflower-land.com
- **SFL Discord:** Community for players and developers
- **Game Repository:** Source of truth for game data types
- **Feedback Form:** https://forms.gle/zJayANHdjJ2EQvyB9

---

**Last Updated:** October 2025  
**Maintained By:** Community contributors (jovylle and others)

