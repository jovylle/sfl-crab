# 0002 The browser never holds SFL or Hub keys

**Status:** Accepted

## Context

The app reads data from two external systems: the Sunflower Land public API and the SFL Digging Hub. Both need server-side secrets: `SFL_API_KEY`, `SFL_API_KEY_DEV`, `HUB_WRITE_SECRET` and `ADMIN_PASSWORD`. The browser bundle is public, so any secret placed in it is leaked. See [env.example](../../env.example) and [API_KEY_SETUP.md](../../API_KEY_SETUP.md).

## Decision

- The browser never holds an SFL or Hub key. The Netlify functions in `netlify/functions/` hold the keys and proxy every call.
- `sfl-api.cjs` reads `SFL_API_KEY` (or `SFL_API_KEY_DEV` for test) from the environment. The Hub proxies forward to `HUB_API_BASE`. `dig-day.cjs` and `practice-runs.cjs` add `X-Hub-Write-Secret` from `HUB_WRITE_SECRET` on the server side.
- The browser does hold a per-user Hub session token (`sfl-hub-session` in localStorage), sent as a Bearer header. That is a user session, not a server key.
- Client-side configuration uses `VITE_*` variables only. These must be safe to expose.
- Land data reaches the browser only through `/api/*` proxy routes. See [API_LAYER.md](../API_LAYER.md).

## Consequences

- Keys never reach the bundle. Rotating a key is a Netlify environment change, with no client release.
- Every land and Hub request passes through a function, so the proxy rules apply to all traffic: path allow-list, CORS allow-list, per-IP rate limit, upstream budget and cache bound (see [API_LAYER.md](../API_LAYER.md#proxy-access-control)).
- The proxy adds a hop and a shared dependency. The 60 s in-memory cache and the rate limits live there.
- Changing a proxy rule means updating `tests/sflApiProxy.test.js` in the same change.
