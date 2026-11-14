# d1g.uk analytics (2026-11-07 to 2026-11-14)

## Top 20 paths by page loads

| Path | Desktop | Mobile | Total |
|---|---:|---:|---:|
| /digging | 605 | 300 | 913 |
| /practice | 179 | 84 | 263 |
| /2374144993670076/digging | 139 | 19 | 158 |
| /3473818563743138/digging | 65 | 0 | 65 |
| /2215325975590007/digging | 0 | 63 | 63 |
| /2197288851307394/digging | 56 | 0 | 56 |
| /270939654686593/digging | 0 | 56 | 56 |
| /1358546382586120/digging | 22 | 29 | 51 |
| /6943372693797838/digging | 50 | 0 | 50 |
| /1922424470325230/digging | 0 | 39 | 39 |
| /1587516010036284/digging | 0 | 37 | 37 |
| /5270668653445955/digging | 36 | 0 | 36 |
| /480347374357587/digging | 29 | 0 | 33 |
| /7362609337578212/digging | 33 | 0 | 33 |
| /2937207566488403/digging | 0 | 31 | 31 |
| /680022892284841/digging | 0 | 30 | 30 |
| /3061881117713299/practice | 26 | 0 | 26 |
| /3375296339002558/digging | 0 | 25 | 25 |
| /4461080898317530/digging | 0 | 25 | 25 |
| /5211346157251441/digging | 23 | 0 | 23 |

## CWV by device (p75)

| Device | Visits | TTFB p75 (ms) | LCP p75 (ms) | CLS p75 | INP p75 (ms) |
|---|---:|---:|---:|---:|---:|
| desktop | 1935 | 707.0 | 1135.0 | 0 | 104.0 |
| mobile | 1310 | 841.0 | 1804.0 | 0 | 304.0 |
| tablet | 35 | 594.0 | 2112.0 | 0.003 | 168.0 |

## Top countries

| Country | Loads |
|---|---:|
| VN | 1366 |
| ID | 477 |
| PH | 477 |
| BY | 197 |
| US | 172 |
| BR | 103 |
| TN | 77 |
| AR | 70 |
| CO | 69 |
| PE | 64 |

## Data gaps

- Zone-level HTTP analytics (httpRequests1dGroups/httpRequestsAdaptiveGroups) return 403 for this token (missing zone.analytics.read); only RUM/account datasets used.
- Page-load dataset (rumPageloadEventsAdaptiveGroups) exposes only visits count (no CWV); CWV sourced from rumWebVitalsEventsAdaptiveGroups.
- Tablet loads (47) included in totals but not split into desktop/mobile.
