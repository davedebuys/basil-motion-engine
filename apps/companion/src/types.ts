/**
 * Types shared between the Electron main process, the preload bridge, and both
 * renderer windows. Kept free of DOM/Node imports so it can be imported from
 * either side without configuration.
 */

export type ProviderId = 'opencode' | 'openai' | 'ollama'

export interface ProviderSettings {
  /** API key. Empty is valid for a local Ollama or an unauthenticated OpenCode. */
  apiKey: string
  /** Base URL, without a trailing slash. */
  baseUrl: string
  id: ProviderId
  /** Provider-specific model identifier. */
  model: string
}

export type PersonalityMode = 'quiet' | 'balanced' | 'playful'

export interface CompanionSettings {
  /** Panel stays above other windows when true. */
  alwaysOnTop: boolean
  personality: PersonalityMode
  provider: ProviderSettings
}

export interface ChatMessage {
  createdAt: number
  id: string
  role: 'assistant' | 'system' | 'user'
  text: string
}

export interface WindowBounds {
  height: number
  width: number
  x: number
  y: number
}

export interface CursorPoint {
  x: number
  y: number
}

/** Events main broadcasts to every window; the overlay folds them into Basil. */
export type CompanionChatEvent =
  | { text: string; type: 'assistant_delta' }
  | { text: string; type: 'assistant_error' }
  | { type: 'assistant_start' }
  | { text: string; type: 'assistant_success' }
  | { text: string; type: 'user_message' }

export interface ProviderOption {
  baseUrl: string
  id: ProviderId
  label: string
  needsKey: boolean
}

export const PROVIDER_OPTIONS: readonly ProviderOption[] = [
  { baseUrl: 'https://openrouter.ai/api/v1', id: 'openai', label: 'OpenAI-compatible (OpenRouter, Gemini, …)', needsKey: true },
  { baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/', id: 'openai', label: 'Google Gemini (OpenAI-compatible)', needsKey: true },
  { baseUrl: 'http://localhost:11434', id: 'ollama', label: 'Ollama (local or cloud)', needsKey: false },
  { baseUrl: 'http://127.0.0.1:4096', id: 'opencode', label: 'OpenCode (HTTP API)', needsKey: false }
] as const

export const DEFAULT_SETTINGS: CompanionSettings = {
  alwaysOnTop: true,
  personality: 'balanced',
  provider: {
    apiKey: '',
    baseUrl: PROVIDER_OPTIONS[0].baseUrl,
    id: 'openai',
    model: 'openrouter/auto'
  }
}
