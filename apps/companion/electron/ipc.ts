import { BrowserWindow, ipcMain, screen } from 'electron'

import type { SendResult } from '../src/api'
import type { ChatMessage, CompanionChatEvent, CompanionSettings, WindowBounds } from '../src/types'
import { providerFor } from './llm/provider'
import type { SettingsStore } from './settings'
import { boundsOf, createPanelWindow } from './windows'

const CHAT_CHANNEL = 'basil-companion:chat'
const SETTINGS_CHANNEL = 'basil-companion:settings'

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

/**
 * Owns every IPC route plus chat orchestration.
 *
 * The Electron main process is the single source of truth: it holds the
 * settings, the transcript, and the provider call. Renderers stay dumb — the
 * panel posts a message and listens for chat events; the overlay listens for
 * the same events and folds them into Basil's state.
 */
export class CompanionIpc {
  private abort: AbortController | null = null
  private overlayWindow: BrowserWindow | null = null
  private panelWindow: BrowserWindow | null = null
  private readonly store: SettingsStore

  constructor(store: SettingsStore) {
    this.store = store
  }

  attachOverlay(win: BrowserWindow): void {
    this.overlayWindow = win

    win.on('closed', () => {
      this.overlayWindow = null
    })
  }

  register(): void {
    ipcMain.handle('basil-companion:settings:get', () => this.store.settings)
    ipcMain.handle('basil-companion:settings:save', (_event, patch: Partial<CompanionSettings>) =>
      this.saveSettings(patch)
    )
    ipcMain.handle('basil-companion:messages:get', () => this.store.messages)
    ipcMain.on('basil-companion:messages:clear', () => {
      this.store.replaceMessages([])
      this.broadcast(SETTINGS_CHANNEL, this.store.settings)
    })

    ipcMain.handle('basil-companion:chat:send', (_event, text: string) => this.send(text))
    ipcMain.handle('basil-companion:cursor-point', () => this.cursorPoint())

    ipcMain.on('basil-companion:overlay:ignore-mouse', (_event, ignore: boolean) => {
      this.overlayWindow?.setIgnoreMouseEvents(Boolean(ignore), { forward: true })
    })
    ipcMain.on('basil-companion:overlay:set-bounds', (_event, bounds: WindowBounds) => {
      if (this.overlayWindow && !this.overlayWindow.isDestroyed() && bounds) {
        this.overlayWindow.setBounds(bounds)
      }
    })
    ipcMain.handle('basil-companion:overlay:save-bounds', (_event, bounds: WindowBounds) => {
      if (bounds) {
        this.store.setOverlayBounds(bounds)
      }
    })

    ipcMain.handle('basil-companion:panel:open', () => this.openPanel())
    ipcMain.handle('basil-companion:panel:close', () => {
      this.closePanel()

      return true
    })
    ipcMain.handle('basil-companion:panel:toggle', () => this.togglePanel())

    ipcMain.on('basil-companion:window:always-on-top', (_event, value: boolean) => this.setAlwaysOnTop(Boolean(value)))
    ipcMain.on('basil-companion:window:close', event => BrowserWindow.fromWebContents(event.sender)?.close())
    ipcMain.on('basil-companion:window:minimize', event =>
      BrowserWindow.fromWebContents(event.sender)?.minimize()
    )
  }

  private broadcast(channel: string, payload: unknown): void {
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) {
        win.webContents.send(channel, payload)
      }
    }
  }

  private async send(text: string): Promise<SendResult> {
    const trimmed = text.trim()

    if (!trimmed) {
      return { ok: false, error: 'Message is empty' }
    }

    const user: ChatMessage = { createdAt: Date.now(), id: uid(), role: 'user', text: trimmed }

    this.store.addMessage(user)
    this.broadcast(CHAT_CHANNEL, { text: trimmed, type: 'user_message' } satisfies CompanionChatEvent)

    this.abort?.abort()

    const controller = new AbortController()

    this.abort = controller

    this.broadcast(CHAT_CHANNEL, { type: 'assistant_start' } satisfies CompanionChatEvent)

    try {
      const provider = this.store.settings.provider
      const full = await providerFor(provider.id).stream(
        { messages: this.store.messages, provider, signal: controller.signal },
        {
          onDelta: delta =>
            this.broadcast(CHAT_CHANNEL, { text: delta, type: 'assistant_delta' } satisfies CompanionChatEvent)
        }
      )

      const assistant: ChatMessage = { createdAt: Date.now(), id: uid(), role: 'assistant', text: full }

      this.store.addMessage(assistant)
      this.broadcast(CHAT_CHANNEL, { text: full, type: 'assistant_success' } satisfies CompanionChatEvent)

      return { ok: true, text: full }
    } catch (error) {
      if (controller.signal.aborted) {
        return { ok: false, error: 'Cancelled' }
      }

      const message = error instanceof Error ? error.message : String(error)

      this.broadcast(CHAT_CHANNEL, { text: message, type: 'assistant_error' } satisfies CompanionChatEvent)

      return { ok: false, error: message }
    }
  }

  private cursorPoint(): { x: number; y: number } {
    const point = screen.getCursorScreenPoint()

    return { x: point.x, y: point.y }
  }

  private saveSettings(patch: Partial<CompanionSettings>): CompanionSettings {
    const updated = this.store.updateSettings(patch)

    if (this.panelWindow && !this.panelWindow.isDestroyed()) {
      this.panelWindow.setAlwaysOnTop(updated.alwaysOnTop)
    }

    this.broadcast(SETTINGS_CHANNEL, updated)

    return updated
  }

  private setAlwaysOnTop(value: boolean): void {
    if (this.panelWindow && !this.panelWindow.isDestroyed()) {
      this.panelWindow.setAlwaysOnTop(value)
    }

    this.store.updateSettings({ alwaysOnTop: value })
  }

  private saveOverlayBounds(bounds: WindowBounds): void {
    if (bounds) {
      this.store.setOverlayBounds(bounds)
    }
  }

  private openPanel(): boolean {
    if (this.panelWindow && !this.panelWindow.isDestroyed()) {
      this.panelWindow.show()
      this.panelWindow.focus()

      return true
    }

    const win = createPanelWindow(this.store.panelBounds, this.store.settings.alwaysOnTop)

    this.panelWindow = win

    win.on('moved', () => this.store.setPanelBounds(boundsOf(win)))
    win.on('closed', () => {
      this.panelWindow = null
    })

    return true
  }

  private closePanel(): void {
    if (this.panelWindow && !this.panelWindow.isDestroyed()) {
      this.panelWindow.close()
    }

    this.panelWindow = null
  }

  private togglePanel(): boolean {
    if (this.panelWindow && !this.panelWindow.isDestroyed()) {
      this.closePanel()

      return false
    }

    return this.openPanel()
  }
}
