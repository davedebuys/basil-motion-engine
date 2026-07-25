import { describe, expect, it } from 'vitest'

import { basilPresenceAudioScore, decideBasilPresenceAudio } from './presence-audio-engine'

describe('Basil presence audio engine', () => {
  it('defines short, quiet procedural scores with a microphone-release lead', () => {
    for (const cue of ['summon', 'hide'] as const) {
      const score = basilPresenceAudioScore(cue)

      expect(score.cue).toBe(cue)
      expect(score.durationMs).toBeLessThanOrEqual(400)
      expect(score.tones).toHaveLength(3)
      expect(Math.min(...score.tones.map(tone => tone.startMs))).toBeGreaterThanOrEqual(40)
      expect(Math.max(...score.tones.map(tone => tone.gain))).toBeLessThanOrEqual(0.07)
      expect(score.tones.every(tone => tone.frequencyStart > 0 && tone.frequencyEnd > 0)).toBe(true)
    }
  })

  it('plays only a new genuine transition in the active renderer', () => {
    const base = {
      active: true,
      enabled: true,
      initialized: true,
      lastNonce: 4,
      nonce: 5,
      voicePlaybackIdle: true
    }

    expect(decideBasilPresenceAudio({ ...base, phase: 'summoning' })).toEqual({
      cue: 'summon',
      reason: 'play'
    })
    expect(decideBasilPresenceAudio({ ...base, phase: 'hiding' })).toEqual({
      cue: 'hide',
      reason: 'play'
    })
    expect(decideBasilPresenceAudio({ ...base, nonce: 4, phase: 'summoning' }).reason).toBe('duplicate')
    expect(decideBasilPresenceAudio({ ...base, initialized: false, phase: 'summoning' }).reason).toBe('initial')
    expect(decideBasilPresenceAudio({ ...base, active: false, phase: 'summoning' }).reason).toBe('inactive')
    expect(decideBasilPresenceAudio({ ...base, phase: 'visible' }).reason).toBe('not-transition')
  })

  it('suppresses sound for mute and active Hermes speech', () => {
    const base = {
      active: true,
      enabled: true,
      initialized: true,
      lastNonce: 1,
      nonce: 2,
      phase: 'summoning' as const,
      voicePlaybackIdle: true
    }

    expect(decideBasilPresenceAudio({ ...base, enabled: false }).reason).toBe('disabled')
    expect(decideBasilPresenceAudio({ ...base, voicePlaybackIdle: false })).toEqual({
      cue: null,
      reason: 'voice-playback'
    })
  })
})
