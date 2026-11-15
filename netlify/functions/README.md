# Netlify Functions

## Hub auth (`hub-auth`)

Proxies `/api/hub-auth/*` → `{HUB_API_BASE}/v1/auth/*` (passwordless: Google OAuth, email approve-link/login, `/me`, logout).

Forwards `Authorization` when present. Hub backend must implement these routes (no password endpoints).

## Dig day snapshots (`dig-day`)

Proxies to **SFL Digging Hub** (`HUB_API_BASE` + `HUB_WRITE_SECRET` in Netlify env).

- **GET** `/api/dig-day?landId=12345&utcDate=2026-05-18`
- **POST** `/api/dig-day` with JSON body (`v`, `landId`, `utcDate`, `patterns`, `digs`, `markEvents`, `stats`)

Forwards `Authorization` when present (signed-in attribution). Guests still POST via `X-Hub-Write-Secret`.

Data is public by `landId`. Mark events merge append-only by `seq` (handled on hub).

GET responses use `Cache-Control: public, max-age=120`. The proxy forwards `If-None-Match` and exposes Hub `ETag` when present. See [`docs/HUB_CONSUMPTION_SPEC.md`](../../docs/HUB_CONSUMPTION_SPEC.md) for Hub-side idempotency and conditional GET work.

### Legacy blobs (migration only)

Old data may still be in Netlify Blobs `dig-day-snapshots`. Import with `sfl-digging-hub/scripts/import-blobs-to-hub.mjs`.

## Practice patterns (`practice-patterns`)

Daily pattern cache in store `practice-daily-patterns`. See `_practiceDailyStore.cjs`.

## Sunflower Land proxy (`sfl-api`)

Proxies `/.netlify/functions/sfl-api/*` → `api.sunflower-land.com` (or `api-dev` when the client sends `x-sfl-api-env: test`).

Structured logs go to **Netlify function logs** (Site → Functions → sfl-api → Logs). Each line looks like:

`sfl-api { env, path, landId, status, cache: 'hit' | 'miss' }`

**Hardening.** Only `GET /community/farms/<digits>` is forwarded (the legacy `/visit/<digits>` alias is rewritten to it); any other path returns 404 before the API key is used. CORS is an allow-list (d1g.uk, beta, development, the uft1.com hosts, `d1guk.netlify.app` and its deploy previews, localhost dev ports) with `Vary: Origin`; a request with a foreign `Origin` gets 403, and requests with no `Origin` are allowed. Land ids must be canonical (`[1-9]\d{0,19}`, a trailing slash is ignored); ids with leading zeros return 404 with no upstream call. Each IP is limited to 60 requests per minute (cache hits included), returning 429 with `Retry-After`. Separately, each warm instance makes at most 120 upstream calls per minute regardless of client identity (cache hits are free), because `cf-connecting-ip` can be forged on the direct `*.netlify.app` host; beyond that it returns 429. Blocked requests log `reason: 'origin_not_allowed' | 'path_not_allowed' | 'rate_limited' | 'upstream_budget'`. Tests: `tests/sflApiProxy.test.js`.

Only HTTP 200 responses are cached in-memory for 60s, up to 500 entries (expired entries are evicted first, then the oldest). Send `x-sfl-bypass-cache: 1` (or `?bypassCache=1`) to skip the cache — the app does this on every land sync / Refresh Data click. `/visit/*` often returns 401 for third-party tools — the app uses `/community/farms/*` instead.

## Admin UI (`/admin`)

Password-protected blob browser. Set `ADMIN_PASSWORD` in Netlify env (or `.env` for `netlify dev`), then open `/admin` on the site.

API: `GET/DELETE/POST /api/admin-blobs` with `Authorization: Bearer <ADMIN_PASSWORD>` (see `admin-blobs.cjs`).
