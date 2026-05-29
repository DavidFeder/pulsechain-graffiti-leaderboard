/**
 * Runs an array of async tasks with limited concurrency.
 * Returns results in the same order as input (with possible nulls for failures).
 *
 * Supports optional AbortSignal for cancellation.
 */
export async function fetchWithConcurrencyLimit<T, R>(
  items: T[],
  fn: (item: T, index: number, signal?: AbortSignal) => Promise<R | null>,
  limit: number,
  signal?: AbortSignal
): Promise<(R | null)[]> {
  const results: (R | null)[] = new Array(items.length).fill(null)
  let index = 0

  async function worker() {
    while (index < items.length) {
      // Check for abort before starting next item
      if (signal?.aborted) {
        return
      }

      const currentIndex = index++
      try {
        results[currentIndex] = await fn(items[currentIndex], currentIndex, signal)
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          // Don't treat abort as a failure
          results[currentIndex] = null
          return
        }
        console.warn('Task failed for item', items[currentIndex], err)
        results[currentIndex] = null
      }
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, worker)
  await Promise.all(workers)
  return results
}
