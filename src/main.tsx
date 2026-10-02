import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import App from './App.tsx'
import './index.css'
import { applyTheme } from './theme/useThemeSample'
import { themeFromSearch } from './theme/themes'

applyTheme(themeFromSearch(window.location.search))

ReactDOM.createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <Analytics />
    <SpeedInsights />
  </StrictMode>
)
