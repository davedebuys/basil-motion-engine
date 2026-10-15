import { atom } from 'nanostores'

import { persistBoolean, storedBoolean } from '@/lib/storage'

import type { BasilPresenceAudioCue } from './presence-audio-engine'

export type BasilPresenceAudioStatus = 'error' | 'idle' | 'muted' | 'played' | 'suppressed' | 'unavailable'

export interface BasilPresenceAudioSnapshot {
  lastCue: BasilPresenceAudioCue | null
  lastPlayedAt: number | null
  playCount: number
  status: BasilPresenceAudioStatus
}

const PRESENCE_AUDIO_KEY = 'basil.motion.presence-sounds-enabled.v1'

export const $basilPresenceAudioEnabled = atom(storedBoolean(PRESENCE_AUDIO_KEY, true))
export const $basilPresenceAudio = atom<BasilPresenceAudioSnapshot>({
  lastCue: null,
  lastPlayedAt: null,
  playCount: 0,
  status: 'idle'
})

export function setBasilPresenceAudioEnabled(enabled: boolean): void {
  persistBoolean(PRESENCE_AUDIO_KEY, enabled)
  $basilPresenceAudioEnabled.set(enabled)
  $basilPresenceAudio.set({
    ...$basilPresenceAudio.get(),
    status: enabled ? 'idle' : 'muted'
  })
}

export function toggleBasilPresenceAudio(): void {
  setBasilPresenceAudioEnabled(!$basilPresenceAudioEnabled.get())
}

export function markBasilPresenceAudio(
  status: BasilPresenceAudioStatus,
  cue: BasilPresenceAudioCue | null = null,
  at = Date.now()
): void {
  const current = $basilPresenceAudio.get()

  $basilPresenceAudio.set({
    lastCue: cue ?? current.lastCue,
    lastPlayedAt: status === 'played' ? at : current.lastPlayedAt,
    playCount: status === 'played' ? current.playCount + 1 : current.playCount,
    status
  })
}
