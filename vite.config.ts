import { defineConfig, type ProxyOptions } from 'vitest/config'
import react from '@vitejs/plugin-react-swc'
import { isAllowedBeaconProxyPath } from './src/lib/beacon/proxyPaths'

/**
 * Trailing slash on `/api/beacon/` is required so it does not prefix-match
 * `/api/beacon-fallback`. Only head + per-slot block paths are proxied.
 */
function restrictBeaconProxy(options: ProxyOptions): ProxyOptions {
  return {
    ...options,
    bypass(req) {
      const url = req.url ?? ''
      const path = url.split('?')[0] ?? url
      if (isAllowedBeaconProxyPath(path)) return undefined
      return path
    },
  }
}

const beaconProxy = {
  '/api/beacon-fallback': restrictBeaconProxy({
    target: 'https://pulsechain-beacon-api.publicnode.com',
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/api\/beacon-fallback/, ''),
  }),
  // Trailing slash: do not treat `/api/beacon-fallback` as `/api/beacon`.
  '/api/beacon/': restrictBeaconProxy({
    target: 'https://rpc-pulsechain.g4mm4.io',
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/api\/beacon/, '/beacon-api'),
  }),
}

export default defineConfig({
  plugins: [react()],
  base: '/',
  server: {
    port: 5173,
    proxy: beaconProxy,
  },
  preview: {
    proxy: beaconProxy,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
