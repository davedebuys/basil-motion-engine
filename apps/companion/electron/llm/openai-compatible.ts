import { roleFor, safeErrorText, withoutTrailingSlash, type ChatProvider } from './types'

/**
 * Any OpenAI-compatible `/chat/completions` endpoint with `stream: true`.
 *
 * This single adapter covers OpenRouter, Google Gemini's OpenAI-compatible
 * endpoint, and essentially every provider that speaks the OpenAI protocol —
 * only the base URL and key differ.
 */
export const openAiCompatibleProvider: ChatProvider = {
  async stream({ messages, provider, signal }, handlers) {
    const endpoint = `${withoutTrailingSlash(provider.baseUrl)}/chat/completions`

    const response = await fetch(endpoint, {
      body: JSON.stringify({
        messages: messages.map(message => ({ content: message.text, role: roleFor(message) })),
        model: provider.model,
        stream: true
      }),
      headers: {
        ...(provider.apiKey ? { Authorization: `Bearer ${provider.apiKey}` } : {}),
        'Content-Type': 'application/json'
      },
      method: 'POST',
      signal
    })

    if (!response.ok || !response.body) {
      throw new Error(`Provider responded ${response.status}: ${await safeErrorText(response)}`)
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let full = ''

    for (;;) {
      const { done, value } = await reader.read()

      if (done) {
        break
      }

      buffer += decoder.decode(value, { stream: true })

      const lines = buffer.split('\n')

      buffer = lines.pop() ?? ''

      for (const line of lines) {
        const trimmed = line.trim()

        if (!trimmed.startsWith('data:')) {
          continue
        }

        const payload = trimmed.slice(5).trim()

        if (!payload || payload === '[DONE]') {
          continue
        }

        try {
          const json = JSON.parse(payload) as { choices?: Array<{ delta?: { content?: string } }> }
          const delta = json.choices?.[0]?.delta?.content

          if (typeof delta === 'string' && delta) {
            full += delta
            handlers.onDelta(delta)
          }
        } catch {
          // A partial JSON frame; wait for more bytes.
        }
      }
    }

    return full
  }
}
