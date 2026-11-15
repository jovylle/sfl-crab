# d1g.uk cache / TTFB audit (read-only)

## TTFB medians (4 samples each, seconds)

| Path | via Cloudflare (d1g.uk) | direct Netlify (d1guk.netlify.app) | size_download (bytes) |
|---|---:|---:|---:|
| / | 0.1081 | 0.2624 | 2524 / 2850 |
| /practice | 0.1073 | 0.1517 | 2524 / 2850 |
| /assets/main-iIH7X36M.js | 0.1927 | 0.4682 | 360915 |
| /api/practice-patterns | 0.1033 | 0.4207 | 112259 |

## Header facts (representative last sample)

| Label | status | cache-control | cf-cache-status | cache-status | age | x-nf-request-id |
|---|---:|---|---|---|---:|---|
| cf_root | 200 | public,max-age=0,must-revalidate | DYNAMIC | Netlify Edge hit | 17265 | yes |
| nf_root | 200 | public,max-age=0,must-revalidate | n/a | Netlify Edge hit | 4 | yes |
| cf_practice | 200 | public,max-age=0,must-revalidate | DYNAMIC | Netlify Edge hit | 64 | yes |
| nf_practice | 200 | public,max-age=0,must-revalidate | n/a | Netlify Edge hit | 193 | yes |
| cf_asset | 200 | public, max-age=14400, must-revalidate | REVALIDATED | Netlify Edge fwd=miss stored | 1 | yes |
| nf_asset | 200 | public,max-age=0,must-revalidate | n/a | Netlify Edge fwd=miss stored | 0 | yes |
| cf_api | 200 | public,max-age=60,must-revalidate | DYNAMIC | Netlify Edge hit | 378 | yes |
| nf_api | 200 | public,max-age=60,must-revalidate | n/a | Netlify Edge hit | 64 | yes |

## _headers question

- File listing evidence: `_headers` exists only at repo root (`/Volumes/.../sfl-crab/_headers`); `dist/_headers` and `public/_headers` are both absent; netlify.toml sets `publish = "dist"`. Netlify only reads `_headers` from the publish directory.
- Live evidence: direct Netlify `/assets/main-iIH7X36M.js` returns `cache-control: public,max-age=0,must-revalidate` (not `public, max-age=31536000, immutable`); `/world/ancient_clock.webp` returns `public, max-age=14400, must-revalidate`. Via Cloudflare asset returns `public, max-age=14400, must-revalidate`.
- Conclusion: the repo's `_headers` rules are NOT being applied at all (`headers_applied = false`).

## Pages migration blockers

Functions: 11. Total dist/ size: 9,962,926 bytes (~9.5 MiB). @netlify/blobs imports: 4 files.

| function file | what it does | Netlify-specific features | port effort | reason |
|---|---|---|---|---|
| admin-blobs.cjs | Admin CRUD over Netlify Blobs stores | event shape, getStore, ADMIN_PASSWORD, connectLambda | high | Direct @netlify/blobs dependency; needs replacement store + auth port |
| build-daily-pattern.cjs | Builds/seeds daily practice snapshot into blobs | event shape, queryStringParameters, DAILY_SNAPSHOT_SECRET, initBlobContext | med | Blob read/write via store helper; adapter needed |
| dig-day.cjs | Proxies dig-day snapshots to hub API | event shape, x-nf-client-connection-ip, HUB_API_BASE/HUB_WRITE_SECRET, redirect proxying | low | Pure fetch proxy |
| feedback.cjs | Stores feedback reports in Netlify Blobs | event shape, connectLambda/getStore, x-nf-client-connection-ip, CORS | med | Blob write + connectLambda |
| hub-auth.cjs | Proxies /api/hub-auth/* to hub auth API | event shape, pathParameters/rawPath splat, HUB_API_BASE, redirect proxying | low | Pure fetch proxy |
| hub-profile.cjs | Proxies /api/hub-profile/* to hub profile API | event shape, pathParameters/rawPath splat, HUB_API_BASE, redirect proxying | low | Pure fetch proxy |
| practice-patterns.cjs | Serves daily practice patterns from blob snapshot | event shape, getStore, Netlify CDN cache headers, initBlobContext | high | Netlify-specific durable CDN cache headers + blob store |
| practice-run.cjs | Proxies a single practice run to hub API | event shape, HUB_API_BASE, redirect proxying | low | Pure fetch proxy |
| practice-runs.cjs | Proxies practice-runs list/submit to hub API | event shape, HUB_API_BASE, redirect proxying | low | Pure fetch proxy |
| projectmate-feedback.cjs | Proxies /api/projectmate/* to ProjectMate Worker | event shape, pathParameters/rawPath, PROJECTMATE_WORKER_URL/ADMIN_KEY, redirect proxying | low | Pure fetch proxy with env vars |
| sfl-api.cjs | Proxies Sunflower Land API with 60s in-memory cache | event shape, SFL_API_KEY/SFL_API_KEY_DEV, redirect proxying | low | Pure fetch proxy |

Blob stores read/written: practice-daily-patterns (read/write), dig-day-snapshots (read/write), feedback-reports (write). Files importing @netlify/blobs: _practiceDailyStore.cjs, _digDayStore.cjs, admin-blobs.cjs, feedback.cjs.

Env vars required: ADMIN_PASSWORD, DAILY_SNAPSHOT_SECRET, HUB_API_BASE, HUB_WRITE_SECRET, PROJECTMATE_WORKER_URL, PROJECTMATE_ADMIN_KEY, SFL_API_KEY, SFL_API_KEY_DEV.

## What this means

1. Cloudflare fronting cuts median TTFB roughly 2-4x vs direct Netlify for all four paths, so the CF proxy is already the fast path users hit.
2. The repo's `_headers` long-cache/immutable rules are dead config (file not in publish dir), so assets are served with Netlify's default max-age=0 (direct) / a 4h value via CF, not the intended 1-year immutable caching.
3. Migrating to Cloudflare Pages means porting 11 functions: 9 are low/med effort fetch proxies, but 2 (practice-patterns, admin-blobs) plus the shared blob stores are high effort because they depend on @netlify/blobs and Netlify-specific durable CDN cache headers.
4. Blob-backed data (practice-daily-patterns, dig-day-snapshots, feedback-reports) must be migrated to a Cloudflare-native store (KV/R2/D1) before cutover, including the daily snapshot seeding cron.
5. Redirects in public/_redirects and netlify.toml (11 rules) need equivalent Pages `_redirects`/`_routes.json` or Worker routing, and the /* -> index.html SPA fallback must be preserved.
