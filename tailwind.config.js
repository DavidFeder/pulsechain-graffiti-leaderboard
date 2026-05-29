/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', 'monospace'],
      },
      colors: {
        pulse: {
          blue: '#00D4FF',      // brighter cyan-blue (left side of logo)
          magenta: '#FF00AA',   // hot magenta/pink (right side of logo)
          pink: '#FF1493',
        }
      }
    },
  },
  plugins: [],
}
