# Dig-Day Hub Sync

> Deep dive on how a user's dig/mark state is persisted to the **SFL Digging Hub** and rendered as a shareable dig-day replay. See [ARCHITECTURE.md](./ARCHITECTURE.md) for the big picture and [GRID_MECHANICS.md](./GRID_MECHANICS.md) for grid semantics.

## Layers

```
useDigDayStore.js        composable — debounce, dirty-check, flush, merge-in
        │  fetchDigDay / saveDigDay
        ▼
digDayApiService.js      service — /api/dig-day, ETag/If-None-Match, sessionStorage cache
        │  GET/POST /api/dig-day
        ▼
netlify/functions/dig-day.cjs   proxy — rate limit, write secret, header passthrough
        │  GET/POST ${HUB_API_BASE}/v1/dig-day
        ▼
SFL Digging Hub (external, HUB_API_BASE, default https://beta.api.d1g.uk)
                                enforces merge-by-seq, 500 cap, 256 KB cap
```

**The old Netlify Blobs path (`_digDayStore.cjs`) is dead** — `dig-day.cjs` is now a pure pass-through proxy to the external Hub. `_digDayStore.cjs` survives only as a reference implementation of the merge rules the Hub enforces (see [dead-code register](./ARCHITECTURE.md#dead-code--gotchas-register)).

## 1. Composable — `src/composables/useDigDayStore.js`

Instances are cached in a module-level `Map` keyed by stringified landId, so all consumers of a land share one store.

**No-op guard.** `isPersistableLandId()` requires a pure-numeric id that is not `guest`/`0`/empty. Non-persistable ids get a `noopStore` with zero network activity.

**State:** `syncStatus` (`idle | loading | syncing | saved | error | auth_required`), `lastUpdatedAt`, `syncError`, `hubReplayUrl`.

**Dirty check (fingerprint).** `buildSyncCore()` builds the lean payload snapshot; `buildSyncFingerprint()` is its `JSON.stringify`. `syncToServer()` bails immediately if the fingerprint is unchanged, and only advances `lastSyncFingerprint` after a successful save. This is the client-side guard against redundant POSTs.

**30s debounce.** `SYNC_DEBOUNCE_MS = 30_000`. `scheduleSync()` returns early if not hydrated or fingerprint unchanged; otherwise it (re)arms a 30s timer that calls `syncToServer()`. The long window deliberately batches dig/mark bursts into few Hub writes.

**What triggers a sync:** mark-journal handlers (`onPick`/`onClearAll`), `upsertFromApi()`, and a `watch` on a grid signal `"${timelineLength}:${lastDugAt}"`.

**Flush on exit.** `flushSyncIfDirty()` clears the timer and syncs immediately when dirty. It's wired to `visibilitychange` (when hidden) and `beforeunload`, plus `onBeforeUnmount` (which also removes listeners and deletes the Map entry). This makes persistence reliable even if the debounce hasn't fired.

**Merge-in of remote.** `applyRemote(remote)` calls `journal.mergeServerEvents(remote.markEvents)`, updates `lastUpdatedAt`, and resolves `hubReplayUrl`. The composable **delegates** ETag handling to the service and merge-by-seq to the mark journal / Hub — it doesn't implement them itself.

**Testnet / test-API are flagged, not suppressed.** `shouldHideLandIdOnHub(landId)` is true when the API env is `test` OR the land is a testnet id (all-digit, ≥13 digits). When true, `buildSyncCore()` adds `hideLandId: true` to the payload — the record is still sent, but the Hub is told to hide it. The actual hiding happens Hub-side.

## 2. Service — `src/services/digDayApiService.js`

`API_BASE = '/api/dig-day'`. Auth headers via `hubAuthHeaders()` (`src/features/hub/hubClient.js`): always `Accept: application/json`, plus `Authorization: Bearer <token>` when a Hub session exists.

**`fetchDigDay(landId, utcDate, { force })`** — GET:
- Unless `force`, returns a fresh (<15 min) `sessionStorage` cache entry and skips the network entirely.
- Sends `If-None-Match` from the cached ETag when present.
- **304 Not Modified** → refreshes the cache timestamp and returns the cached body.
- **404** → treats "no record yet" as valid; caches and returns the body.
- **200** → writes cache (`body` + `etag` + `fetchedAt`) and returns parsed JSON.

**`saveDigDay(payload)`** — `POST /api/dig-day` with `Content-Type: application/json`. Throws `DigDayApiError` (carrying `.status`) on failure; **413** gets a specific message about the 256 KB limit (clear marks/history). On success, caches the returned body + ETag.

**`invalidateDigDayCache(landId, utcDate)`** — clears the cache entry.

Returned shape (from the Hub): `{ v, landId, utcDate, patterns, digs, markEvents, stats, updatedAt, hideLandId?, displayName?, ...replayUrl }`.

## 3. Proxy — `netlify/functions/dig-day.cjs`

Pass-through to `${hubBase()}/v1/dig-day` (GET forwards the query string; POST forwards the body). `hubBase()` (`_hubBase.cjs`) reads `HUB_API_BASE`, default `https://beta.api.d1g.uk`.

- **Rate limit:** 30 requests / 60s per client IP, tracked in an in-memory `Map`. Best-effort only — buckets are per warm Lambda instance, not global. Over-limit → `429`.
- **Write secret:** `HUB_WRITE_SECRET` is injected as `X-Hub-Write-Secret` **only on POST**. The incoming `Authorization` Bearer token is passed through on both methods.
- **Headers:** forwards `Accept`, `Content-Type`, `Authorization`, `If-None-Match` upstream. Echoes upstream status + `ETag` downstream. `Cache-Control` is `public, max-age=120, must-revalidate` for GET, `no-store` for POST.
- **CORS:** allowlist of `d1g.uk` subdomains + localhost + Netlify deploy-preview regex; exposes `ETag`, allows `If-None-Match`; `OPTIONS` → 204.

## 4. Caches & merge semantics

- **GET cache** (`src/utils/digDayCache.js`): `sessionStorage`, key `digDayCache_${landId}_${utcDate}`, entry `{ body, etag, fetchedAt }`, TTL 15 min. `getFreshDigDayCache()` is what lets `fetchDigDay` skip the network. All ops are try/catch-guarded for private mode / SSR.
- **Merge-by-seq (Hub-side):** mark events are deduped by `seq`, sorted ascending, and capped to the **latest 500** (append-only). Digs are replaced when the incoming set has more dig groups, or an equal count with a newer `updatedAt`. The **256 KB** payload cap yields a `413`. These rules are enforced by the external Hub; `_digDayStore.cjs` mirrors them as a reference (but is not executed).

## Related

- `useMarkJournal.js` / `markJournalBridge.js` — the client mark-event journal (`mergeServerEvents`, `getMarkEventsSnapshot`) that feeds this flow. (Client-side seq-merge internals live here.)
- `useDigReplay.js` — read-only replay player; consumes the same timeline + journal primitives but does **not** sync. The shareable Hub replay is surfaced via `hubReplayUrl`.
- `buildDigTimeline.js` — produces the `digs` timeline and the grid-change signal that triggers syncs.
- [HUB_CONSUMPTION_SPEC.md](./HUB_CONSUMPTION_SPEC.md) — the ETag/idempotency contract on the Hub side.
