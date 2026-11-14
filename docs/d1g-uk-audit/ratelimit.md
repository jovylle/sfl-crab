# Rate-limit audit — sfl-crab (d1g.uk)

Read-only inventory. Every claim cites file:line.

## A. Rate limiter table

| Function file | Endpoint (browser) | RATE_LIMIT | window ms | Client IP derivation (exact header lookup order) | Rejection | Retry-After | Bucket pruned? |
|---|---|---|---|---|---|---|---|
| netlify/functions/practice-runs.cjs | /api/practice-runs | 60 | 60000 | `x-nf-client-connection-ip` \|\| `client-ip` \|\| `x-forwarded-for` (first) \|\| `'unknown'` (practice-runs.cjs:32-39) | 429 `{error:"Too many requests"}` (practice-runs.cjs:78-83) | no | no |
| netlify/functions/dig-day.cjs | /api/dig-day | 30 | 60000 | same (dig-day.cjs:31-38) | 429 `{error:"Too many requests"}` + console.log (dig-day.cjs:124-137) | no | no |
| netlify/functions/feedback.cjs | /api/feedback | 30 | 60000 | same (feedback.cjs:36-43) | 429 `{error:"Too many requests"}` (feedback.cjs:122-130) | no | no |
| netlify/functions/hub-auth.cjs | /api/hub-auth/* | 40 | 60000 | same (hub-auth.cjs:32-39) | 429 `{error:"Too many requests"}` (hub-auth.cjs:86-94) | no | no |
| netlify/functions/hub-profile.cjs | /api/hub-profile/* | 60 | 60000 | same (hub-profile.cjs:32-39) | 429 `{error:"Too many requests"}` (hub-profile.cjs:85-93) | no | no |
| netlify/functions/practice-run.cjs | /api/practice-run | 60 | 60000 | same (practice-run.cjs:32-39) | 429 `{error:"Too many requests"}` (practice-run.cjs:75-83) | no | no |

All six use an in-memory `rateBuckets = new Map()` with no pruning (grep: no `.delete()`/`setInterval` on buckets; only rate-limit Map growth).

## B. Client fan-out table

| Caller file:line | Endpoint | When it fires | Awaited / fire-and-forget |
|---|---|---|---|
| src/views/Digging.vue:265 | /api/practice-patterns | on mount (onMounted) | awaited |
| src/composables/useLandData.js:88 | /api/practice-patterns | on land data load if today's cache missing | awaited |
| src/views/PracticeDigging.vue:553 | /api/practice-patterns | user action: newTodayRound | awaited |
| src/views/DiggingHistory.vue:237 | /api/practice-patterns | user action: applyHistoricalDate | awaited (Promise.allSettled) |
| src/views/PracticeDigging.vue:625 | /api/practice-run | user action: startReplayRound(runId) | awaited |
| src/views/PublicPracticeRun.vue:163 | /api/practice-run | on mount/route change (watch immediate) | awaited |
| src/views/PracticeDigging.vue:515 | /api/practice-runs | on round finish | fire-and-forget |
| src/composables/useDigDayStore.js:147 | /api/dig-day | on mount: loadFromServer (GET) | awaited |
| src/composables/useDigDayStore.js:169 | /api/dig-day | debounced 30s after mark edits + flush on hide/unload (POST) | fire-and-forget |
| src/views/PublicDigDay.vue:150 | /api/dig-day | on mount/route change (watch immediate) | awaited |
| src/views/DiggingHistory.vue:238 | /api/dig-day | user action: applyHistoricalDate (GET) | awaited (Promise.allSettled) |
| src/views/Account.vue:239 | /api/hub-profile/* | on mount: loadAccountData (GET profile) | awaited (Promise.all) |
| src/views/Account.vue:240 | /api/hub-profile/* | on mount: loadAccountData (GET saved-lands) | awaited (Promise.all) |
| src/views/Account.vue:268 | /api/hub-profile/* | user action: onAddLand (POST) | awaited |
| src/views/Account.vue:284 | /api/hub-profile/* | user action: onRemoveLand (DELETE) | awaited |
| src/composables/useHubSession.js:110 | /api/hub-auth/* | app startup if token + window focus (fetchMe) | fire-and-forget |
| src/features/auth/AuthCallbackView.vue:43 | /api/hub-auth/* | on mount after email-link redirect (fetchMe) | awaited |
| src/features/auth/LoginView.vue:193 | /api/hub-auth/* | user action: signInWithGoogle | awaited |
| src/features/auth/LoginView.vue:223 | /api/hub-auth/* | user action: sendApprovalLink | awaited |
| src/features/auth/LoginView.vue:238 | /api/hub-auth/* | user action: fallback OTP send | awaited |
| src/features/auth/LoginView.vue:264 | /api/hub-auth/* | user action: refreshApproval | awaited |
| src/features/auth/LoginView.vue:292 | /api/hub-auth/* | user action: verifyFallbackCode | awaited |
| src/components/FeedbackModal.vue:101 | /api/feedback | user action: send | awaited |
| src/views/Admin.vue:200 | /api/admin-blobs | user action: login | awaited |
| src/views/Admin.vue:233 | /api/admin-blobs | on mount: bootstrapSession | awaited |
| src/views/Admin.vue:256 | /api/admin-blobs | refreshKeys (listAdminBlobs) | awaited |
| src/views/Admin.vue:277 | /api/admin-blobs | user action: openKey | awaited |
| src/views/Admin.vue:301 | /api/admin-blobs | user action: rebuildSelected | awaited |
| src/views/Admin.vue:317 | /api/admin-blobs | user action: confirmDelete | awaited |
| src/views/Admin.vue:333 | /api/admin-blobs | debounced 400ms after prefixFilter change | fire-and-forget |

## C. Page budget (first 60s)

- `/practice`: 2-3 distinct /api/* requests. PracticeDigging.vue:675-688 on mount calls newTodayRound → refreshPracticePatterns (practice-patterns, line 553); a completed round fires submitPracticeRun to /api/practice-runs (line 515); a second today round adds another practice-patterns fetch.
- `/{farmId}/digging`: 3-4 distinct /api/* requests. Digging.vue:265 practice-patterns on mount; useDigDayStore.js:147 dig-day GET on mount; useDigDayStore.js:169 dig-day POST after ~30s debounce if marks changed (SYNC_DEBOUNCE_MS=30000 at line 18); plus useHubSession.js:110 hub-auth/me on startup if signed in.

## Hypothesis: IP derivation under Cloudflare proxy

The functions read the client IP with `x-nf-client-connection-ip` first (practice-runs.cjs:32-39, and identical blocks in dig-day.cjs:31-38, feedback.cjs:36-43, hub-auth.cjs:32-39, hub-profile.cjs:32-39, practice-run.cjs:32-39). Because d1g.uk is a proxied CNAME to Netlify through Cloudflare, Netlify's TCP peer is Cloudflare's edge, so `x-nf-client-connection-ip` most plausibly contains a Cloudflare edge address rather than the visitor's; that would collapse all visitors into one rate-limit bucket key and produce site-wide 429s. This is a hypothesis, not a confirmed fact.
