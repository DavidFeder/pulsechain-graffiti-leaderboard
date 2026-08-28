import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react-swc'

const beaconProxy = {
  '/api/beacon-fallback': {
    target: 'https://pulsechain-beacon-api.publicnode.com',
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/api\/beacon-fallback/, ''),
  },
  '/api/beacon': {
    target: 'https://rpc-pulsechain.g4mm4.io',
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/api\/beacon/, '/beacon-api'),
  },
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
