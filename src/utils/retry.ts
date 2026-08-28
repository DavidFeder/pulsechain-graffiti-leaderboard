/**
 * Fetch wrapper with retry, exponential backoff, and AbortSignal support.
 */

export interface RetryInfo {
  attempt: number
  status?: number
  error?: Error
}

export type FetchRetryOptions = RequestInit & {
  onRetry?: (info: RetryInfo) => void
}

export function toAbortError(signal?: AbortSignal): Error {
  if (signal?.reason instanceof Error) return signal.reason
  const err = new Error('The operation was aborted.')
  err.name = 'AbortError'
  return err
}

export function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw toAbortError(signal)
  }
}

export function isAbortError(err: unknown): boolean {
  return err instanceof Error && err.name === 'AbortError'
}

export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(toAbortError(signal))
      return
    }

    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)

    const onAbort = () => {
      clearTimeout(timer)
      reject(toAbortError(signal))
    }

    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

export async function fetchWithRetry(
  url: string,
  options: FetchRetryOptions = {},
  retries: number = 3,
  delay: number = 500
): Promise<Response> {
  const { onRetry, ...requestInit } = options
  const signal = requestInit.signal ?? undefined
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= retries; attempt++) {
    throwIfAborted(signal)

    try {
      const res = await fetch(url, requestInit)

      if (!res.ok && attempt < retries && (res.status >= 500 || res.status === 429)) {
        onRetry?.({ attempt, status: res.status })
        await sleep(delay * Math.pow(2, attempt), signal)
        continue
      }

      return res
    } catch (err) {
      if (isAbortError(err)) throw err

      lastError = err instanceof Error ? err : new Error(String(err))

      if (attempt < retries) {
        onRetry?.({ attempt, error: lastError })
        await sleep(delay * Math.pow(2, attempt), signal)
      }
    }
  }

  throw lastError || new Error('Failed after retries')
}
