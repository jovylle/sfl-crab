# src/services/ — network layer

Every service here calls a `/api/*` Netlify proxy. One rule: **land-data requests
must go through `landFetchCoordinator.js`**, never straight to `landApiService`.
See [docs/API_LAYER.md](../../docs/API_LAYER.md) for the full pipeline + policy.

| Service | Endpoint(s) | Purpose | Callers | Caching / dedup |
|---|---|---|---|---|
| `landFetchCoordinator.js` ⭐ | (none — orchestrates) | **The only door to the SFL farm API**: single-flight, 5-min localStorage freshness, cooldown, bypass policy | `useLandSync`, `PracticeDigging.vue` | single-flight per `env:landId`, localStorage TTL, 15/30s cooldown |
| `landApiService.js` | `/.netlify/functions/sfl-api/community/farms/:id` (+ `/visit/` fallback) | Raw fetch to the SFL API proxy; prod→test env fallback; 429 mapping | `landSyncService` only (via coordinator) | none client-side (proxy has 60s cache) |
| `landSyncService.js` | (delegates) | Thin wrapper: rethrows 429 with friendly message | `landFetchCoordinator` | none |
| `practicePatternService.js` | `/api/practice-patterns?utcDate=` | Today's / past-date formation patterns from the hub | `usePracticePatterns` | per-day localStorage cache + single-flight (in composable) |
| `digDayApiService.js` | `/api/dig-day` | Fetch/save dig-day snapshots (ETag + idempotent writes) | `useDigDayStore`, history views | ETag revalidation + freshness cache (see DIG_DAY_SYNC.md) |
| `hubAuthService.js` | `/api/hub-auth` | OTP send/verify, session token | `useHubSession`, login views | none (auth) |
| `hubProfileService.js` | `/api/hub-profile` | Hub user profile read/write | account views | none |
| `practiceHubService.js` | `/api/practice-runs` | Submit practice runs, score settings, nickname | `PracticeDigging.vue` | none (writes) |
| `practiceRunApiService.js` | `/api/practice-run?id=` | Fetch a single saved practice run for replay | `PracticeDigging.vue` replay | none |
| `adminBlobService.js` | `/api/admin-blobs` | Admin blob storage (solver fixtures etc.) | `/admin` | none |

Hub calls attach `Authorization: Bearer <jwt>` when a session exists — that lives
in `src/features/hub/hubClient.js` (`hubAuthHeaders()`).

Do **not** add a new service that calls the SFL farm API directly. Extend the
coordinator instead.
