import type { BasilPresencePhase } from './presence-engine'

export type BasilPresenceAudioCue = 'hide' | 'summon'
export type BasilPresenceAudioWaveform = 'sine' | 'triangle'

export interface BasilPresenceAudioTone {
  attackMs: number
  durationMs: number
  frequencyEnd: number
  frequencyStart: number
  gain: number
  startMs: number
  waveform: BasilPresenceAudioWaveform
}

export interface BasilPresenceAudioScore {
  cue: BasilPresenceAudioCue
  durationMs: number
  tones: readonly BasilPresenceAudioTone[]
}

export interface BasilPresenceAudioPolicyInput {
  active: boolean
  enabled: boolean
  initialized: boolean
  lastNonce: number
  nonce: number
  phase: BasilPresencePhase
  voicePlaybackIdle: boolean
}

export type BasilPresenceAudioPolicyDecision =
  | { cue: BasilPresenceAudioCue; reason: 'play' }
  | { cue: null; reason: 'disabled' | 'duplicate' | 'inactive' | 'initial' | 'not-transition' | 'voice-playback' }

const SUMMON_SCORE: BasilPresenceAudioScore = {
  cue: 'summon',
  durationMs: 390,
  tones: [
    {
      attackMs: 24,
      durationMs: 145,
      frequencyEnd: 659.25,
      frequencyStart: 440,
      gain: 0.065,
      startMs: 45,
      waveform: 'triangle'
    },
    {
      attackMs: 20,
      durationMs: 155,
      frequencyEnd: 987.77,
      frequencyStart: 659.25,
      gain: 0.045,
      startMs: 142,
      waveform: 'sine'
    },
    {
      attackMs: 12,
      durationMs: 92,
      frequencyEnd: 1760,
      frequencyStart: 1318.51,
      gain: 0.022,
      startMs: 270,
      waveform: 'sine'
    }
  ]
}

const HIDE_SCORE: BasilPresenceAudioScore = {
  cue: 'hide',
  durationMs: 370,
  tones: [
    {
      attackMs: 20,
      durationMs: 150,
      frequencyEnd: 523.25,
      frequencyStart: 783.99,
      gain: 0.052,
      startMs: 45,
      waveform: 'sine'
    },
    {
      attackMs: 20,
      durationMs: 175,
      frequencyEnd: 329.63,
      frequencyStart: 523.25,
      gain: 0.047,
      startMs: 132,
      waveform: 'triangle'
    },
    {
      attackMs: 14,
      durationMs: 86,
      frequencyEnd: 220,
      frequencyStart: 261.63,
      gain: 0.018,
      startMs: 274,
      waveform: 'sine'
    }
  ]
}

export function basilPresenceAudioScore(cue: BasilPresenceAudioCue): BasilPresenceAudioScore {
  return cue === 'summon' ? SUMMON_SCORE : HIDE_SCORE
}

export function decideBasilPresenceAudio(
  input: BasilPresenceAudioPolicyInput
): BasilPresenceAudioPolicyDecision {
  if (!input.active) {
    return { cue: null, reason: 'inactive' }
  }

  if (!input.initialized) {
    return { cue: null, reason: 'initial' }
  }

  if (input.nonce === input.lastNonce) {
    return { cue: null, reason: 'duplicate' }
  }

  const cue = input.phase === 'summoning' ? 'summon' : input.phase === 'hiding' ? 'hide' : null

  if (!cue) {
    return { cue: null, reason: 'not-transition' }
  }

  if (!input.enabled) {
    return { cue: null, reason: 'disabled' }
  }

  if (!input.voicePlaybackIdle) {
    return { cue: null, reason: 'voice-playback' }
  }

  return { cue, reason: 'play' }
}
