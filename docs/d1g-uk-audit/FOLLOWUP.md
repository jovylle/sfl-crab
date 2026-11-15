# d1g.uk follow-up: owner actions and proposals

Branch: `d1g/followup-hardening-2026-11-14`, stacked on `audit/d1g-uk-health-2026-11-15`.
Companion to [REPORT.md](REPORT.md). Nothing in this file has been applied to Cloudflare,
Netlify or GitHub settings. Section 1 lists what only the owner can do. Section 3 lists
proposals that are deliberately not implemented.

Audience facts used below: about 240 visits/day (peak 330), mostly Vietnam, Indonesia and
the Philippines, 40% mobile. Last audit week: 2,814 HTTP 429s and 1,609 404s. Mobile TTFB
p75 is 841 ms.

---

## 1. Owner-only actions

Do these roughly in the order listed. (a) and (h) matter most.

### (a) Rotate `SFL_API_KEY` and `SFL_API_KEY_DEV`

Why: before this branch the `sfl-api` proxy accepted any path, answered every Origin with
`Access-Control-Allow-Origin: *` and had no rate limit. Anyone could call the Sunflower
Land API with your key through `https://d1g.uk/.netlify/functions/sfl-api/...`. Treat both
keys as exposed.

Order matters: set the new key first, revoke the old one last.

1. Request a new key as described in [API_KEY_SETUP.md](../../API_KEY_SETUP.md): log in at
   `https://sunflower-land.com/play`, open your profile/settings and generate or request a
   new key (format `sfl.<KEY>`). If the page offers no way to replace a key, ask in the
   Sunflower Land Discord (see (b)) and say you need to rotate a key that was exposed
   through an open proxy. Do the same for the test-server key used with
   `api-dev.sunflower-land.com`.
2. In Netlify: Site configuration > Environment variables. Edit `SFL_API_KEY` and
   `SFL_API_KEY_DEV` and paste the new values. Do not paste keys into chat, issues or
   commits.
3. Netlify functions read variables at deploy time, so trigger a deploy: Deploys >
   Trigger deploy > Deploy site (or merge the PR, which deploys anyway).
4. Check the live proxy with the commands in (h). A normal farm id must return 200.
5. Only after that, revoke the old keys in the Sunflower Land account.
6. Update your local `.env` with the new values. Never commit it.

### (b) Ask the Sunflower Land team whether a helper site is acceptable

Post in the Sunflower Land Discord (developer/community channel). Suggested message:

> I run d1g.uk, a free community digging helper for the Desert. It reads public farm data
> through `GET /community/farms/<id>` using one server-side API key, and the key is never
> sent to browsers. The site is supported by donations. I would like to confirm three
> things:
> 1. Is a public community helper allowed to use a single community API key, and what are
>    the terms for that key?
> 2. The key is held by an account with VIP and level 50 (the gate for getting a key).
>    Is it acceptable that the key is used for the site and not for personal use only?
> 3. Expected volume is about 240 visits/day (peak about 330). The proxy now allows only
>    `/community/farms/<digits>`, caches responses for 60 seconds and rate limits to 60
>    requests/minute/IP, with a cap of 120 upstream calls/minute per instance. Is that volume
>    fine, and is there a preferred limit?

Write the answer into `API_KEY_SETUP.md` once you have it.

### (c) Widen the Cloudflare API token scopes

The token used for the audit could not read analytics, rulesets or purge cache
(REPORT.md section 6). In the Cloudflare dashboard: My Profile > API Tokens > edit the
token > add these permissions for zone `d1g.uk`:

| Scope | What it unlocks |
|---|---|
| Zone > Analytics > Read | Per-path status breakdown of the 1,609 weekly 404s (REPORT.md section 3), edge 429 counts, cache hit ratio |
| Zone > Zone WAF or Rulesets > Read (`Zone Rulesets:Read`) | Confirms or rules out a Cloudflare rate-limit rule behind the 429s (REPORT.md section 1, "Not confirmed") |
| Zone > Cache Purge > Purge | Safe HTML caching with purge on deploy (REPORT.md section 2a rule 2) |

Save the token in your usual secret store, not in the repo.

### (d) Cloudflare Cache Rule 1 for `/api/practice-patterns`

From REPORT.md section 2a. About 1,200 requests/week of a 112 KB JSON payload currently
reach Netlify. Dashboard: `d1g.uk` > Caching > Cache Rules > Create rule.

- Rule name: `cache practice-patterns`
- Expression (edit as expression):
  `http.host eq "d1g.uk" and http.request.uri.path eq "/api/practice-patterns"`
- Cache eligibility: Eligible for cache
- Edge TTL: Use cache-control header if present, bypass cache if not
  (the function already sends `CDN-Cache-Control: s-maxage=..., stale-while-revalidate=60`)
- Browser TTL: Respect origin

Deploy, then confirm:

```bash
curl -sI https://d1g.uk/api/practice-patterns | grep -i -E 'cf-cache-status|cache-control'
# second call should show cf-cache-status: HIT
curl -sI https://d1g.uk/api/practice-patterns | grep -i cf-cache-status
```

Do not create REPORT.md rule 2 (HTML edge cache) with a long TTL until the Purge scope in
(c) exists and you have decided the purge scope. The SPA shell references hashed assets
that Netlify removes on the next deploy. A long-cached shell means a white screen for
visitors after a deploy. If you use a 60 s TTL without purge, accept a stale window of up
to 60 s after each deploy. If you purge on deploy, purge only the HTML paths (or use a
prefix or tag purge) and not "Purge Everything", so the immutable assets stay warm.

### (e) Turn on Always Online

Dashboard: `d1g.uk` > Caching > Configuration > Always Online > On. It is currently off.
It serves the cached shell instead of a Cloudflare 522 page when Netlify has a blip. API
routes are not covered.

### (f) GitHub setting for health-check issue creation

The workflow `.github/workflows/health-check.yml` declares `permissions: issues: write`
and `contents: read`. That is normally enough, because a `permissions` block in the
workflow overrides the repository default for that workflow. You only need to change a
setting if issue creation fails with "Resource not accessible by integration". In that
case: repo Settings > Actions > General > Workflow permissions > select "Read and write
permissions" > Save. Also check that Issues are enabled for the repo (Settings > General >
Features > Issues).

### (g) Trigger the health-check workflow once after merge

Scheduled workflows and the "Run workflow" button only exist for files on the default
branch, so this works after the PR is merged to `master`:

```bash
gh workflow run health-check.yml --repo jovylle/sfl-crab
gh run list --workflow=health-check.yml --repo jovylle/sfl-crab --limit 3
gh run watch --repo jovylle/sfl-crab   # pick the run you just started
```

A green run means the live proxy for land 1, `/api/practice-patterns` and the Hub
`/health` endpoints all answered as expected. The workflow takes no inputs, so to see the
failure output without waiting for a real outage, run the script locally against a bad
Hub URL and expect a non-zero exit:

```bash
HUB_URL=https://example.invalid node scripts/health-check.js; echo "exit=$?"
```

### (h) Post-merge deploy checks

These run against production after the Netlify deploy finishes.

```bash
BASE=https://d1g.uk/.netlify/functions/sfl-api

# 1. Normal farm id: expect 200 and JSON
curl -s -o /dev/null -w '%{http_code}\n' "$BASE/community/farms/1"

# 2. Disallowed path: expect 404
curl -s -o /dev/null -w '%{http_code}\n' "$BASE/user/1"

# 3. Disallowed path variant (traversal-style): expect 404
curl -s --path-as-is -o /dev/null -w '%{http_code}\n' "$BASE/community/farms/1/../../admin"

# 4. Disallowed Origin: expect 403
curl -s -o /dev/null -w '%{http_code}\n' -H 'Origin: https://evil.example' "$BASE/community/farms/1"

# 5. Allowed Origin: expect 200 and the same origin echoed back
curl -s -D - -o /dev/null -H 'Origin: https://d1g.uk' "$BASE/community/farms/1" | grep -i -E '^HTTP|access-control-allow-origin'
```

Rate limit smoke test (best effort, see the notes below). Expect some 429s after about 60
requests inside one minute from your own IP, and a `Retry-After` header on them:

```bash
for i in $(seq 1 70); do curl -s -o /dev/null -w '%{http_code}\n' "$BASE/community/farms/1"; done | sort | uniq -c
```

Node version: Netlify > Deploys > latest deploy > deploy log. Search for the line
`Now using node v22` (printed during "Build ready to start"). If it says v18 or v20, check
that `NODE_VERSION = "22"` in `netlify.toml` was not overridden by a `NODE_VERSION`
environment variable in the Netlify UI (Site configuration > Environment variables) and
remove that override.

### Notes the owner should know

1. **HTML cache rule needs a purge scope.** See (d). A long Edge TTL on HTML is unsafe
   without Cache Purge scope and a decision on what a deploy purges.
2. **The `sfl-api` rate limit is best effort.** It is an in-memory counter per Netlify
   lambda instance (`netlify/functions/_rateLimit.cjs`). Two warm instances give each IP
   up to twice the limit, and a cold start resets the count. It stops casual abuse, not a
   determined flood. The per-IP key comes from `cf-connecting-ip`, which Cloudflare sets
   on `d1g.uk` traffic but which a client can forge when calling the function directly at
   `https://d1guk.netlify.app/.netlify/functions/sfl-api/...` (that traffic never passes
   Cloudflare). To cover that, `sfl-api.cjs` also has a per-instance cap of 120 upstream
   calls per minute that does not depend on client identity, and a 500 entry bound on its
   response cache. A Cloudflare rate-limiting rule (needs the Rulesets scope in (c)) would
   only cover `d1g.uk`, not the Netlify hostname. If real abuse shows up, add that rule and
   also block or redirect the direct `d1guk.netlify.app` function path (for example a Host
   check in the function, or a Netlify-side rule), since the Cloudflare rule alone leaves
   it open. The 120 call cap trades availability for quota safety: a caller who sends
   `x-sfl-bypass-cache` with rotated IP headers can exhaust the 120/min budget, and
   uncached lands then get 429 until the window rolls. If that is ever seen, the owner
   could drop the bypass header on the proxy.
3. **Production branch and CI timing.** In Netlify, Site configuration > Build & deploy >
   Branches > Production branch must be `master`, because the sync workflows and the
   health check run from `master`. The new `ci.yml` workflow runs on pull requests, so it
   first runs after the PR is opened (and on later pushes to the PR). The first run of
   `health-check.yml` happens only after merge.
4. **`npm audit`.** Total went from 93 to 72 after removing unused dependencies. Remaining
   production findings are three, all in the head-management chain: `@vueuse/head`,
   `@unhead/vue` and `unhead`. The only fix npm offers is a major downgrade, so it was
   skipped. The remaining 6 critical findings are dev-only and come through `netlify-cli`
   17; clearing them needs a `netlify-cli` major bump (dev tooling only, not shipped).
5. **Node 24.** Netlify also supports Node 24. The repo is on Node 22 (LTS). Moving to 24
   is a reasonable later bump: change `NODE_VERSION` in `netlify.toml`, `.nvmrc`,
   `engines` in `package.json` and the `node-version` in the workflows in one commit, and
   run `npm test` first.
6. **Browser smoke test before merge.** `npm audit fix` moved runtime `vue` (3.5.13 to
   3.5.45) and `vite` (6.3.2 to 6.4.6) within their declared ranges. Build and unit tests
   passed, but no browser run was done for this branch. Open `/digging` and `/practice` on
   the deploy preview and check that a land loads and a tile can be dug.
7. **Health check schedule.** GitHub disables scheduled workflows after 60 days without
   repository activity. If the repo goes quiet, re-enable `health-check.yml` under the
   Actions tab.

---

## 2. Caveat: `netlify.toml` sets CORS `*` on `/api/*`

`netlify.toml` contains:

```toml
[[headers]]
  for = "/api/*"
  [headers.values]
    Access-Control-Allow-Origin = "*"
    Access-Control-Allow-Headers = "Content-Type, Authorization, x-admin-password, x-projectmate-admin, Accept"
    Access-Control-Allow-Methods = "GET, POST, DELETE, OPTIONS"
```

`dig-day`, `practice-runs`, `practice-run`, `hub-auth`, `hub-profile` and `feedback` each
build a per-origin CORS header in their own code. It is unclear whether Netlify applies
the `/api/*` header block on top of, or instead of, the header the function returns after
the `/api/*` to `/.netlify/functions/*` rewrite. `sfl-api` is not affected: it is served at
`/.netlify/functions/sfl-api`, which is outside `/api/*`.

One-line test with a foreign Origin:

```bash
curl -s -D - -o /dev/null -H 'Origin: https://evil.example' 'https://d1g.uk/api/dig-day?landId=1' | grep -i access-control-allow-origin
```

Reading the result:

- `access-control-allow-origin: https://d1g.uk` (the function's fallback value): the
  function header survives and the allow-lists work. Nothing to do.
- `access-control-allow-origin: *`: the toml block wins and the per-origin allow-lists
  in those functions have no effect in browsers.

Proposed fix (not applied): delete the `[[headers]] for = "/api/*"` block from
`netlify.toml`. Every function already returns its own CORS headers and answers
`OPTIONS`, so the block is redundant. Before deleting, confirm `admin-blobs` and
`practice-patterns` also return their own `Access-Control-Allow-*` headers, otherwise
keep the block but narrow it to those two paths. Effort: 10 minutes plus the curl checks
above on the deploy preview. Risk: low, a missing header shows up as a CORS error in the
browser console on the first page load. Prerequisite: none.

---

## 3. Proposals only (nothing here is implemented)

### 3.1 Map hub 404s to a friendly response in `dig-day.cjs` and `practice-run.cjs`

Source: REPORT.md section 3. Confirmed 404 producers: `dig-day` forwards the hub's 404 for
an unknown land id, and expired or deleted practice-run share links return 404 with
`{"error":"Practice run not found"}`.

Change (about 3 lines in each function), where the function forwards the hub response:

```js
if (res.status === 404) {
  return { statusCode: 200, headers, body: JSON.stringify({ error: 'not_found' }) }
}
```

The SPA must then treat `{ error: 'not_found' }` as its "nothing here yet" state.
Decision rule: apply it only after the Analytics:Read scope from 1(c) shows these two
endpoints produce a large share of the 1,609 weekly 404s (suggested bar: more than half).
If most 404s come from other paths (scanners hitting `/wp-login.php` style URLs, old
asset hashes), this change does not help and the fix belongs elsewhere (a Cloudflare WAF
rule for scanner paths, or a redirect for the old asset paths).

- Effort: 1 hour including client handling and a test.
- Risk: low to medium. Changing status codes can hide real errors from the client code
  that checks `res.ok`. Check `src/services` callers first.
- Prerequisite: Analytics:Read scope (1(c)).

### 3.2 Mobile CSS pass

Source: REPORT.md section 4, measured at 390x844 on `/digging`.

| Issue | Fix | Where |
|---|---|---|
| 13 px horizontal overflow; drawer `div.menu` extends past the viewport | `body { overflow-x: hidden }` or `overflow-x: clip` on the app shell | global stylesheet loaded by `src/main.js` (Tailwind entry CSS in `src/`) |
| 29 tap targets under 44 px (nav `Digging`/`Practice` 32 px, `Input Land ID` 32 px, `Use Land ID` 40 px, feedback buttons 38 px) | Mobile-only rule: `@media (max-width: 640px) { .btn-sm, .menu a { min-height: 44px } }` | same stylesheet; check the nav and land-id components in `src/components/` |
| 28 of 28 `<img>` without `width`/`height` | Add intrinsic `width` and `height` attributes. CLS is already 0 because containers are sized, so this is insurance | `<img>` tags in `src/components/` and `src/views/` |
| 9 elements under 12 px | Raise to 12 px minimum | footer and disclaimer markup |
| INP p75 304 ms on mobile | Defer the dig-stats and solver chunks behind the existing "More" toggle with dynamic `import()`; no new dependencies | `/digging` view |

Image weight: `src/assets/feedbacks/*.png` is 8.3 MB and is used by
`src/views/FeedbackGallery.vue` through `import.meta.glob('@/assets/feedbacks/*.{webp,jpg,png}')`.
The glob already accepts webp, so converting is safe:

```bash
cd src/assets/feedbacks
for f in *.png; do cwebp -q 80 "$f" -o "${f%.png}.webp" && rm "$f"; done
```

Check the gallery page visually before committing, and keep the PNGs if any webp looks
worse.

- Effort: 2 to 3 hours for CSS and image attributes, plus 1 to 2 hours for the INP
  chunk-splitting.
- Risk: low for CSS and images, medium for lazy-loading the solver (a missing await shows
  as a blank stats panel).
- Prerequisite: none. Verify in a real mobile viewport; there is no automated visual test.

### 3.3 Uptime monitors

Source: REPORT.md section 5. In Uptime Kuma (running on elitedesk) add three HTTP(s)
monitors with a 60 s interval:

1. `https://d1g.uk/`, keyword `SFL DIGGING`
2. `https://d1g.uk/api/practice-patterns`, expect 200 and JSON
3. `https://api.d1g.uk/health`, expect `{"ok":true}`

The new GitHub Actions health check (`health-check.yml`) covers the same ground every 6
hours, opens an issue on failure and closes open `health-check` issues when a later run passes. Kuma adds the 60 s resolution and push alerts. Run
both: Kuma for fast alerting, GitHub for a second opinion that does not depend on your
home network. Also turn on Always Online (1(e)).

- Effort: 15 minutes.
- Risk: none (read-only checks).
- Prerequisite: Uptime Kuma access and a notification channel.

### 3.4 Cloudflare Pages hybrid

Source: REPORT.md section 2c. Serve the static build from Cloudflare Pages, proxy
`/api/*` to Netlify with a `public/_redirects` line placed before the SPA fallback:
`/api/*  https://d1guk.netlify.app/api/:splat  200`. Functions stay on Netlify, because
`practice-patterns.cjs` and `admin-blobs.cjs` depend on `@netlify/blobs`. Expected result:
edge-cached HTML (the real fix for the 841 ms mobile TTFB), instant purge on deploy, and
rollback by pointing the CNAME back at Netlify.

Keep it as its own change, not bundled with anything above. Test on a Pages preview
domain first. After the cut over, the functions see Cloudflare egress addresses, so the
`cf-connecting-ip`-first key in `_rateLimit.cjs` stays necessary. The CORS allow-lists
need the Pages preview origin added if you test previews against the live API.

- Effort: half a day, including a rehearsal on a preview domain and the DNS switch.
- Risk: medium. DNS cut over and two build pipelines until Netlify is retired for static
  content. Mitigated by an easy rollback.
- Prerequisite: Cloudflare Pages access, and the Purge scope in 1(c) if you want
  purge-on-deploy automation.

---

## 4. What changed in this branch

Commits on top of the audit branch, oldest first. Hashes are for the branch as it stands
before the PR is opened and may change if the branch is rebased.

| Commit | Topic | Docs and files touched |
|---|---|---|
| `6ae57f0` | `sfl-api`: path allow-list (`/community/farms/<digits>` only), CORS allow-list (foreign Origin gets 403), 60 requests/min/IP rate limit | `netlify/functions/sfl-api.cjs`, `tests/sflApiProxy.test.js`, `AGENTS.md`, `docs/API_LAYER.md`, `netlify/functions/README.md` |
| `0a677bc` | Removed dead weight: `src_other` vendored copy, tracked `.history`, unused `artefactIcons.ts` and Vite aliases (tracked files 1274 to 492 at that commit). `src/assets/feedbacks` kept because `FeedbackGallery.vue` uses it | `vite.config.js`, `docs/ARCHITECTURE.md`, `docs/PREDICTION_MODE_PLAN.md`, `AGENTS.md`, comment in `src/data/game/diggingFormations.js` |
| `461438a` | Removed unused dependencies (`puppeteer`, `react-i18next`, `i18next`, `decimal.js-light`, `node-fetch`), Netlify and CI moved to Node 22. `npm audit` 93 to 72 | `package.json`, `package-lock.json`, `netlify.toml`, `.nvmrc`, sync workflows |
| `f4e53c9` | `ci.yml`: `npm ci`, `npm test`, `npm run build` on pull requests and pushes to `master` and `development` | `.github/workflows/ci.yml` |
| `3defb96` | `health-check.yml` (every 6 hours, opens or comments on a `health-check` issue; closing on recovery was added in `4b9ce3d`) and `scripts/health-check.js` | `.github/workflows/health-check.yml`, `scripts/health-check.js`, `tests/healthCheck.test.js`, `AGENTS.md` |
| `5e52a7c` | `sfl-api`: canonical land ids (leading zeros rejected, trailing slash stripped), response cache bounded at 500 entries, per-instance cap of 120 upstream calls/minute (log reason `upstream_budget`) | `netlify/functions/sfl-api.cjs`, `netlify/functions/_rateLimit.cjs`, `tests/sflApiProxy.test.js` |
| `4b9ce3d` | Direct-host caveat in this document, `health-check.yml` closes open `health-check` issues when a later run passes, `PUPPETEER_SKIP_DOWNLOAD` removed from CI | `.github/workflows/health-check.yml`, `.github/workflows/ci.yml`, `docs/d1g-uk-audit/FOLLOWUP.md` |
| this commit | Docs only: new `sfl-api` limits in the permanent docs, this table | `AGENTS.md`, `netlify/functions/README.md`, `docs/API_LAYER.md`, `docs/d1g-uk-audit/FOLLOWUP.md` |

Not changed by design: Cloudflare and Netlify configuration, DNS, `netlify.toml` header
blocks, the 429 fix and `_headers` move already made on the audit branch (see REPORT.md
sections 1, 2b and 2d).
