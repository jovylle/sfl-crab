// tests/healthCheck.test.js
//
// Pure validators of scripts/health-check.js. No network.

import { describe, it, expect } from 'vitest'
import {
  validateFarmResponse,
  validatePracticePatterns,
  validateHubHealth,
  buildChecks,
  summarise,
} from '../scripts/health-check.js'

const goodFarm = JSON.stringify({
  visitedFarmState: { desert: { digging: { patterns: ['HIEROGLYPH', 'COCKLE'], grid: [] } } },
})

describe('validateFarmResponse', () => {
  it('passes a good payload', () => {
    const r = validateFarmResponse(200, goodFarm)
    expect(r.ok).toBe(true)
    expect(r.warn).toBeUndefined()
  })

  it('accepts the farm key as well as visitedFarmState', () => {
    const body = JSON.stringify({ farm: { desert: { digging: { patterns: ['COCKLE'] } } } })
    expect(validateFarmResponse(200, body).ok).toBe(true)
  })

  it('fails when desert.digging is missing', () => {
    const r = validateFarmResponse(200, JSON.stringify({ visitedFarmState: { desert: {} } }))
    expect(r.ok).toBe(false)
    expect(r.message).toMatch(/desert\.digging/)
  })

  it('fails when there is no farm object', () => {
    expect(validateFarmResponse(200, JSON.stringify({ other: 1 })).ok).toBe(false)
  })

  it('fails on "No Season found"', () => {
    const r = validateFarmResponse(200, '{"error":"No Season found"}')
    expect(r.ok).toBe(false)
    expect(r.message).toMatch(/No Season found/)
  })

  it('fails on the VIP gate', () => {
    const r = validateFarmResponse(200, '{"error":"You need VIP access, reach level 50"}')
    expect(r.ok).toBe(false)
    expect(r.message).toMatch(/VIP/)
  })

  it('fails on non-JSON', () => {
    const r = validateFarmResponse(200, '<html>oops</html>')
    expect(r.ok).toBe(false)
    expect(r.message).toMatch(/JSON/)
  })

  it('fails on HTTP 500', () => {
    const r = validateFarmResponse(500, goodFarm)
    expect(r.ok).toBe(false)
    expect(r.message).toMatch(/500/)
  })

  it('warns, but does not fail, on empty patterns', () => {
    const body = JSON.stringify({ visitedFarmState: { desert: { digging: { patterns: [] } } } })
    const r = validateFarmResponse(200, body)
    expect(r.ok).toBe(true)
    expect(r.warn).toBe(true)
  })
})

describe('validatePracticePatterns', () => {
  it('passes a JSON object', () => {
    expect(validatePracticePatterns(200, '{"patterns":[]}').ok).toBe(true)
  })
  it('fails on non-200, non-JSON and non-object bodies', () => {
    expect(validatePracticePatterns(503, '{}').ok).toBe(false)
    expect(validatePracticePatterns(200, 'nope').ok).toBe(false)
    expect(validatePracticePatterns(200, 'null').ok).toBe(false)
  })
})

describe('validateHubHealth', () => {
  it('passes {"ok":true}', () => {
    expect(validateHubHealth(200, '{"ok":true}').ok).toBe(true)
  })
  it('fails on ok:false, non-JSON and non-200', () => {
    expect(validateHubHealth(200, '{"ok":false}').ok).toBe(false)
    expect(validateHubHealth(200, 'OK').ok).toBe(false)
    expect(validateHubHealth(502, '{"ok":true}').ok).toBe(false)
  })
})

describe('buildChecks and summarise', () => {
  it('builds the expected URLs', () => {
    const checks = buildChecks({
      siteUrl: 'https://d1g.uk/',
      hubUrls: ['https://api.d1g.uk', 'https://beta.api.d1g.uk/'],
      utcDate: '2026-11-14',
    })
    expect(checks.map((c) => c.url)).toEqual([
      'https://d1g.uk/.netlify/functions/sfl-api/community/farms/1',
      'https://d1g.uk/api/practice-patterns?utcDate=2026-11-14',
      'https://api.d1g.uk/health',
      'https://beta.api.d1g.uk/health',
    ])
  })

  it('reports failure when any check fails, and warnings do not fail', () => {
    const okWarn = summarise([
      { name: 'a', ok: true, message: 'fine' },
      { name: 'b', ok: true, warn: true, message: 'empty' },
    ])
    expect(okWarn.ok).toBe(true)
    expect(okWarn.warned).toBe(1)

    const bad = summarise([
      { name: 'a', ok: true, message: 'fine' },
      { name: 'b', ok: false, message: 'HTTP 500' },
    ])
    expect(bad.ok).toBe(false)
    expect(bad.failed).toBe(1)
    expect(bad.text).toMatch(/FAIL/)
  })
})
