/**
 * Runs an array of async tasks with limited concurrency.
 * Returns results in the same order as input (with possible nulls for failures).
 */
export async function fetchWithConcurrencyLimit<T, R>(
  items: T[],
  fn: (item: T, index: number) => Promise<R | null>,
  limit: number
): Promise<(R | null)[]> {
  const results: (R | null)[] = new Array(items.length).fill(null)
  let index = 0

  async function worker() {
    while (index < items.length) {
      const currentIndex = index++
      try {
        results[currentIndex] = await fn(items[currentIndex], currentIndex)
      } catch (err) {
        console.warn('Task failed for item', items[currentIndex], err)
        results[currentIndex] = null
      }
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, worker)
  await Promise.all(workers)
  return results
}
