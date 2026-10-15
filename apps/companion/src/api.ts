import type { ChatMessage, CompanionChatEvent, CompanionSettings, CursorPoint, WindowBounds } from './types'

export interface SendResult {
  error?: string
  ok: boolean
  text?: string
}

/**
 * The typed surface exposed on `window.basilCompanion` by the preload script.
 * Both renderers program against this; `electron/preload.ts` implements it.
 */
export interface BasilCompanionApi {
  chat: {
    /** Streams a completion; resolves when the turn finishes or fails. */
    send(text: string): Promise<SendResult>
    /** Subscribe to chat lifecycle events (user, start, delta, success, error). */
    onEvent(handler: (event: CompanionChatEvent) => void): () => void
  }
  messages: {
    clear(): void
    get(): Promise<ChatMessage[]>
  }
  overlay: {
    cursorPoint(): Promise<CursorPoint>
    saveBounds(bounds: WindowBounds): Promise<void>
    setBounds(bounds: WindowBounds): void
    setIgnoreMouse(ignore: boolean): void
  }
  panel: {
    close(): Promise<void>
    open(): Promise<boolean>
    toggle(): Promise<boolean>
  }
  settings: {
    get(): Promise<CompanionSettings>
    onChange(handler: (settings: CompanionSettings) => void): () => void
    save(patch: Partial<CompanionSettings>): Promise<CompanionSettings>
  }
  window: {
    alwaysOnTop(value: boolean): void
    close(): void
    minimize(): void
  }
}
