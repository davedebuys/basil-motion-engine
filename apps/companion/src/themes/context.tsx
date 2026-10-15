/**
 * Standalone replacement for the Hermes `@/themes/context`.
 *
 * The Basil engine roots wrap their trees in `ThemeProvider` purely to expose a
 * theme class. The companion app ships its own styles, so this is a pass-through
 * that stamps a `data-theme` attribute for any CSS that wants it.
 */

import type { ReactNode } from 'react'

interface ThemeProviderProps {
  children: ReactNode
  theme?: 'light' | 'dark'
}

export function ThemeProvider({ children, theme = 'dark' }: ThemeProviderProps) {
  return (
    <div data-theme={theme} style={{ display: 'contents' }}>
      {children}
    </div>
  )
}
