# Netlify Functions

## Dig day snapshots (`dig-day`)

Stores lean per-land, per-UTC-date dig history in Netlify Blobs store `dig-day-snapshots`.

- **GET** `/api/dig-day?landId=12345&utcDate=2026-05-18`
- **POST** `/api/dig-day` with JSON body (`v`, `landId`, `utcDate`, `patterns`, `digs`, `markEvents`, `stats`)

Data is public by `landId` in v1 (no ownership). Mark events merge append-only by `seq`.

### Retrieve blobs

1. **App API** — URLs above (primary).
2. **Netlify dashboard** — Site → Storage → Blobs → `dig-day-snapshots` → keys like `12345/2026-05-18.json`.
3. **Netlify CLI**:
   ```bash
   netlify blobs:list --store dig-day-snapshots
   netlify blobs:get dig-day-snapshots 12345/2026-05-18.json
   ```

## Practice patterns (`practice-patterns`)

Daily pattern cache in store `practice-daily-patterns`. See `_practiceDailyStore.js`.
