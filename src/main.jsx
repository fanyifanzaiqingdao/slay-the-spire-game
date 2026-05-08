import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import './i18n/index.js'
import App from './App.jsx'
import { STORAGE_KEYS } from './utils/localStorage.js'

// One-time patch: set persisted active-run gold to 20000 (runs before Zustand rehydrates).
// Flag prevents overwriting gold on every refresh after you spend coins.
const GOLD_20K_FLAG = 'lq_one_time_gold_20000_applied'
try {
  if (!localStorage.getItem(GOLD_20K_FLAG)) {
    const raw = localStorage.getItem(STORAGE_KEYS.ACTIVE_RUN)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed?.state?.runId != null) {
        parsed.state.gold = 20000
        localStorage.setItem(STORAGE_KEYS.ACTIVE_RUN, JSON.stringify(parsed))
        localStorage.setItem(GOLD_20K_FLAG, '1')
      }
    }
  }
} catch (e) {
  console.warn('[Ascendant] Gold one-time patch skipped:', e)
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
