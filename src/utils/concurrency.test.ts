import { describe, expect, it } from 'vitest'
import { fetchWithConcurrencyLimit } from './concurrency'

describe('fetchWithConcurrencyLimit', () => {
  it('rejects when the signal is aborted instead of returning a partial list', async () => {
    const controller = new AbortController()
    const pending = fetchWithConcurrencyLimit(
      [1, 2, 3],
      async (_item, _index, signal) => {
        await new Promise<void>((_resolve, reject) => {
          const abort = () => {
            const err = new Error('aborted')
            err.name = 'AbortError'
            reject(err)
          }
          if (signal?.aborted) {
            abort()
            return
          }
          signal?.addEventListener('abort', abort, { once: true })
        })
        return null
      },
      2,
      controller.signal
    )

    controller.abort()
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
  })
})
