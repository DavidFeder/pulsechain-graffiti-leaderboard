/**
 * Beacon traffic is same-origin via /api/beacon* rewrites.
 *
 * Only head + per-slot block paths are allowed so the rewrite is not an
 * open proxy onto the upstream beacon APIs.
 *
 * `/api/beacon/` (trailing slash) is intentionally distinct from
 * `/api/beacon-fallback/` so prefix matching cannot send fallback traffic
 * to the primary host.
 */
const HEAD_PATH = '/eth/v1/beacon/headers/head'
const BLOCK_PATH = /^\/eth\/v2\/beacon\/blocks\/\d+$/

const PREFIXES = ['/api/beacon', '/api/beacon-fallback'] as const

export function isAllowedBeaconProxyPath(urlPath: string): boolean {
  const path = urlPath.split('?')[0] ?? urlPath

  for (const prefix of PREFIXES) {
    if (!path.startsWith(`${prefix}/`)) continue
    const rest = path.slice(prefix.length)
    if (rest === HEAD_PATH) return true
    if (BLOCK_PATH.test(rest)) return true
  }

  return false
}
