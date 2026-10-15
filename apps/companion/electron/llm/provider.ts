import { ollamaProvider } from './ollama'
import { openAiCompatibleProvider } from './openai-compatible'
import { openCodeProvider } from './opencode'
import type { ChatProvider, ChatStreamRequest } from './types'

/**
 * Selects the concrete provider adapter from the persisted settings.
 *
 * `openai` is the default and covers OpenRouter, Google Gemini's
 * OpenAI-compatible endpoint, and any other OpenAI-protocol host.
 */
export function providerFor(id: string): ChatProvider {
  if (id === 'ollama') {
    return ollamaProvider
  }

  if (id === 'opencode') {
    return openCodeProvider
  }

  return openAiCompatibleProvider
}

export type { ChatStreamRequest }
