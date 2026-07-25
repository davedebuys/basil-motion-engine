import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { ErrorBoundary } from '@/components/error-boundary'
import { ThemeProvider } from '@/themes/context'

import { BasilTourApp } from './basil-tour-app'

export function mountBasilTour(): void {
  const root = window.document.getElementById('root')

  if (!root) {
    return
  }

  createRoot(root).render(
    <StrictMode>
      <ErrorBoundary label="basil-tour">
        <ThemeProvider>
          <BasilTourApp />
        </ThemeProvider>
      </ErrorBoundary>
    </StrictMode>
  )
}
