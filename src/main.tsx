import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App.tsx'
import { applyFont, getStoredFont } from './lib/font'
import { applyTheme, getStoredTheme } from './lib/theme'
import './index.css'

applyTheme(getStoredTheme())
applyFont(getStoredFont())
registerSW({ immediate: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
