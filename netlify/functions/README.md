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

Only HTTP 200 responses are cached in-memory for 60s. Send `x-sfl-bypass-cache: 1` (or `?bypassCache=1`) to skip the cache — the app does this on every land sync / Refresh Data click. `/visit/*` often returns 401 for third-party tools — the app uses `/community/farms/*` instead.

## Admin UI (`/admin`)

Password-protected blob browser. Set `ADMIN_PASSWORD` in Netlify env (or `.env` for `netlify dev`), then open `/admin` on the site.

API: `GET/DELETE/POST /api/admin-blobs` with `Authorization: Bearer <ADMIN_PASSWORD>` (see `admin-blobs.cjs`).
