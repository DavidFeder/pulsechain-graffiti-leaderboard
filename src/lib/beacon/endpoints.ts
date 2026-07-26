import { BEACON_API_ENDPOINTS } from '../constants'
import { fetchWithRetry } from '../../utils/retry'

/**
 * Returns the first endpoint that successfully answers a head request.
 * Used for simple failover across the configured beacon API list.
 */
export async function resolveWorkingEndpoint(signal?: AbortSignal): Promise<string> {
  let lastError: unknown = null

  for (const endpoint of BEACON_API_ENDPOINTS) {
    try {
      const res = await fetchWithRetry(
        `${endpoint}/eth/v1/beacon/headers/head`,
        { signal },
        1
      )
      if (res.ok) return endpoint
    } catch (err) {
      lastError = err
      // try next
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('All beacon API endpoints failed')
}

/** Turn low-level fetch errors into clearer user-facing messages. */
export function friendlyErrorMessage(err: unknown): string {
  if (!(err instanceof Error)) return 'Failed to load graffiti data'

  const msg = err.message.toLowerCase()

  if (err.name === 'AbortError') return '' // handled by caller
  if (
    msg.includes('networkerror') ||
    msg.includes('failed to fetch') ||
    msg.includes('network request failed')
  ) {
    return 'Network error — the public beacon API may be rate-limited or temporarily unavailable. Try again in a moment.'
  }
  if (msg.includes('all beacon api endpoints failed')) {
    return 'All known beacon API endpoints are currently unreachable. Please try again later.'
  }
  if (msg.includes('failed to fetch head')) {
    return 'Could not reach the beacon API. It may be rate-limited — please wait a few seconds and try again.'
  }

  return err.message || 'Failed to load graffiti data'
}
