import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { ErrorBoundary } from '@/components/error-boundary'
import { ThemeProvider } from '@/themes/context'

import { BasilOverlayApp } from './basil-overlay-app'

export function mountBasilOverlay(): void {
  const style = window.document.createElement('style')
  style.textContent = 'html,body,#root{background:transparent !important;}'
  window.document.head.appendChild(style)
  const root = window.document.getElementById('root')

  if (!root) {
    return
  }

  createRoot(root).render(
    <StrictMode>
      <ErrorBoundary label="basil-overlay">
        <ThemeProvider>
          <BasilOverlayApp />
        </ThemeProvider>
      </ErrorBoundary>
    </StrictMode>
  )
}
