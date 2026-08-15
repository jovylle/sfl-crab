# API Layer

> Canonical reference for how **sfl-crab / d1g.uk** talks to the Sunflower Land farm API and the Digging Hub. Read this before touching anything that fetches land data. It documents the **request pipeline, every trigger point, every caching layer, and the bypass/cooldown policy** — the stuff that used to be scattered across six files.

## The one rule

> **Never call `fetchLandDataFromServer()` from a component or composable.**
> All land-data requests go through `requestLandData()` in
> `src/services/landFetchCoordinator.js`. If you find a direct call, it's a bug.

## Request pipeline (land data)

```
Component / view
   │  e.g. Digging.vue onMounted, LandLoader, RefreshLandData,
   │       PracticeDigging "start round", useApiEnvironmentSwitch
   ▼
useLandSync (src/composables/useLandSync.js)     ← UI state only
   │  isLoading / isCooldown / remaining countdown, dispatch landDataReady
   ▼
landFetchCoordinator (src/services/landFetchCoordinator.js)   ← ALL decisions
   │  1. fresh localStorage cache?   → return, zero network
   │  2. cooldown active?            → serve stale cache, zero network
   │  3. in-flight same (env,land)?  → join it (single-flight)
   │  4. else fetch + write cache + arm cooldown
   ▼
landSyncService / landApiService (src/services/*.js)   ← pure fetch, error mapping
   │  prod → test env fallback, 429 message mapping
   ▼
Netlify proxy  sfl-api.cjs (netlify/functions/sfl-api.cjs)   ← server-side key,
   │  60s in-memory cache, bypassable via x-sfl-bypass-cache
   ▼
Sunflower Land public API (api.sunflower-land.com | api-dev.sunflower-land.com)
```

## Every trigger point (what fires a request)

| Trigger | Caller | Mode | Result |
|---|---|---|---|
| Land page mounts, cache stale (>5 min) | `Digging.vue` onMounted | auto | 1 network call (single-flight with LandLoader) |
| Land selected via LandLoader | `LandLoader.vue` goToLand | auto | joins the mount's request — never a second call |
| User clicks "Refresh Data" | `RefreshLandData.vue` | `bypassCache: true` | fresh from SFL API, respects 15s cooldown (button disabled during it) |
| Prod ↔ testnet switch | `useApiEnvironmentSwitch` | `force: true, bypassCache: true` | fresh from the other server, skips cooldown |
| Practice "today's round" on a land | `PracticeDigging.vue` startLandRound | auto | reuses the digging page's cache if fresh |
| Practice patterns (hub) | `usePracticePatterns` | auto | separate path — own single-flight + daily cache, see below |

The **practice patterns** path (`/api/practice-patterns` via `practicePatternService.js`)
is separate: it has its own single-flight (`ongoingFetch` + `window[...]` key in
`usePracticePatterns.js`) and a per-day localStorage cache. Leave it alone.

The **dig-day hub** path (`digDayApiService.js`) is also separate and already good:
ETag + freshness cache + force flag. See [DIG_DAY_SYNC.md](./DIG_DAY_SYNC.md).

## Caching layers (land data)

| Layer | What it holds | Lifetime | Bypassed by |
|---|---|---|---|
| Proxy in-memory cache (`sfl-api.cjs`) | last 200 response per `env:path` | 60s | `bypassCache: true` (user refresh, env switch) |
| Coordinator single-flight | in-flight Promise per `env:landId` | duration of request | — (shared by design) |
| localStorage cache (`landData_<env>_<id>`) | `{ date, fetchedAt, visitedFarmState }` | until UTC date changes; "fresh" while < `LAND_CACHE_FRESH_MS` (5 min) | `force: true` or `bypassCache: true` |
| Cooldown (`landCooldownEnd_<env>_<id>`) | timestamp | 15s after success, 30s after failure | `force: true` only |

Cache keys are env-prefixed (`landData_` vs `landData_test_`) so prod and test
snapshots never mix — see `getLandDataStorageKey()` / `getLandCooldownStorageKey()`
in `src/config/api.js`.

## Policy table (`requestLandData(landId, { force, bypassCache })`)

| Caller intent | force | bypassCache | Fresh cache? | Cooldown? | Network? |
|---|---|---|---|---|---|
| Auto load (mount, navigation, practice round) | false | false | served | suppresses call | only if cache stale AND no cooldown |
| User "Refresh Data" | false | true | skipped | respected | yes (through proxy cache bypass) |
| Env switch | true | true | skipped | skipped | yes |

Notes:
- **Auto ≠ bypass.** Auto loads intentionally pass through the proxy cache — a
  repeat visit inside 60s is served by the proxy, not the SFL API.
- **Every network hit arms the cooldown**, including auto fetches. This is what
  stops navigation spam: mount → fetch → 15s window where remounts serve cache.
- `force` is reserved for the env switch. If you're tempted to use it elsewhere,
  you're probably trying to work around a policy bug — fix the policy instead.

## localStorage keys

All land-data keys live in `src/config/api.js` (builders) and
`src/constants/storageKeys.js` (fixed keys). Same for every other app key.

## Observability

The proxy logs one line per request: `sfl-api { env, path, landId, status, cache }`
where cache ∈ `hit | miss | bypass`. In the Netlify function logs you can verify
the policy is working: auto reloads inside 60s should show `hit` or `bypass`
only for explicit refreshes.

## Golden rules (why they exist)

1. **Single door to the SFL API** — dedup and cooldown only work if every caller
   goes through the coordinator. A direct call (the old `PracticeDigging.vue:595`)
   silently bypasses everything.
2. **Auto loads serve cache, refreshes force.** The proxy cache exists to absorb
   repeat traffic; `bypassCache` on every sync (the old behavior) made it dead.
3. **Cooldown is armed on every network hit.** Old `skipCooldown: true` callers
   neither checked nor set it, so repeated navigation fired unthrottled API calls.
4. **Freshness is advisory unless enforced.** `landCache.js` computed
   `shouldAutoFetch` for years, but callers fired anyway. The coordinator enforces it.
