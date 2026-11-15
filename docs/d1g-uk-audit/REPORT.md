# d1g.uk health audit — findings & fix plan

Repo: `sfl-crab` · Zone: `d1g.uk` (`c2d984539d88f1c8b7e3f22f51e839ab`, Free plan) · Origin: Netlify
(`d1guk.netlify.app`, proxied CNAME) · Data window: 2026-11-07 → 2026-11-14

Verification date: 2026-11-14. Nothing below has been applied or deployed.

---

## 0. What the audit numbers actually look like

| Source | Metric | Value |
|---|---|---|
| RUM (account dataset) | page loads, 7d | 288 distinct paths, `/digging` 913 loads (desktop 605 / mobile 300) |
| RUM | TTFB p75 desktop / mobile | **707 ms / 841 ms** |
| RUM | LCP p75 desktop / mobile | 1135 ms / **1804 ms** |
| RUM | INP p75 desktop / mobile | 104 ms / **304 ms** |
| RUM | CLS p75 | 0 |
| RUM | countries | VN 1366, ID 477, PH 477, BY 197, US 172 |
| Measured (curl, 4 samples) | TTFB `/practice` via CF vs direct Netlify | **0.107 s vs 0.152 s** |
| Measured (Chrome, 390×844) | `/digging` TTFB / load | **1015 ms / 2340 ms**, 18 requests, 221 KB |

The audit's "top path `/practice`" is wrong for the current week: `/digging` is #1 and
`/{farmId}/digging` occupies most of the long tail. Mobile traffic is 40% of loads but
carries all three of the weak vitals (TTFB, LCP, INP).

---

## 1. The 429s — root cause found (P0)

Six Netlify functions each carry an identical copy of a per-IP in-memory throttle:

| function | endpoint | limit |
|---|---|---|
| `dig-day.cjs:13` | `/api/dig-day` | **30 / 60 s** |
| `feedback.cjs:14` | `/api/feedback` | 30 / 60 s |
| `hub-auth.cjs:15` | `/api/hub-auth/*` | 40 / 60 s |
| `hub-profile.cjs:15` | `/api/hub-profile/*` | 60 / 60 s |
| `practice-run.cjs:15` | `/api/practice-run` | 60 / 60 s |
| `practice-runs.cjs:15` | `/api/practice-runs` | 60 / 60 s |

The key is derived the same way in all six (`dig-day.cjs:31-38` and siblings):

```js
event.headers['x-nf-client-connection-ip'] ||   // ← first choice
event.headers['client-ip'] ||
event.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
'unknown'
```

`d1g.uk` is a **proxied CNAME to Netlify**, so Netlify's TCP peer is a Cloudflare edge
address, not the visitor. If `x-nf-client-connection-ip` reflects the connecting peer,
every visitor behind the same Cloudflare colo shares **one** 30-request-per-minute
budget. That is exactly the failure shape you see: harmless for the US/EU, brutal for
VN/ID/PH where a whole country may egress through one or two Cloudflare addresses.

Volume check: `/{farmId}/digging` loads ≈ 1,700/week; each session issues ~1 `GET
/api/dig-day` + debounced `POST`s. 2,814 429s against a few thousand `dig-day`
requests per week is a large fraction throttled — consistent with a shared bucket.

Secondary defects in the same code, independent of the key:

- `rateBuckets` is never pruned — unbounded growth per lambda instance.
- No `Retry-After` header and a bare `{"error":"Too many requests"}`.
- Per-instance `Map` means the "limit" is really `limit × instanceCount`, so the
  throttle is neither reliable nor meaningful as a security control.

**Not confirmed:** whether a Cloudflare rate-limiting rule exists on the zone. This
token cannot read rulesets (`/rulesets/phases/http_ratelimit/entrypoint` → 403
`Authentication error`). The app-level throttle above is a sufficient cause on its own.

### Fix (one shared helper replaces six copies — ~120 lines deleted, ~40 added)

New file `netlify/functions/_rateLimit.cjs`:

```js
const WINDOW_MS = 60_000

function clientIp (event) {
  return (
    event.headers['cf-connecting-ip'] ||        // set by Cloudflare, not spoofable
    event.headers['x-nf-client-connection-ip'] ||
    event.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    'unknown'
  )
}

const buckets = new Map()
let lastSweep = 0

function sweep (now) {
  if (now - lastSweep < WINDOW_MS) return
  lastSweep = now
  for (const [k, b] of buckets) if (now - b.start > WINDOW_MS) buckets.delete(k)
}

function checkRateLimit (event, limit) {
  const now = Date.now()
  sweep(now)
  const ip = clientIp(event)
  let bucket = buckets.get(ip)
  if (!bucket || now - bucket.start > WINDOW_MS) {
    bucket = { start: now, count: 0 }
    buckets.set(ip, bucket)
  }
  bucket.count += 1
  if (bucket.count > limit) {
    const err = new Error('Too many requests — please retry in a moment')
    err.statusCode = 429
    err.retryAfter = Math.ceil((bucket.start + WINDOW_MS - now) / 1000)
    throw err
  }
}

module.exports = { checkRateLimit }
```

Per function (identical edit shape, limits re-tuned):

```diff
--- a/netlify/functions/dig-day.cjs
+++ b/netlify/functions/dig-day.cjs
@@
 const { hubBase } = require('./_hubBase.cjs')
+const { checkRateLimit } = require('./_rateLimit.cjs')
@@
-const RATE_LIMIT = 30
-const RATE_WINDOW_MS = 60_000
-const rateBuckets = new Map()
-
@@
-function getClientIp (event) {
-  return (
-    event.headers['x-nf-client-connection-ip'] ||
-    event.headers['client-ip'] ||
-    event.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
-    'unknown'
-  )
-}
-
-function checkRateLimit (ip) {
-  const now = Date.now()
-  let bucket = rateBuckets.get(ip)
-  if (!bucket || now - bucket.start > RATE_WINDOW_MS) {
-    bucket = { start: now, count: 0 }
-    rateBuckets.set(ip, bucket)
-  }
-  bucket.count += 1
-  if (bucket.count > RATE_LIMIT) {
-    const err = new Error('Too many requests')
-    err.statusCode = 429
-    throw err
-  }
-}
-
@@
-    checkRateLimit(getClientIp(event))
+    checkRateLimit(event, 120)
@@
     return {
       statusCode: err.statusCode || 429,
-      headers,
+      headers: { ...headers, 'Retry-After': String(err.retryAfter || 60) },
       body: JSON.stringify({ error: err.message }),
     }
```

Limits after the change: `dig-day` 120, `practice-runs`/`practice-run`/`hub-profile`
120, `hub-auth` 60, `feedback` 20. Same edit in `feedback.cjs`, `hub-auth.cjs`,
`hub-profile.cjs`, `practice-run.cjs`, `practice-runs.cjs`; the throttle call sites are
`dig-day.cjs:125`, `feedback.cjs:123`, `hub-auth.cjs:87`, `hub-profile.cjs:86`,
`practice-run.cjs:76`, `practice-runs.cjs:76`.

**Verify after deploy** (the only way to confirm the header hypothesis): make a request
and watch the function log line already present at `dig-day.cjs:126-132`, or add
temporarily:

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://d1g.uk/api/dig-day?landId=2374144993670076
# then in Netlify function logs, the `dig-day` entry should show a real visitor IP
```

If the logged key is still a Cloudflare address, add one line to the response:
`console.log('dig-day ip', clientIp(event))` and compare against
`curl -s https://api.d1g.uk/health`-style external checks.

**Expected effect:** 429s drop to ~0 for legitimate users; the only remaining 429s are
genuine floods, and those now carry `Retry-After`.

---

## 2. TTFB (P1)

Measured facts:

- HTML is `cache-control: public,max-age=0,must-revalidate` from Netlify and
  `cf-cache-status: DYNAMIC` at Cloudflare → **Cloudflare never caches the app shell**,
  every navigation costs a CF→Netlify round trip. With `cache_level: aggressive`,
  Cloudflare only auto-caches static extensions, so headers alone cannot fix this.
- Assets are worse: `/assets/main-*.js` (360 KB) returns `REVALIDATED` at the edge
  because the repo's long-cache headers are dead (see §2b).
- Cloudflare is already the fast path (0.107 s vs 0.152 s median vs Netlify direct),
  so the remaining latency is the hop itself plus the visitor's mobile network.

### 2a. Cache Rules (available on Free — 10 rules)

Through the dashboard (`Rules → Overview → Create rule`):

| # | Match | Setting |
|---|---|---|
| 1 | `http.host eq "d1g.uk" and http.request.uri.path eq "/api/practice-patterns"` | Cache eligible · Edge TTL *respect origin* (function already sends `CDN-Cache-Control: s-maxage=…, stale-while-revalidate=60`) |
| 2 | `http.host eq "d1g.uk" and http.request.method eq "GET" and not starts_with(http.request.uri.path, "/api/")` | Cache eligible · Edge TTL **60 s**, Browser TTL *respect origin* |

Rule 1 is pure win: a 112 KB JSON payload currently reaches Netlify ~1,200×/week.

Rule 2 is the one that actually moves TTFB p75, and it carries the only real risk in
this document: the SPA shell references hashed assets that Netlify drops on the next
deploy, so up to 60 s of stale HTML after a deploy = white screen for those users.
This token **cannot purge cache** (`POST /purge_cache` → 403), so either keep the TTL
at 60 s and accept that window, or widen the token (§6) and purge on deploy.

**Do not** cache HTML with a long Edge TTL while purge is unavailable.

### 2b. The `_headers` file is dead config (5-minute fix, do this regardless)

`_headers` sits at the repo root, but `netlify.toml` sets `publish = "dist"` and Netlify
only reads `_headers` from the publish directory. `dist/_headers` and
`public/_headers` do not exist, so none of the immutable rules apply:

```
$ curl -sI https://d1guk.netlify.app/assets/main-iIH7X36M.js
cache-control: public,max-age=0,must-revalidate      # not immutable
```

```bash
git mv _headers public/_headers
```

and change the catch-all rule in the moved file — `max-age=3600` on HTML would pin the
shell (and its asset hashes) for an hour after a deploy:

```diff
 # Main pages - shorter cache
 /*
-  Cache-Control: public, max-age=3600, must-revalidate
+  Cache-Control: public, max-age=0, must-revalidate
```

Effect: `/assets/*`, `/world/*`, `/images/*` become 1-year immutable at both Netlify and
Cloudflare edges; the 360 KB JS and the CSS stop revalidating on every navigation.

### 2c. Recommend: move the static build to Cloudflare Pages, proxy `/api/*` to Netlify

This is the lowest-risk route to a real TTFB improvement, and it does **not** require
porting functions (contrary to the usual Pages-migration assumption):

1. Create a Pages project from `jovylle/sfl-crab`, build `npm run build`, output `dist`.
2. Add `public/_redirects` proxy line **ahead of** the SPA fallback:
   `/api/*  https://d1guk.netlify.app/api/:splat  200`
3. Point `d1g.uk` at the Pages project (replaces the Netlify CNAME).
4. Keep Netlify as the function host; nothing in `netlify/functions/` changes.

Why this over full migration: 9 of 11 functions are plain fetch proxies, but
`practice-patterns.cjs` and `admin-blobs.cjs` depend on `@netlify/blobs` (4 files import
it, 3 stores: `practice-daily-patterns`, `dig-day-snapshots`, `feedback-reports`). Full
migration means rewriting both stores, the daily seeding cron, and 11 redirect rules
before anything ships — days of work for the same TTFB outcome this hybrid gets in an
hour. HTML becomes Cloudflare-native (edge-cached, instant purge on deploy, no stale
shell problem), and rollback is pointing the CNAME back at Netlify.

Note: with this proxy the functions see Cloudflare's egress address again, so §1's
`cf-connecting-ip`-first key stays necessary.

### 2d. `/digging` pays a 301 on the #1 path (free win)

`dist/digging/index.html` is a real directory, so Netlify's pretty-URLs answer
`/digging` with `301 → /digging/`. `/digging` is the top path (913 loads/week) and this
is a large slice of the 4.2k weekly 301s — one extra round trip on every visit.

```diff
--- a/netlify.toml
+++ b/netlify.toml
@@
 [[redirects]]
 from = "/api/projectmate/*"
 to = "/.netlify/functions/projectmate-feedback/:splat"
 status = 200
+
+# Serve the prerendered digging entry directly; skip Netlify's pretty-URL 301.
+[[redirects]]
+from = "/digging"
+to = "/digging/index.html"
+status = 200
+
 [[redirects]]
 from = "/*"
 to = "/index.html"
 status = 200
```

Verify: `curl -s -o /dev/null -w '%{http_code}\n' https://d1g.uk/digging` → `200`.

---

## 3. The 404s (P2) — one confirmed source, one blocked

Every SPA path returns 200 (verified), so 404s are API-shaped. Confirmed live:

| Request | Status |
|---|---|
| `GET https://api.d1g.uk/v1/dig-day?landId=9999999999999999` | 404 |
| `GET https://d1g.uk/api/dig-day?landId=9999999999999999` | 404 (pass-through) |
| `GET https://api.d1g.uk/v1/practice/runs/<missing-id>` | 404 `{"error":"Practice run not found"}` |

So: (a) `dig-day` forwards the hub's 404 verbatim for an unknown land ID — plausibly
bots or mistyped IDs; (b) expired/deleted practice-run share links 404. Both are real
but I cannot size them, because the per-path status breakdown needs
`zone.analytics.read`, which this token lacks (§6).

Cheapest mitigation once approved (proxy-level, 3 lines in `dig-day.cjs` and
`practice-run.cjs`): map the hub's 404 to `200` with `{ error }` so the SPA renders its
own "nothing here yet" state instead of an error, and so analytics stop counting a
normal empty state as a failure.

Blocked half: which paths produce the other ~1,600 404s is unknown until the token can
read edge analytics. Do not guess redirects before that number exists.

---

## 4. Mobile polish (P2) — measured, not guessed

Chrome, 390×844, `/digging` (latest build):

| Issue | Measurement | Fix |
|---|---|---|
| Horizontal scroll | `scrollWidth − innerWidth = 13px`; drawer `div.menu` extends to `right: 615` | `body { overflow-x: hidden }` (or `overflow-x: clip` on the app shell) |
| Tap targets under 44px | 29 elements; primary nav `Digging`/`Practice` 32px tall, `Input Land ID` 32px, `Use Land ID` 40px, feedback buttons 38px | mobile-only `min-height: 44px` on `.btn-sm` / nav links |
| INP p75 304 ms mobile (fails "good") | 118 KB JS transferred from a 352 KB shared `main-*.js` bundle, and `/digging` loads the same bundle as the shell | defer the dig-stats/solver chunks behind the existing "More" toggle; no new deps |
| Images without dimensions | 28 of 28 `<img>` have no `width`/`height` attrs | add intrinsic `width`/`height` (CLS is 0 today only because containers are sized — this is cheap insurance) |
| Small text | 9 elements under 12px | raise to 12px minimum in the footer/disclaimer |
| LCP 1804 ms mobile | blocking CSS took 474 ms in the cold sample | fixed for free by §2b (immutable CSS instead of revalidate-every-navigation) |

Alt text is complete (0 missing) — nothing to do there.

---

## 5. Uptime & maintenance (P3)

Current state: **no external monitor covers d1g.uk.** No reference in `~/fore/services`,
no CF Healthcheck (403/Free), and the only scheduled touch is
`.github/workflows/warm-daily-cache.yml`, which curls the site at 00:25 UTC but has no
failure notification — a silent outage persists until someone notices.

Cheapest adequate setup:

1. Uptime Kuma (already running on elitedesk): add three HTTP(s) checks —
   `https://d1g.uk/` (keyword `SFL DIGGING`), `https://d1g.uk/api/practice-patterns`
   (expect 200 + JSON), `https://api.d1g.uk/health` (expect `{"ok":true}`), 60 s interval.
2. Turn on **Always Online** (currently `off`) so a Netlify blip serves the cached shell
   instead of a Cloudflare 522 page.
3. Maintenance story without new code: a static `public/maintenance.html` plus a manual
   Cloudflare "Pause" is not needed — with §2c the shell is edge-cached, so origin
   maintenance degrades to stale-but-working app for API-free routes. For real
   maintenance windows, flip the Uptime Kuma monitor to maintenance mode and add a
   notice via the existing feature-flag/announcement mechanism.

---

## 6. One thing I need from you (2 minutes)

The token in `~/.env` cannot read analytics or rulesets or purge cache:

| Endpoint | Result |
|---|---|
| `GET /zones/<z>/rulesets/phases/http_ratelimit/entrypoint` | 403 Authentication error |
| `GET /zones/<z>/analytics/dashboard` | 403 |
| GraphQL `httpRequestsAdaptiveGroups` | 403 `zone.analytics.read` missing |
| `POST /zones/<z>/purge_cache` | 403 |
| GraphQL `rumPageloadEventsAdaptiveGroups` (account) | **works** |
| zone settings / DNS / page rules / pages / workers | works |

Wanted scopes: `Zone Analytics:Read`, `Zone Rulesets:Read`, `Cache Purge:Purge`.
That turns §3 from "one confirmed source" into a ranked list of 404 paths, confirms or
rules out a Cloudflare-side rate-limit rule, and makes §2a's HTML caching safe.

---

## Recommended order

1. **§1 throttle fix** — biggest user harm, smallest diff, no config change. (~40 lines)
2. **§2b `_headers` + §2d `/digging` 301** — two file moves, no risk, immediate asset win.
3. **§2a rule 1** (cache `/api/practice-patterns`) — dashboard only, zero risk.
4. **§3 404 fallbacks** — after the token widening tells you which paths matter.
5. **§4 mobile fixes** — one CSS pass + image dimensions.
6. **§5 monitors** — 15 minutes in Uptime Kuma.
7. **§2c Pages hybrid** — the real TTFB fix; schedule as its own change, not bundled.

Artifacts: `/tmp/d1g-audit/{analytics,ratelimit,cache}.{json,md}`, raw RUM responses in
`/tmp/d1g-audit/rum_paths.json`.
