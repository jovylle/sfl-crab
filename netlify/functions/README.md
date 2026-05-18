# Netlify Functions

## Dig day snapshots (`dig-day`)

Proxies to **SFL Digging Hub** (`HUB_API_BASE` + `HUB_WRITE_SECRET` in Netlify env).

- **GET** `/api/dig-day?landId=12345&utcDate=2026-05-18`
- **POST** `/api/dig-day` with JSON body (`v`, `landId`, `utcDate`, `patterns`, `digs`, `markEvents`, `stats`)

Data is public by `landId`. Mark events merge append-only by `seq` (handled on hub).

### Legacy blobs (migration only)

Old data may still be in Netlify Blobs `dig-day-snapshots`. Import with `sfl-digging-hub/scripts/import-blobs-to-hub.mjs`.

## Practice patterns (`practice-patterns`)

Daily pattern cache in store `practice-daily-patterns`. See `_practiceDailyStore.cjs`.
