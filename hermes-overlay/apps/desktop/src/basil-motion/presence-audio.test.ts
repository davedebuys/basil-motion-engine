import { beforeEach, describe, expect, it } from 'vitest'

import {
  $basilPresenceAudio,
  $basilPresenceAudioEnabled,
  markBasilPresenceAudio,
  setBasilPresenceAudioEnabled
} from './presence-audio'

describe('Basil presence audio state', () => {
  beforeEach(() => {
    window.localStorage.clear()
    $basilPresenceAudio.set({
      lastCue: null,
      lastPlayedAt: null,
      playCount: 0,
      status: 'idle'
    })
    setBasilPresenceAudioEnabled(true)
  })

  it('persists an explicit mute preference', () => {
    setBasilPresenceAudioEnabled(false)

    expect($basilPresenceAudioEnabled.get()).toBe(false)
    expect($basilPresenceAudio.get().status).toBe('muted')
    expect(window.localStorage.getItem('basil.motion.presence-sounds-enabled.v1')).toBe('false')
  })

  it('records successful cues without retaining audio data', () => {
    markBasilPresenceAudio('played', 'summon', 123)
    markBasilPresenceAudio('played', 'hide', 456)

    expect($basilPresenceAudio.get()).toEqual({
      lastCue: 'hide',
      lastPlayedAt: 456,
      playCount: 2,
      status: 'played'
    })
  })
})
