import { isAbortError, throwIfAborted } from './retry'

/**
 * Runs an array of async tasks with limited concurrency.
 * Returns results in the same order as input (with possible nulls for failures).
 *
 * AbortError is rethrown. If the signal trips while workers are draining,
 * the call still rejects after in-flight tasks settle.
 */
export async function fetchWithConcurrencyLimit<T, R>(
  items: T[],
  fn: (item: T, index: number, signal?: AbortSignal) => Promise<R | null>,
  limit: number,
  signal?: AbortSignal
): Promise<(R | null)[]> {
  const results: (R | null)[] = new Array(items.length).fill(null)
  let index = 0
  let abortError: unknown = null

  async function worker() {
    while (index < items.length) {
      if (signal?.aborted) {
        abortError ??= signal.reason instanceof Error ? signal.reason : undefined
        return
      }

      const currentIndex = index++
      try {
        results[currentIndex] = await fn(items[currentIndex], currentIndex, signal)
      } catch (err) {
        if (isAbortError(err)) {
          abortError = err
          return
        }
        console.warn('Task failed for item', items[currentIndex], err)
        results[currentIndex] = null
      }
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, worker)
  await Promise.all(workers)

  if (abortError && isAbortError(abortError)) throw abortError
  throwIfAborted(signal)
  return results
}
