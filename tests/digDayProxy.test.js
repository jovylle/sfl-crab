import { createRequire } from 'node:module'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'

const require = createRequire(import.meta.url)
const proxy = require('../netlify/functions/dig-day.cjs')

let ipCounter = 0

function freshIp () {
  ipCounter += 1
  return `198.51.100.${ipCounter}`
}

function makeEvent ({ method = 'GET', headers = {}, query, body } = {}) {
  return {
    httpMethod: method,
    headers: { 'cf-connecting-ip': freshIp(), ...headers },
    queryStringParameters:
      method === 'GET' ? query || { landId: '123', utcDate: '2026-11-15' } : {},
    body,
  }
}

const EMPTY_SNAPSHOT = {
  v: 1,
  landId: '123',
  utcDate: '2026-11-15',
  patterns: [],
  digs: [],
  markEvents: [],
  stats: { totalDigs: 0 },
}

function upstream (status, body, headers = {}) {
  const lower = Object.fromEntries(
    Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]),
  )
  return vi.fn(async () => ({
    status,
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
    headers: { get: (name) => lower[name.toLowerCase()] ?? null },
  }))
}

describe('dig-day proxy 404 conversion', () => {
  const realFetch = global.fetch
  let logSpy

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    global.fetch = realFetch
    vi.restoreAllMocks()
  })

  it('turns the Hub empty-snapshot 404 on GET into a 200 with the same body', async () => {
    global.fetch = upstream(404, EMPTY_SNAPSHOT, { ETag: '"abc"' })
    const res = await proxy.handler(makeEvent())
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.body)).toEqual(EMPTY_SNAPSHOT)
    expect(res.headers.ETag).toBe('"abc"')
    expect(res.headers['Cache-Control']).toBe('public, max-age=120, must-revalidate')
    expect(logSpy).toHaveBeenCalledWith('dig-day', expect.objectContaining({ status: 200 }))
  })

  it('keeps a 404 whose body is not the empty snapshot', async () => {
    global.fetch = upstream(404, { error: 'not found' })
    const res = await proxy.handler(makeEvent())
    expect(res.statusCode).toBe(404)
  })

  it('keeps a 404 with a plain text body', async () => {
    global.fetch = upstream(404, 'Not Found')
    const res = await proxy.handler(makeEvent())
    expect(res.statusCode).toBe(404)
    expect(res.body).toBe('Not Found')
  })

  it('keeps a 404 when the snapshot body is not empty', async () => {
    global.fetch = upstream(404, {
      ...EMPTY_SNAPSHOT,
      digs: [{ x: 1, y: 2 }],
      stats: { totalDigs: 1 },
    })
    const res = await proxy.handler(makeEvent())
    expect(res.statusCode).toBe(404)
  })

  it('does not convert a 404 on POST', async () => {
    global.fetch = upstream(404, EMPTY_SNAPSHOT)
    const res = await proxy.handler(
      makeEvent({ method: 'POST', body: JSON.stringify({ landId: '123' }) }),
    )
    expect(res.statusCode).toBe(404)
  })

  it('passes other statuses through unchanged', async () => {
    global.fetch = upstream(500, EMPTY_SNAPSHOT)
    expect((await proxy.handler(makeEvent())).statusCode).toBe(500)
    global.fetch = upstream(401, { error: 'unauthorized' })
    expect((await proxy.handler(makeEvent())).statusCode).toBe(401)
  })

  it('still passes a real 200 and forwards If-None-Match', async () => {
    const body = { ...EMPTY_SNAPSHOT, digs: [{ x: 1 }], stats: { totalDigs: 1 } }
    global.fetch = upstream(200, body, { ETag: '"v2"' })
    const res = await proxy.handler(
      makeEvent({ headers: { 'if-none-match': '"v1"' } }),
    )
    expect(res.statusCode).toBe(200)
    expect(res.headers.ETag).toBe('"v2"')
    expect(global.fetch.mock.calls[0][1].headers['If-None-Match']).toBe('"v1"')
  })
})
