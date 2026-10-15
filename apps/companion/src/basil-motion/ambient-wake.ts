import { atom } from 'nanostores'

import { persistBoolean, storedBoolean } from '@/lib/storage'

export type BasilAmbientWakeStatus =
  | 'armed'
  | 'error'
  | 'hide_detected'
  | 'listening'
  | 'off'
  | 'paused'
  | 'prefiltering'
  | 'starting'
  | 'transcribing'
  | 'wake_detected'

export interface BasilAmbientWakeSnapshot {
  error: string | null
  lastWakeAt: number | null
  level: number
  status: BasilAmbientWakeStatus
}

const AMBIENT_WAKE_KEY = 'basil.motion.ambient-wake-enabled.v1'
const initiallyEnabled = storedBoolean(AMBIENT_WAKE_KEY, false)

export const $basilAmbientWakeEnabled = atom(initiallyEnabled)
export const $basilAmbientWake = atom<BasilAmbientWakeSnapshot>({
  error: null,
  lastWakeAt: null,
  level: 0,
  status: initiallyEnabled ? 'armed' : 'off'
})

export function setBasilAmbientWakeEnabled(enabled: boolean): void {
  persistBoolean(AMBIENT_WAKE_KEY, enabled)
  $basilAmbientWakeEnabled.set(enabled)
  $basilAmbientWake.set({
    ...$basilAmbientWake.get(),
    error: null,
    level: 0,
    status: enabled ? 'armed' : 'off'
  })
}

export function toggleBasilAmbientWake(): void {
  setBasilAmbientWakeEnabled(!$basilAmbientWakeEnabled.get())
}

export function setBasilAmbientWakeStatus(
  status: BasilAmbientWakeStatus,
  options: { error?: string | null; level?: number } = {}
): void {
  const current = $basilAmbientWake.get()

  $basilAmbientWake.set({
    ...current,
    error: options.error === undefined ? (status === 'error' ? current.error : null) : options.error,
    level: Math.max(0, Math.min(1, options.level ?? (status === 'listening' ? current.level : 0))),
    status
  })
}

export function setBasilAmbientWakeLevel(level: number): void {
  const current = $basilAmbientWake.get()

  if (current.status !== 'listening') {
    return
  }

  $basilAmbientWake.set({
    ...current,
    level: Math.max(0, Math.min(1, level))
  })
}

export function markBasilAmbientWakeDetected(at = Date.now()): void {
  $basilAmbientWake.set({
    error: null,
    lastWakeAt: at,
    level: 0,
    status: 'wake_detected'
  })
}

export function markBasilAmbientHideDetected(at = Date.now()): void {
  $basilAmbientWake.set({
    error: null,
    lastWakeAt: at,
    level: 0,
    status: 'hide_detected'
  })
}

export function applyBasilAmbientWakeState(enabled: boolean, snapshot: BasilAmbientWakeSnapshot): void {
  $basilAmbientWakeEnabled.set(enabled)
  $basilAmbientWake.set(snapshot)
}
