/**
 * Standalone replacement for the Hermes `@/components/error-boundary`.
 *
 * The vendored Basil overlay/tour/personality roots wrap their trees in this
 * with a `label`. Keep the props identical so the vendored files compile
 * unchanged.
 */

import { Component, type ErrorInfo, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
  label?: string
  onError?: (error: Error) => void
}

interface ErrorBoundaryState {
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  override componentDidCatch(error: Error, _info: ErrorInfo): void {
    this.props.onError?.(error)
    console.error(`[basil${this.props.label ? `:${this.props.label}` : ''}]`, error)
  }

  override render(): ReactNode {
    if (!this.state.error) {
      return this.props.children
    }

    return (
      <div className="grid h-screen w-screen place-items-center bg-transparent p-6 text-center">
        <div className="max-w-sm space-y-2 text-sm">
          <div className="font-medium">Basil hit an error</div>
          <div className="break-words text-muted-foreground">{this.state.error.message}</div>
        </div>
      </div>
    )
  }
}
