import { app } from 'electron'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import { DEFAULT_SETTINGS, type ChatMessage, type CompanionSettings, type WindowBounds } from '../src/types'

export interface PersistedState {
  messages: ChatMessage[]
  overlayBounds: WindowBounds | null
  panelBounds: WindowBounds | null
  settings: CompanionSettings
}

/** Keep the transcript bounded so the JSON store stays small. */
const MAX_MESSAGES = 500

function mergeSettings(incoming?: Partial<CompanionSettings>): CompanionSettings {
  if (!incoming) {
    return structuredClone(DEFAULT_SETTINGS)
  }

  return {
    alwaysOnTop: incoming.alwaysOnTop ?? DEFAULT_SETTINGS.alwaysOnTop,
    personality: incoming.personality ?? DEFAULT_SETTINGS.personality,
    provider: { ...DEFAULT_SETTINGS.provider, ...(incoming.provider ?? {}) }
  }
}

/**
 * Tiny JSON persistence in the Electron `userData` directory.
 *
 * Phase 1 deliberately avoids a native SQLite dependency: a single settings
 * file plus a bounded transcript is small, efficient, and portable. Phase 2
 * swaps this for SQLite once memory/retrieval land.
 */
export class SettingsStore {
  private readonly path: string
  private state: PersistedState

  constructor() {
    this.path = join(app.getPath('userData'), 'basil-companion.json')
    this.state = {
      messages: [],
      overlayBounds: null,
      panelBounds: null,
      settings: structuredClone(DEFAULT_SETTINGS)
    }
  }

  async load(): Promise<void> {
    try {
      const raw = await readFile(this.path, 'utf8')
      const parsed = JSON.parse(raw) as Partial<PersistedState>

      this.state = {
        messages: Array.isArray(parsed.messages) ? parsed.messages : [],
        overlayBounds: parsed.overlayBounds ?? null,
        panelBounds: parsed.panelBounds ?? null,
        settings: mergeSettings(parsed.settings)
      }
    } catch {
      // First run, or unreadable file: fall back to defaults.
    }
  }

  get settings(): CompanionSettings {
    return this.state.settings
  }

  get messages(): ChatMessage[] {
    return this.state.messages
  }

  get overlayBounds(): WindowBounds | null {
    return this.state.overlayBounds
  }

  get panelBounds(): WindowBounds | null {
    return this.state.panelBounds
  }

  updateSettings(patch: Partial<CompanionSettings>): CompanionSettings {
    this.state.settings = {
      alwaysOnTop: patch.alwaysOnTop ?? this.state.settings.alwaysOnTop,
      personality: patch.personality ?? this.state.settings.personality,
      provider: { ...this.state.settings.provider, ...(patch.provider ?? {}) }
    }

    void this.save()

    return this.state.settings
  }

  setOverlayBounds(bounds: WindowBounds): void {
    this.state.overlayBounds = bounds
    void this.save()
  }

  setPanelBounds(bounds: WindowBounds): void {
    this.state.panelBounds = bounds
    void this.save()
  }

  addMessage(message: ChatMessage): void {
    this.state.messages = [...this.state.messages, message].slice(-MAX_MESSAGES)
    void this.save()
  }

  replaceMessages(messages: ChatMessage[]): void {
    this.state.messages = messages.slice(-MAX_MESSAGES)
    void this.save()
  }

  private async save(): Promise<void> {
    try {
      await mkdir(dirname(this.path), { recursive: true })
      await writeFile(this.path, JSON.stringify(this.state), 'utf8')
    } catch (error) {
      console.warn('[basil] could not persist settings', error)
    }
  }
}
