import React from 'react'
import { createRoot } from 'react-dom/client'
import { PublicClientApplication } from '@azure/msal-browser'
import { MsalProvider } from '@azure/msal-react'
import App from './App'
import { ErrorBoundary } from './ui/ErrorBoundary'
import { BackendGuard } from './ui/BackendGuard'
import './styles/index.css'
import { initTheme } from './config/theme'
import { msalConfig } from './config/msalConfig'

// Initialize MSAL instance
const msalInstance = new PublicClientApplication(msalConfig)

// Initialize theme early; default to light
initTheme('light')

const rootEl = document.getElementById('root')!
createRoot(rootEl).render(
  <React.StrictMode>
    <ErrorBoundary>
      <MsalProvider instance={msalInstance}>
        <BackendGuard>
          <App />
        </BackendGuard>
      </MsalProvider>
    </ErrorBoundary>
  </React.StrictMode>
)
