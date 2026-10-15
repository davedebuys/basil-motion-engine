import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { ErrorBoundary } from './components/error-boundary'
import { CompanionOverlayApp } from './overlay/companion-overlay-app'
import { BasilPanelApp } from './panel/BasilPanelApp'

import './styles.css'

/**
 * Single HTML entry that branches on `?win=`, matching how the original Hermes
 * renderer served `?win=basil-overlay` / `?win=basil-panel`. Electron main
 * loads `?win=overlay` for the floating actor and `?win=panel` for the chat +
 * dashboard window.
 */
function currentWindow(): 'overlay' | 'panel' {
  return new URLSearchParams(window.location.search).get('win') === 'panel' ? 'panel' : 'overlay'
}

const kind = currentWindow()

document.body.dataset.window = kind

const container = document.getElementById('root')

if (container) {
  createRoot(container).render(
    <StrictMode>
      <ErrorBoundary label={kind}>
        {kind === 'panel' ? <BasilPanelApp /> : <CompanionOverlayApp />}
      </ErrorBoundary>
    </StrictMode>
  )
}
