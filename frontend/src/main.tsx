import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { ErrorBoundary } from './ui/ErrorBoundary'
import { BackendGuard } from './ui/BackendGuard'
import './styles/index.css'
import { initTheme } from './config/theme'

// Initialize theme early; default to light
initTheme('light')

const rootEl = document.getElementById('root')!
createRoot(rootEl).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BackendGuard>
        <App />
      </BackendGuard>
    </ErrorBoundary>
  </React.StrictMode>
)
