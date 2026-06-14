# Hub API: consumption reduction spec

This document specifies Hub-side changes for `beta.api.d1g.uk` to reduce Netlify function invocations. The Netlify `dig-day` proxy already forwards `If-None-Match` and exposes `ETag` when the Hub returns one.

## POST `/v1/dig-day` — idempotency

**Goal:** Return success without rewriting storage when the meaningful payload is unchanged.

1. Build a canonical hash from the request body, excluding:
   - `updatedAt`
   - `stats` (derived from `digs`)
2. Compare hash to the stored record for `(landId, utcDate)` (or user-scoped key when authenticated).
3. If unchanged, respond `200` with the existing record (do not bump `updatedAt`).
4. If changed, persist and return `200` with the new record.

**Client fingerprint fields (must match Hub hash):**

- `v`, `landId`, `utcDate`, `hideLandId`, `displayName`, `patterns`, `digs`, `markEvents`

## GET `/v1/dig-day` — conditional requests

**Goal:** Allow clients and the Netlify proxy to skip response bodies on unchanged reads.

1. Include `ETag` on `200` responses (hash of stored meaningful fields or `updatedAt` version).
2. Honor `If-None-Match`: respond `304 Not Modified` with empty body when ETag matches.
3. Return structured `404` when no record exists (distinct from auth failures).

## Rate limiting (optional backstop)

Per `(landId, client IP)` or per authenticated user:

- e.g. 60 writes / minute, 120 reads / minute

Netlify applies its own in-memory limit (30/min) but that resets on cold starts.

## Implementation checklist

- [ ] POST body-hash idempotency
- [ ] GET ETag + `If-None-Match` → 304
- [ ] Structured 404 vs 401 responses
- [ ] Per-landId rate limits (optional)

After Hub deploy, verify Netlify logs show fewer upstream Hub calls and 304s on repeat GETs.
