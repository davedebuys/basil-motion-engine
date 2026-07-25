import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { ErrorBoundary } from '@/components/error-boundary'
import { ThemeProvider } from '@/themes/context'

import { BasilPersonalityShowcase } from './basil-personality-showcase'

export function mountBasilPersonalityShowcase(): void {
  const root = window.document.getElementById('root')

  if (!root) {
    return
  }

  createRoot(root).render(
    <StrictMode>
      <ErrorBoundary label="basil-personality">
        <ThemeProvider>
          <BasilPersonalityShowcase />
        </ThemeProvider>
      </ErrorBoundary>
    </StrictMode>
  )
}
