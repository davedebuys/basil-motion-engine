import { useState } from 'react'

import { PROVIDER_OPTIONS, type CompanionSettings, type PersonalityMode, type ProviderId } from '../types'

interface SettingsViewProps {
  settings: CompanionSettings
  onChange: (patch: Partial<CompanionSettings>) => void
}

const PERSONALITY_MODES: readonly PersonalityMode[] = ['quiet', 'balanced', 'playful']

/**
 * Settings: provider credentials, the always-on-top default, and Basil's
 * personality cadence. Every change is persisted through main immediately.
 */
export function SettingsView({ onChange, settings }: SettingsViewProps) {
  const [apiKey, setApiKey] = useState(settings.provider.apiKey)
  const [baseUrl, setBaseUrl] = useState(settings.provider.baseUrl)
  const [model, setModel] = useState(settings.provider.model)

  const commitProvider = (patch: Partial<CompanionSettings['provider']>) => {
    onChange({ provider: { ...settings.provider, ...patch } })
  }

  return (
    <div className="panel-scroll h-full space-y-4 overflow-y-auto p-3 text-sm">
      <section className="space-y-3 rounded border border-(--ui-stroke-secondary) bg-(--ui-bg-elevated) p-3">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">Provider</div>

        <Field label="Type">
          <select
            className="w-full rounded border border-(--ui-stroke-secondary) bg-(--ui-bg-hover) p-2 text-sm text-foreground outline-none"
            onChange={event => {
              const value = event.target.value
              const [id, presetUrl] = value.split('|') as [ProviderId, string]

              setBaseUrl(presetUrl)
              commitProvider({ baseUrl: presetUrl, id })
            }}
            value={`${settings.provider.id}|${PROVIDER_OPTIONS.find(option => option.baseUrl === settings.provider.baseUrl)?.baseUrl ?? settings.provider.baseUrl}`}
          >
            {PROVIDER_OPTIONS.map(option => (
              <option key={option.label} value={`${option.id}|${option.baseUrl}`}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Base URL">
          <input
            className="w-full rounded border border-(--ui-stroke-secondary) bg-(--ui-bg-hover) p-2 text-sm text-foreground outline-none"
            onBlur={() => commitProvider({ baseUrl: baseUrl.trim() })}
            onChange={event => setBaseUrl(event.target.value)}
            placeholder="https://openrouter.ai/api/v1"
            value={baseUrl}
          />
        </Field>

        <Field label="API key">
          <input
            className="w-full rounded border border-(--ui-stroke-secondary) bg-(--ui-bg-hover) p-2 text-sm text-foreground outline-none"
            onBlur={() => commitProvider({ apiKey: apiKey.trim() })}
            onChange={event => setApiKey(event.target.value)}
            placeholder="sk-… (leave empty for local Ollama)"
            type="password"
            value={apiKey}
          />
        </Field>

        <Field label="Model">
          <input
            className="w-full rounded border border-(--ui-stroke-secondary) bg-(--ui-bg-hover) p-2 text-sm text-foreground outline-none"
            onBlur={() => commitProvider({ model: model.trim() })}
            onChange={event => setModel(event.target.value)}
            placeholder="openrouter/auto, llama3.2, provider/model…"
            value={model}
          />
        </Field>
      </section>

      <section className="space-y-3 rounded border border-(--ui-stroke-secondary) bg-(--ui-bg-elevated) p-3">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">Panel</div>

        <label className="flex items-center justify-between gap-3">
          <span>Always on top</span>
          <input
            checked={settings.alwaysOnTop}
            onChange={event => onChange({ alwaysOnTop: event.target.checked })}
            type="checkbox"
          />
        </label>

        <Field label="Personality">
          <div className="flex gap-1">
            {PERSONALITY_MODES.map(mode => (
              <button
                className={`flex-1 rounded border px-2 py-1 text-xs ${
                  settings.personality === mode
                    ? 'border-(--ui-stroke-secondary) bg-(--ui-bg-hover) text-foreground'
                    : 'border-transparent bg-transparent text-muted-foreground hover:text-foreground'
                }`}
                key={mode}
                onClick={() => onChange({ personality: mode })}
                type="button"
              >
                {mode}
              </button>
            ))}
          </div>
        </Field>
      </section>

      <section className="rounded border border-(--ui-stroke-secondary) bg-(--ui-bg-elevated) p-3">
        <button
          className="rounded border border-(--ui-stroke-secondary) px-3 py-1.5 text-xs text-muted-foreground hover:bg-(--ui-bg-hover) hover:text-foreground"
          onClick={() => window.basilCompanion?.messages.clear()}
          type="button"
        >
          Clear conversation
        </button>
      </section>
    </div>
  )
}

function Field({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      {children}
    </label>
  )
}
