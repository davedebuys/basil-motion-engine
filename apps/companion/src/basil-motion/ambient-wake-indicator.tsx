import { useStore } from '@nanostores/react'

import { iconSize, Loader2, Mic, MicOff } from '@/lib/icons'

import { $basilAmbientWake, $basilAmbientWakeEnabled, setBasilAmbientWakeEnabled } from './ambient-wake'

interface BasilAmbientWakeIndicatorProps {
  onDisable?: () => void
  x: number
  y: number
}

function statusLabel(status: ReturnType<typeof $basilAmbientWake.get>['status']): string {
  if (status === 'listening') {
    return 'Basil voice commands are listening locally'
  }

  if (status === 'transcribing') {
    return 'Basil is checking a local presence phrase'
  }

  if (status === 'prefiltering') {
    return 'Basil is checking for his name locally'
  }

  if (status === 'wake_detected') {
    return 'Basil heard the local summon phrase'
  }

  if (status === 'hide_detected') {
    return 'Basil heard the local hide phrase'
  }

  if (status === 'error') {
    return 'Basil voice commands need attention'
  }

  if (status === 'paused') {
    return 'Basil voice commands are paused'
  }

  return 'Basil local voice commands are armed'
}

export function BasilAmbientWakeIndicator({ onDisable, x, y }: BasilAmbientWakeIndicatorProps) {
  const enabled = useStore($basilAmbientWakeEnabled)
  const wake = useStore($basilAmbientWake)

  if (!enabled) {
    return null
  }

  const busy = wake.status === 'prefiltering' || wake.status === 'starting' || wake.status === 'transcribing'
  const label = statusLabel(wake.status)

  return (
    <button
      aria-label={`${label}. Disable`}
      className="pointer-events-auto absolute grid size-6 place-items-center rounded-full border border-(--ui-stroke-secondary) bg-(--ui-bg-elevated) text-foreground shadow-sm outline-none hover:bg-(--ui-bg-hover) focus-visible:ring-2 focus-visible:ring-ring"
      data-basil-ambient-wake-indicator={wake.status}
      data-basil-ambient-wake-level={wake.level.toFixed(3)}
      onClick={onDisable ?? (() => setBasilAmbientWakeEnabled(false))}
      style={{ left: x + 80, top: y + 4 }}
      title={`${label}. Click to disable.`}
      type="button"
    >
      {wake.status === 'listening' && (
        <span
          aria-hidden
          className="absolute inset-0 rounded-full border border-current"
          style={{ opacity: 0.18 + wake.level * 0.62, transform: `scale(${1 + wake.level * 0.24})` }}
        />
      )}
      {busy ? (
        <Loader2 className={`${iconSize.xs} animate-spin`} />
      ) : wake.status === 'error' ? (
        <MicOff className={iconSize.xs} />
      ) : (
        <Mic className={iconSize.xs} />
      )}
    </button>
  )
}
