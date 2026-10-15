import { contextBridge, ipcRenderer } from 'electron'

import type { BasilCompanionApi, SendResult } from '../src/api'
import type { ChatMessage, CompanionChatEvent, CompanionSettings, CursorPoint, WindowBounds } from '../src/types'

const CHAT_CHANNEL = 'basil-companion:chat'
const SETTINGS_CHANNEL = 'basil-companion:settings'

/**
 * Preload bridge. Exposes a narrow, typed surface to the renderer and nothing
 * else — no `ipcRenderer` and no Node primitives leak into the page.
 */
const api: BasilCompanionApi = {
  chat: {
    onEvent(handler: (event: CompanionChatEvent) => void): () => void {
      const listener = (_event: Electron.IpcRendererEvent, payload: CompanionChatEvent) => handler(payload)

      ipcRenderer.on(CHAT_CHANNEL, listener)

      return () => ipcRenderer.removeListener(CHAT_CHANNEL, listener)
    },
    send(text: string): Promise<SendResult> {
      return ipcRenderer.invoke('basil-companion:chat:send', text)
    }
  },
  messages: {
    clear(): void {
      ipcRenderer.send('basil-companion:messages:clear')
    },
    get(): Promise<ChatMessage[]> {
      return ipcRenderer.invoke('basil-companion:messages:get')
    }
  },
  overlay: {
    cursorPoint(): Promise<CursorPoint> {
      return ipcRenderer.invoke('basil-companion:cursor-point')
    },
    saveBounds(bounds: WindowBounds): Promise<void> {
      return ipcRenderer.invoke('basil-companion:overlay:save-bounds', bounds)
    },
    setBounds(bounds: WindowBounds): void {
      ipcRenderer.send('basil-companion:overlay:set-bounds', bounds)
    },
    setIgnoreMouse(ignore: boolean): void {
      ipcRenderer.send('basil-companion:overlay:ignore-mouse', ignore)
    }
  },
  panel: {
    close(): Promise<void> {
      return ipcRenderer.invoke('basil-companion:panel:close')
    },
    open(): Promise<boolean> {
      return ipcRenderer.invoke('basil-companion:panel:open')
    },
    toggle(): Promise<boolean> {
      return ipcRenderer.invoke('basil-companion:panel:toggle')
    }
  },
  settings: {
    get(): Promise<CompanionSettings> {
      return ipcRenderer.invoke('basil-companion:settings:get')
    },
    onChange(handler: (settings: CompanionSettings) => void): () => void {
      const listener = (_event: Electron.IpcRendererEvent, payload: CompanionSettings) => handler(payload)

      ipcRenderer.on(SETTINGS_CHANNEL, listener)

      return () => ipcRenderer.removeListener(SETTINGS_CHANNEL, listener)
    },
    save(patch: Partial<CompanionSettings>): Promise<CompanionSettings> {
      return ipcRenderer.invoke('basil-companion:settings:save', patch)
    }
  },
  window: {
    alwaysOnTop(value: boolean): void {
      ipcRenderer.send('basil-companion:window:always-on-top', value)
    },
    close(): void {
      ipcRenderer.send('basil-companion:window:close')
    },
    minimize(): void {
      ipcRenderer.send('basil-companion:window:minimize')
    }
  }
}

contextBridge.exposeInMainWorld('basilCompanion', api)
