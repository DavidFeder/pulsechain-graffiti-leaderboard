import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/', // Required for custom domain at root (GitHub Pages + custom domain)
  server: {
    port: 5173
  }
})
