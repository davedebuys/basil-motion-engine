import { roleFor, safeErrorText, withoutTrailingSlash, type ChatProvider } from './types'

/**
 * Ollama `/api/chat` with NDJSON streaming. Works for a local daemon
 * (`http://localhost:11434`) and Ollama Cloud alike — only the base URL and an
 * optional bearer key differ.
 */
export const ollamaProvider: ChatProvider = {
  async stream({ messages, provider, signal }, handlers) {
    const endpoint = `${withoutTrailingSlash(provider.baseUrl)}/api/chat`

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
      throw new Error(`Ollama responded ${response.status}: ${await safeErrorText(response)}`)
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

        if (!trimmed) {
          continue
        }

        try {
          const json = JSON.parse(trimmed) as { message?: { content?: string } }
          const delta = json.message?.content

          if (typeof delta === 'string' && delta) {
            full += delta
            handlers.onDelta(delta)
          }
        } catch {
          // A partial NDJSON frame; wait for more bytes.
        }
      }
    }

    return full
  }
}
