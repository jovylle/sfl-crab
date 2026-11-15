#!/usr/bin/env node
// Live health check for d1g.uk: the sfl-api proxy, the daily pattern endpoint
// and the Digging Hub. Read-only GET requests, no dependencies, no secrets.
//
//   node scripts/health-check.js
//
// Env overrides (to point the check at beta or a preview):
//   SITE_URL  base URL of the site        (default https://d1g.uk)
//   HUB_URL   a single hub base URL       (default: api.d1g.uk and beta.api.d1g.uk)
//
// Exit code 0 when every check passes (warnings allowed), 1 otherwise.
// The pure validators below are exported and unit-tested without network.

import { pathToFileURL } from 'node:url'

const TIMEOUT_MS = 15_000
const RETRY_DELAY_MS = 5_000
// Practice owner land, the one the daily pattern builder reads.
const PRACTICE_LAND_ID = '1'

// Result shape: { ok: boolean, warn?: boolean, message: string }

function parseJson (text) {
  try {
    return { value: JSON.parse(text) }
  } catch {
    return { error: true }
  }
}

function fail (message) {
  return { ok: false, message }
}

/** Validates the sfl-api proxy response for the practice owner land. */
export function validateFarmResponse (status, text) {
  if (status !== 200) return fail(`HTTP ${status}, expected 200`)
  const body = String(text ?? '')
  if (body.includes('No Season found')) {
    return fail('upstream says "No Season found" (season data missing in SFL)')
  }
  if (/VIP access/i.test(body) && /level 50/i.test(body)) {
    return fail('upstream returned the VIP gate (VIP access / level 50), API key lacks access')
  }
  const parsed = parseJson(body)
  if (parsed.error) return fail('body is not valid JSON')
  const data = parsed.value
  const farm = data?.visitedFarmState ?? data?.farm
  if (!farm || typeof farm !== 'object') {
    return fail('JSON has no visitedFarmState or farm object')
  }
  const digging = farm.desert?.digging
  if (!digging || typeof digging !== 'object') {
    return fail('farm has no desert.digging object')
  }
  // Empty patterns can be legitimate (for example right after the daily
  // rollover, or when the owner has no active board), so it only warns.
  // Hard failures are reserved for transport, JSON shape and gate errors.
  if (!Array.isArray(digging.patterns) || digging.patterns.length === 0) {
    return { ok: true, warn: true, message: 'desert.digging.patterns is empty (no patterns)' }
  }
  return { ok: true, message: `${digging.patterns.length} patterns on land ${PRACTICE_LAND_ID}` }
}

/** Validates the daily practice patterns endpoint. */
export function validatePracticePatterns (status, text) {
  if (status !== 200) return fail(`HTTP ${status}, expected 200`)
  const parsed = parseJson(String(text ?? ''))
  if (parsed.error) return fail('body is not valid JSON')
  if (parsed.value === null || typeof parsed.value !== 'object') {
    return fail('JSON body is not an object')
  }
  return { ok: true, message: 'valid JSON' }
}

/** Validates a Digging Hub /health response. */
export function validateHubHealth (status, text) {
  if (status !== 200) return fail(`HTTP ${status}, expected 200`)
  const parsed = parseJson(String(text ?? ''))
  if (parsed.error) return fail('body is not valid JSON')
  if (parsed.value?.ok !== true) return fail('JSON does not contain ok:true')
  return { ok: true, message: 'ok:true' }
}

/** Builds the check list from base URLs. */
export function buildChecks ({ siteUrl, hubUrls, utcDate }) {
  const site = siteUrl.replace(/\/+$/, '')
  const checks = [
    {
      name: 'sfl-api proxy',
      url: `${site}/.netlify/functions/sfl-api/community/farms/${PRACTICE_LAND_ID}`,
      validate: validateFarmResponse,
    },
    {
      name: 'practice patterns',
      url: `${site}/api/practice-patterns?utcDate=${utcDate}`,
      validate: validatePracticePatterns,
    },
  ]
  for (const hub of hubUrls) {
    checks.push({
      name: `hub health (${hub.replace(/^https?:\/\//, '').replace(/\/+$/, '')})`,
      url: `${hub.replace(/\/+$/, '')}/health`,
      validate: validateHubHealth,
    })
  }
  return checks
}

/** Turns check results into a markdown table and an overall verdict. */
export function summarise (results) {
  const rows = results.map((r) => {
    const state = !r.ok ? 'FAIL' : r.warn ? 'WARN' : 'PASS'
    return `| ${state} | ${r.name} | ${String(r.message).replace(/\|/g, '/')} |`
  })
  const failed = results.filter((r) => !r.ok).length
  const warned = results.filter((r) => r.ok && r.warn).length
  const text = [
    '| Status | Check | Detail |',
    '| --- | --- | --- |',
    ...rows,
    '',
    failed === 0
      ? `All ${results.length} checks passed${warned ? ` (${warned} warning${warned === 1 ? '' : 's'})` : ''}.`
      : `${failed} of ${results.length} checks failed.`,
  ].join('\n')
  return { ok: failed === 0, failed, warned, text }
}

async function fetchOnce (url) {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { Accept: 'application/json', 'User-Agent': 'd1g-health-check' },
  })
  return { status: res.status, text: await res.text() }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function runCheck (check) {
  let lastResult
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const { status, text } = await fetchOnce(check.url)
      lastResult = check.validate(status, text)
    } catch (err) {
      lastResult = fail(`request failed: ${err?.name === 'TimeoutError' ? `timeout after ${TIMEOUT_MS / 1000}s` : err?.message || err}`)
    }
    if (lastResult.ok) break
    if (attempt === 1) await sleep(RETRY_DELAY_MS)
  }
  return { name: check.name, url: check.url, ...lastResult }
}

export async function main (env = process.env) {
  const siteUrl = env.SITE_URL || 'https://d1g.uk'
  const hubUrls = env.HUB_URL
    ? [env.HUB_URL]
    : ['https://api.d1g.uk', 'https://beta.api.d1g.uk']
  const utcDate = new Date().toISOString().slice(0, 10)
  const checks = buildChecks({ siteUrl, hubUrls, utcDate })
  const results = await Promise.all(checks.map(runCheck))
  const summary = summarise(results)
  console.log(summary.text)
  return summary.ok ? 0 : 1
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().then((code) => process.exit(code))
}
