import type { ChatMessage, ProviderSettings } from '../../src/types'

export interface ChatStreamRequest {
  messages: ChatMessage[]
  provider: ProviderSettings
  signal: AbortSignal
}

export interface ChatStreamHandlers {
  /** Called for each incremental chunk of assistant text. */
  onDelta(text: string): void
}

export interface ChatProvider {
  /** Streams a completion, resolving with the full assistant text. */
  stream(request: ChatStreamRequest, handlers: ChatStreamHandlers): Promise<string>
}

export function withoutTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '')
}

export async function safeErrorText(response: Response): Promise<string> {
  try {
    return (await response.text()).slice(0, 400)
  } catch {
    return `HTTP ${response.status}`
  }
}

export function roleFor(message: ChatMessage): 'assistant' | 'system' | 'user' {
  return message.role
}
