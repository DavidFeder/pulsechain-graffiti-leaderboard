import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchWithRetry, sleep } from './retry'

describe('fetchWithRetry', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('does not retry AbortError', async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      if (init?.signal?.aborted) {
        const err = new Error('aborted')
        err.name = 'AbortError'
        throw err
      }
      throw new Error('should not get here')
    })
    vi.stubGlobal('fetch', fetchMock)

    const controller = new AbortController()
    controller.abort()

    await expect(
      fetchWithRetry('https://example.test', { signal: controller.signal }, 3, 10)
    ).rejects.toMatchObject({
      name: 'AbortError',
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('retries 429 responses then succeeds', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('nope', { status: 429 }))
      .mockResolvedValueOnce(new Response('ok', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const res = await fetchWithRetry('https://example.test', {}, 2, 1)
    expect(res.status).toBe(200)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('does not retry 404 responses', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('missing', { status: 404 }))
    vi.stubGlobal('fetch', fetchMock)

    const res = await fetchWithRetry('https://example.test', {}, 3, 1)
    expect(res.status).toBe(404)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('aborts during backoff instead of continuing to retry', async () => {
    vi.useFakeTimers()
    const fetchMock = vi.fn().mockRejectedValue(new Error('network down'))
    vi.stubGlobal('fetch', fetchMock)

    const controller = new AbortController()
    const pending = fetchWithRetry('https://example.test', { signal: controller.signal }, 3, 500)

    await Promise.resolve()
    expect(fetchMock).toHaveBeenCalledTimes(1)

    controller.abort()
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})

describe('sleep', () => {
  it('rejects immediately when the signal is already aborted', async () => {
    const controller = new AbortController()
    controller.abort()
    await expect(sleep(1000, controller.signal)).rejects.toMatchObject({ name: 'AbortError' })
  })
})
