import { createRequire } from 'node:module'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'

const require = createRequire(import.meta.url)
const proxy = require('../netlify/functions/sfl-api.cjs')

const PREFIX = '/.netlify/functions/sfl-api'
let ipCounter = 0
let idCounter = 1000

// Each test gets its own IP and land id so the module-level rate limit
// buckets and the 60s response cache never leak between tests.
function freshIp () {
  ipCounter += 1
  return `203.0.113.${ipCounter}`
}

function freshId () {
  idCounter += 1
  return String(idCounter)
}

function makeEvent (path, { method = 'GET', headers = {}, ip } = {}) {
  return {
    httpMethod: method,
    path,
    headers: { 'cf-connecting-ip': ip || freshIp(), ...headers },
    queryStringParameters: {},
  }
}

function upstreamOk (body = { farm: 'ok' }) {
  return vi.fn(async () => ({
    status: 200,
    text: async () => JSON.stringify(body),
  }))
}

describe('sfl-api proxy', () => {
  const savedKey = process.env.SFL_API_KEY
  const savedDevKey = process.env.SFL_API_KEY_DEV

  beforeEach(() => {
    process.env.SFL_API_KEY = 'test-key-not-real'
    process.env.SFL_API_KEY_DEV = 'test-dev-key-not-real'
    vi.stubGlobal('fetch', upstreamOk())
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    if (savedKey === undefined) delete process.env.SFL_API_KEY
    else process.env.SFL_API_KEY = savedKey
    if (savedDevKey === undefined) delete process.env.SFL_API_KEY_DEV
    else process.env.SFL_API_KEY_DEV = savedDevKey
  })

  describe('path allow-list', () => {
    it('forwards /community/farms/<digits> with the api key', async () => {
      const id = freshId()
      const res = await proxy.handler(makeEvent(`${PREFIX}/community/farms/${id}`))
      expect(res.statusCode).toBe(200)
      expect(fetch).toHaveBeenCalledTimes(1)
      const [url, init] = fetch.mock.calls[0]
      expect(url).toBe(`https://api.sunflower-land.com/community/farms/${id}`)
      expect(init.headers['x-api-key']).toBe('test-key-not-real')
    })

    it('rewrites the legacy /visit/<digits> alias', async () => {
      const id = freshId()
      const res = await proxy.handler(makeEvent(`${PREFIX}/visit/${id}`))
      expect(res.statusCode).toBe(200)
      expect(fetch).toHaveBeenCalledTimes(1)
      expect(fetch.mock.calls[0][0]).toBe(
        `https://api.sunflower-land.com/community/farms/${id}`,
      )
    })

    it('uses the dev origin and dev key when x-sfl-api-env is test', async () => {
      const id = freshId()
      const res = await proxy.handler(
        makeEvent(`${PREFIX}/community/farms/${id}`, {
          headers: { 'x-sfl-api-env': 'test' },
        }),
      )
      expect(res.statusCode).toBe(200)
      const [url, init] = fetch.mock.calls[0]
      expect(url).toBe(`https://api-dev.sunflower-land.com/community/farms/${id}`)
      expect(init.headers['x-api-key']).toBe('test-dev-key-not-real')
    })

    const rejected = [
      ['root', ''],
      ['slash only', '/'],
      ['no id', '/community/farms/'],
      ['non-numeric id', '/community/farms/abc'],
      ['extra segment', '/community/farms/123/extra'],
      ['traversal', '/community/farms/123/../x'],
      ['admin', '/admin'],
      ['other upstream path', '/community/farms'],
      ['query in path string', '/community/farms/123?x=1'],
      ['too many digits', `/community/farms/${'9'.repeat(21)}`],
      ['very long digits', `/community/farms/${'1'.repeat(5000)}`],
      ['legacy visit non-numeric', '/visit/abc'],
      ['legacy visit traversal', '/visit/123/../../admin'],
      ['visit root', '/visit/'],
    ]

    it.each(rejected)('returns 404 without upstream call: %s', async (_name, suffix) => {
      const res = await proxy.handler(makeEvent(`${PREFIX}${suffix}`))
      expect(res.statusCode).toBe(404)
      expect(JSON.parse(res.body)).toEqual({ error: 'Not found' })
      expect(fetch).not.toHaveBeenCalled()
    })

    it('rejects before the missing-api-key check (no key use)', async () => {
      delete process.env.SFL_API_KEY
      const res = await proxy.handler(makeEvent(`${PREFIX}/admin`))
      expect(res.statusCode).toBe(404)
      expect(fetch).not.toHaveBeenCalled()
    })

    it('exposes isAllowedApiPath', () => {
      expect(proxy.isAllowedApiPath('/community/farms/42')).toBe(true)
      expect(proxy.isAllowedApiPath('/community/farms/42/')).toBe(true)
      expect(proxy.isAllowedApiPath('/community/farms/42/x')).toBe(false)
      expect(proxy.isAllowedApiPath('/other')).toBe(false)
      expect(proxy.isAllowedApiPath(undefined)).toBe(false)
    })
  })

  describe('CORS', () => {
    it('returns 403 for a disallowed Origin and does not fetch', async () => {
      const res = await proxy.handler(
        makeEvent(`${PREFIX}/community/farms/${freshId()}`, {
          headers: { Origin: 'https://evil.example' },
        }),
      )
      expect(res.statusCode).toBe(403)
      expect(JSON.parse(res.body)).toEqual({ error: 'Origin not allowed' })
      expect(res.headers['Access-Control-Allow-Origin']).not.toBe('https://evil.example')
      expect(fetch).not.toHaveBeenCalled()
    })

    it('checks Origin before the path (bad origin on bad path is 403)', async () => {
      const res = await proxy.handler(
        makeEvent(`${PREFIX}/admin`, { headers: { Origin: 'https://evil.example' } }),
      )
      expect(res.statusCode).toBe(403)
    })

    it('echoes an allowed Origin and sets Vary: Origin', async () => {
      const res = await proxy.handler(
        makeEvent(`${PREFIX}/community/farms/${freshId()}`, {
          headers: { Origin: 'https://beta.d1g.uk' },
        }),
      )
      expect(res.statusCode).toBe(200)
      expect(res.headers['Access-Control-Allow-Origin']).toBe('https://beta.d1g.uk')
      expect(res.headers.Vary).toBe('Origin')
    })

    it('finds the Origin header case-insensitively', async () => {
      const res = await proxy.handler(
        makeEvent(`${PREFIX}/community/farms/${freshId()}`, {
          headers: { origin: 'http://localhost:5173' },
        }),
      )
      expect(res.statusCode).toBe(200)
      expect(res.headers['Access-Control-Allow-Origin']).toBe('http://localhost:5173')
    })

    it('allows requests without an Origin and defaults ACAO to https://d1g.uk', async () => {
      const res = await proxy.handler(
        makeEvent(`${PREFIX}/community/farms/${freshId()}`),
      )
      expect(res.statusCode).toBe(200)
      expect(res.headers['Access-Control-Allow-Origin']).toBe('https://d1g.uk')
    })

    it('never emits a wildcard origin', async () => {
      const res = await proxy.handler(
        makeEvent(`${PREFIX}/community/farms/${freshId()}`),
      )
      expect(Object.values(res.headers)).not.toContain('*')
    })

    it('allows Netlify deploy previews of d1guk', () => {
      const origin = 'https://deploy-preview-12--d1guk.netlify.app'
      expect(proxy.resolveCorsOrigin(origin)).toBe(origin)
      expect(proxy.resolveCorsOrigin('https://my-branch--d1guk.netlify.app')).toBe(
        'https://my-branch--d1guk.netlify.app',
      )
    })

    it.each([
      'https://evil--d1guk.netlify.app.attacker.com',
      'https://d1g.uk.evil.com',
      'https://evil--other.netlify.app',
      'http://d1g.uk',
      'https://evild1g.uk',
      'null',
    ])('rejects lookalike origin %s', (origin) => {
      expect(proxy.resolveCorsOrigin(origin)).toBeNull()
    })

    it('answers OPTIONS preflight with 204 for allowed origins', async () => {
      const res = await proxy.handler(
        makeEvent(`${PREFIX}/community/farms/1`, {
          method: 'OPTIONS',
          headers: { Origin: 'https://d1g.uk' },
        }),
      )
      expect(res.statusCode).toBe(204)
      expect(res.headers['Access-Control-Allow-Origin']).toBe('https://d1g.uk')
      expect(res.headers['Access-Control-Allow-Methods']).toBe('GET, OPTIONS')
      expect(res.headers['Access-Control-Allow-Headers']).toContain('x-sfl-api-env')
      expect(fetch).not.toHaveBeenCalled()
    })

    it('answers OPTIONS preflight with 403 for disallowed origins', async () => {
      const res = await proxy.handler(
        makeEvent(`${PREFIX}/community/farms/1`, {
          method: 'OPTIONS',
          headers: { Origin: 'https://evil.example' },
        }),
      )
      expect(res.statusCode).toBe(403)
    })
  })

  describe('method', () => {
    it.each(['POST', 'PUT', 'DELETE', 'PATCH'])('returns 405 for %s', async (method) => {
      const res = await proxy.handler(
        makeEvent(`${PREFIX}/community/farms/${freshId()}`, { method }),
      )
      expect(res.statusCode).toBe(405)
      expect(fetch).not.toHaveBeenCalled()
    })
  })

  describe('rate limit', () => {
    it('returns 429 with Retry-After on the 61st request from one IP', async () => {
      const ip = freshIp()
      const id = freshId()
      const event = () => makeEvent(`${PREFIX}/community/farms/${id}`, { ip })

      for (let i = 0; i < 60; i += 1) {
        const res = await proxy.handler(event())
        expect(res.statusCode).toBe(200)
      }
      const blocked = await proxy.handler(event())
      expect(blocked.statusCode).toBe(429)
      expect(Number(blocked.headers['Retry-After'])).toBeGreaterThan(0)
      expect(JSON.parse(blocked.body).error).toBeTruthy()

      // Cache hits count too: only the first request reached upstream.
      expect(fetch).toHaveBeenCalledTimes(1)

      // A different IP is unaffected.
      const other = await proxy.handler(
        makeEvent(`${PREFIX}/community/farms/${id}`, { ip: freshIp() }),
      )
      expect(other.statusCode).toBe(200)
    })

    it('does not spend rate limit budget on rejected paths', async () => {
      const ip = freshIp()
      for (let i = 0; i < 80; i += 1) {
        const res = await proxy.handler(makeEvent(`${PREFIX}/admin`, { ip }))
        expect(res.statusCode).toBe(404)
      }
      const ok = await proxy.handler(
        makeEvent(`${PREFIX}/community/farms/${freshId()}`, { ip }),
      )
      expect(ok.statusCode).toBe(200)
    })
  })

  describe('existing behaviour', () => {
    it('serves the second request from the 60s cache and honours bypass', async () => {
      const id = freshId()
      const path = `${PREFIX}/community/farms/${id}`
      await proxy.handler(makeEvent(path))
      await proxy.handler(makeEvent(path))
      expect(fetch).toHaveBeenCalledTimes(1)

      await proxy.handler(makeEvent(path, { headers: { 'x-sfl-bypass-cache': '1' } }))
      expect(fetch).toHaveBeenCalledTimes(2)
    })

    it('returns 500 when the api key is missing', async () => {
      delete process.env.SFL_API_KEY
      const res = await proxy.handler(
        makeEvent(`${PREFIX}/community/farms/${freshId()}`),
      )
      expect(res.statusCode).toBe(500)
      expect(fetch).not.toHaveBeenCalled()
    })

    it('does not put the api key in logs', async () => {
      await proxy.handler(makeEvent(`${PREFIX}/community/farms/${freshId()}`))
      await proxy.handler(makeEvent(`${PREFIX}/admin`))
      const logged = JSON.stringify(console.log.mock.calls)
      expect(logged).not.toContain('test-key-not-real')
    })
  })
})
