import { useEffect, useRef, useState } from 'react'

import type { ChatMessage } from '../types'

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

/**
 * The chat surface. Main owns the transcript and the provider call; this view
 * posts a message and renders the streaming events that come back.
 */
export function ChatView() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [streaming, setStreaming] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    void window.basilCompanion?.messages.get().then(setMessages)
  }, [])

  useEffect(() => {
    const api = window.basilCompanion

    if (!api) {
      return
    }

    return api.chat.onEvent(event => {
      if (event.type === 'assistant_start') {
        setStreaming('')
        setBusy(true)
        setError(null)
      } else if (event.type === 'assistant_delta') {
        setStreaming(previous => previous + event.text)
        setBusy(true)
      } else if (event.type === 'assistant_success') {
        setMessages(previous => [
          ...previous,
          { createdAt: Date.now(), id: uid(), role: 'assistant', text: event.text }
        ])
        setStreaming('')
        setBusy(false)
      } else if (event.type === 'assistant_error') {
        setError(event.text)
        setStreaming('')
        setBusy(false)
      }
    })
  }, [])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [messages.length, streaming])

  const submit = async () => {
    const text = draft.trim()

    if (!text || busy) {
      return
    }

    setMessages(previous => [...previous, { createdAt: Date.now(), id: uid(), role: 'user', text }])
    setDraft('')
    setError(null)

    const result = await window.basilCompanion?.chat.send(text)

    if (result && !result.ok) {
      setError(result.error ?? 'Request failed')
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="panel-scroll flex-1 space-y-3 overflow-y-auto p-3" ref={listRef}>
        {messages.length === 0 && !streaming && (
          <p className="pt-8 text-center text-xs text-muted-foreground">
            Say hi to Basil. Pick a provider in Settings to get started.
          </p>
        )}

        {messages.map(message => (
          <Bubble key={message.id} message={message} />
        ))}

        {streaming && <Bubble message={{ createdAt: Date.now(), id: 'streaming', role: 'assistant', text: streaming }} busy />}

        {error && (
          <div className="rounded border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-300">{error}</div>
        )}
      </div>

      <div className="border-t border-(--ui-stroke-secondary) p-2">
        <div className="flex items-end gap-2">
          <textarea
            className="panel-scroll max-h-24 flex-1 resize-none rounded border border-(--ui-stroke-secondary) bg-(--ui-bg-elevated) p-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onChange={event => setDraft(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                void submit()
              }
            }}
            placeholder={busy ? 'Basil is thinking…' : 'Message Basil'}
            rows={1}
            value={draft}
          />
          <button
            className="grid size-9 shrink-0 place-items-center rounded border border-(--ui-stroke-secondary) bg-(--ui-bg-elevated) text-foreground transition-colors hover:bg-(--ui-bg-hover) disabled:opacity-40"
            disabled={busy || !draft.trim()}
            onClick={() => void submit()}
            title="Send"
            type="button"
          >
            <SendGlyph />
          </button>
        </div>
      </div>
    </div>
  )
}

function Bubble({ busy, message }: { busy?: boolean; message: ChatMessage }) {
  const mine = message.role === 'user'

  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm ${
          mine
            ? 'bg-(--ui-bg-hover) text-foreground'
            : 'border border-(--ui-stroke-secondary) bg-(--ui-bg-elevated) text-foreground'
        }`}
      >
        {message.text || (busy ? <span className="text-muted-foreground">…</span> : null)}
      </div>
    </div>
  )
}

function SendGlyph() {
  return (
    <svg aria-hidden fill="none" height="16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} viewBox="0 0 24 24" width="16">
      <path d="m22 2-7 20-4-9-9-4Z" />
      <path d="M22 2 11 13" />
    </svg>
  )
}
