import type { ChatProvider } from './types'
import { safeErrorText, withoutTrailingSlash } from './types'

/**
 * OpenCode's HTTP API (see https://opencode.ai/v2/docs/api).
 *
 * OpenCode exposes a full agent session API rather than a bare completion
 * endpoint, so a turn is: create/reuse a session → send a prompt → read the
 * session's messages back. The base URL points at an OpenCode server (a local
 * `opencode serve`, or a remote instance) and auth, if required, rides the
 * bearer key.
 *
 * NOTE: the streaming `GET /api/event` stream plus the generated
 * `@opencode/client` are the richer path, but the event schema is still
 * experimental. This phase-1 adapter uses the stable non-streaming round trip
 * and emits the finished text as a single delta, so the panel behaves the same
 * as a streaming provider from the UI's point of view.
 */
interface OpenCodeSession {
  id: string
}

function modelRef(model: string): { modelID: string; providerID: string } | undefined {
  const trimmed = model.trim()

  if (!trimmed) {
    return undefined
  }

  const slash = trimmed.indexOf('/')

  if (slash <= 0 || slash === trimmed.length - 1) {
    return { modelID: trimmed, providerID: '' }
  }

  return { modelID: trimmed.slice(slash + 1), providerID: trimmed.slice(0, slash) }
}

export const openCodeProvider: ChatProvider = {
  async stream({ messages, provider, signal }, handlers) {
    const base = withoutTrailingSlash(provider.baseUrl)
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }

    if (provider.apiKey) {
      headers.Authorization = `Bearer ${provider.apiKey}`
    }

    const sessionResponse = await fetch(`${base}/api/session`, {
      body: JSON.stringify({ title: 'Basil Companion' }),
      headers,
      method: 'POST',
      signal
    })

    if (!sessionResponse.ok) {
      throw new Error(`OpenCode could not create a session (${sessionResponse.status}): ${await safeErrorText(sessionResponse)}`)
    }

    const { data: session } = (await sessionResponse.json()) as { data: OpenCodeSession }
    const last = messages[messages.length - 1]

    const promptResponse = await fetch(`${base}/api/session/${session.id}/prompt`, {
      body: JSON.stringify({
        model: modelRef(provider.model),
        parts: [{ text: last?.text ?? '', type: 'text' }]
      }),
      headers,
      method: 'POST',
      signal
    })

    if (!promptResponse.ok) {
      throw new Error(`OpenCode prompt failed (${promptResponse.status}): ${await safeErrorText(promptResponse)}`)
    }

    const messagesResponse = await fetch(`${base}/api/session/${session.id}/message`, {
      headers,
      method: 'GET',
      signal
    })

    if (!messagesResponse.ok) {
      throw new Error(`OpenCode could not read messages (${messagesResponse.status}): ${await safeErrorText(messagesResponse)}`)
    }

    const payload = (await messagesResponse.json()) as {
      data?: Array<{ parts?: Array<{ text?: string; type?: string }> }>
    }

    const parts = payload.data?.flatMap(entry => entry.parts ?? []) ?? []
    const text = parts
      .filter(part => part.type === 'text' && typeof part.text === 'string')
      .map(part => part.text)
      .join('')

    if (text) {
      handlers.onDelta(text)
    }

    return text
  }
}
