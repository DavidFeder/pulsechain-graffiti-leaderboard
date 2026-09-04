import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchBlockRecords, fetchHeadSlot } from './fetchBlocks'

function graffitiHex(text: string, padTo = 32): string {
  const bytes = new TextEncoder().encode(text)
  const padded = new Uint8Array(padTo)
  padded.set(bytes.slice(0, padTo))
  return `0x${Array.from(padded, b => b.toString(16).padStart(2, '0')).join('')}`
}

function blockResponse(graffiti: string, status = 200): Response {
  return new Response(
    JSON.stringify({
      data: { message: { body: { graffiti: graffitiHex(graffiti) } } },
    }),
    { status }
  )
}

function headResponse(slot: number, status = 200): Response {
  return new Response(JSON.stringify({ data: { header: { message: { slot: String(slot) } } } }), {
    status,
  })
}

describe('fetchBlockRecords', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('throws on abort instead of returning a partial window', async () => {
    const controller = new AbortController()
    const fetchMock = vi.fn((_url: string, init?: RequestInit) => {
      return new Promise<Response>((_, reject) => {
        const abort = () => {
          const err = new Error('aborted')
          err.name = 'AbortError'
          reject(err)
        }
        if (init?.signal?.aborted) {
          abort()
          return
        }
        init?.signal?.addEventListener('abort', abort, { once: true })
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    const pending = fetchBlockRecords('/api/beacon', [1, 2, 3], {
      concurrency: 2,
      signal: controller.signal,
    })

    controller.abort()
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
  })

  it('treats 404 as a missed proposal, not a failed slot', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('missing', { status: 404 }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await fetchBlockRecords('/api/beacon', [10], { concurrency: 1 })
    expect(result).toMatchObject({ records: [], missingCount: 1, failedSlots: [] })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('retries a 500 on the failover endpoint', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).startsWith('/api/beacon/eth/')) {
        return new Response('nope', { status: 500 })
      }
      return blockResponse('hi')
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await fetchBlockRecords(['/api/beacon', '/api/beacon-fallback'], [7], {
      concurrency: 1,
    })

    expect(result.records).toEqual([{ slot: 7, graffiti: 'hi' }])
    expect(result.fallbackSuccesses).toBe(1)
    expect(result.failedSlots).toEqual([])
    expect(
      fetchMock.mock.calls.some(call => String(call[0]).startsWith('/api/beacon-fallback/'))
    ).toBe(true)
  })

  it('counts a slot as failed when every endpoint errors', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('nope', { status: 503 }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await fetchBlockRecords(['/api/beacon', '/api/beacon-fallback'], [3], {
      concurrency: 1,
    })

    expect(result.records).toEqual([])
    expect(result.failedSlots).toEqual([3])
  })
})

describe('fetchHeadSlot', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('fails over when the primary head endpoint is down', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).startsWith('/api/beacon/eth/')) {
        return new Response('down', { status: 502 })
      }
      return headResponse(42)
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchHeadSlot(['/api/beacon', '/api/beacon-fallback'])).resolves.toBe(42)
  })
})
