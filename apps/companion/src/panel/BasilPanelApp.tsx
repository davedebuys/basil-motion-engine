import { useCallback, useEffect, useState } from 'react'

import type { ChatMessage, CompanionSettings } from '../types'
import { DEFAULT_SETTINGS } from '../types'
import { ChatView } from './ChatView'
import { DashboardView } from './DashboardView'
import { SettingsView } from './SettingsView'

type Tab = 'chat' | 'dashboard' | 'settings'

const TABS: readonly { id: Tab; label: string }[] = [
  { id: 'chat', label: 'Chat' },
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'settings', label: 'Settings' }
]

/**
 * The companion panel: a compact, frameless, always-on-top window with Chat,
 * Dashboard, and Settings surfaces.
 *
 * Main owns the transcript and settings; this view mirrors them and pushes
 * edits back through the preload bridge.
 */
export function BasilPanelApp() {
  const [tab, setTab] = useState<Tab>('chat')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [settings, setSettings] = useState<CompanionSettings>(DEFAULT_SETTINGS)

  useEffect(() => {
    const api = window.basilCompanion

    if (!api) {
      return
    }

    void api.messages.get().then(setMessages)
    void api.settings.get().then(setSettings)

    return api.settings.onChange(setSettings)
  }, [])

  const saveSettings = useCallback((patch: Partial<CompanionSettings>) => {
    void window.basilCompanion?.settings.save(patch).then(setSettings)
  }, [])

  const activeTab = tab

  return (
    <div className="flex h-screen w-screen flex-col bg-[#0d0f12] text-foreground">
      {/* Frameless title bar — drags the window, keeps buttons clickable. */}
      <header
        className="flex items-center justify-between border-b border-(--ui-stroke-secondary) px-3 py-2"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">Basil</span>
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">companion</span>
        </div>

        <div className="flex items-center gap-1" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <TitleButton onClick={() => window.basilCompanion?.window.alwaysOnTop(!settings.alwaysOnTop)} title="Toggle always on top">
            {settings.alwaysOnTop ? '📌' : '📍'}
          </TitleButton>
          <TitleButton onClick={() => window.basilCompanion?.window.minimize()} title="Minimize">
            –
          </TitleButton>
          <TitleButton onClick={() => window.basilCompanion?.window.close()} title="Close">
            ✕
          </TitleButton>
        </div>
      </header>

      <nav className="flex border-b border-(--ui-stroke-secondary)">
        {TABS.map(entry => (
          <button
            className={`flex-1 px-3 py-2 text-xs transition-colors ${
              activeTab === entry.id
                ? 'border-b-2 border-foreground text-foreground'
                : 'border-b-2 border-transparent text-muted-foreground hover:text-foreground'
            }`}
            key={entry.id}
            onClick={() => setTab(entry.id)}
            type="button"
          >
            {entry.label}
          </button>
        ))}
      </nav>

      <main className="min-h-0 flex-1">
        {activeTab === 'chat' && <ChatView />}
        {activeTab === 'dashboard' && <DashboardView messages={messages} settings={settings} />}
        {activeTab === 'settings' && <SettingsView onChange={saveSettings} settings={settings} />}
      </main>
    </div>
  )
}

function TitleButton({
  onClick,
  title,
  children
}: {
  children: React.ReactNode
  onClick: () => void
  title: string
}) {
  return (
    <button
      className="grid size-7 place-items-center rounded text-xs text-muted-foreground hover:bg-(--ui-bg-hover) hover:text-foreground"
      onClick={onClick}
      title={title}
      type="button"
    >
      {children}
    </button>
  )
}
