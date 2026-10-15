import {
  type BasilPresenceAudioCue,
  type BasilPresenceAudioScore,
  basilPresenceAudioScore
} from './presence-audio-engine'

type BasilAudioContextConstructor = new () => AudioContext

let audioContext: AudioContext | null = null

function audioContextConstructor(): BasilAudioContextConstructor | null {
  if (typeof window === 'undefined') {
    return null
  }

  return (window.AudioContext ??
    (window as typeof window & { webkitAudioContext?: BasilAudioContextConstructor }).webkitAudioContext ??
    null) as BasilAudioContextConstructor | null
}

function getAudioContext(): AudioContext | null {
  if (audioContext && audioContext.state !== 'closed') {
    return audioContext
  }

  const AudioContextClass = audioContextConstructor()

  if (!AudioContextClass) {
    return null
  }

  audioContext = new AudioContextClass()

  return audioContext
}

function scheduleTone(context: AudioContext, score: BasilPresenceAudioScore, toneIndex: number): void {
  const tone = score.tones[toneIndex]
  const oscillator = context.createOscillator()
  const envelope = context.createGain()
  const start = context.currentTime + tone.startMs / 1_000
  const attackEnd = start + Math.min(tone.attackMs, tone.durationMs * 0.45) / 1_000
  const end = start + tone.durationMs / 1_000

  oscillator.type = tone.waveform
  oscillator.frequency.setValueAtTime(tone.frequencyStart, start)
  oscillator.frequency.exponentialRampToValueAtTime(tone.frequencyEnd, end)

  envelope.gain.setValueAtTime(0.0001, start)
  envelope.gain.exponentialRampToValueAtTime(Math.max(0.0001, tone.gain), attackEnd)
  envelope.gain.exponentialRampToValueAtTime(0.0001, end)

  oscillator.connect(envelope)
  envelope.connect(context.destination)
  oscillator.start(start)
  oscillator.stop(end + 0.012)

  oscillator.onended = () => {
    oscillator.disconnect()
    envelope.disconnect()
  }
}

export async function playBasilPresenceAudio(cue: BasilPresenceAudioCue): Promise<boolean> {
  const context = getAudioContext()

  if (!context) {
    return false
  }

  if (context.state === 'suspended') {
    await context.resume()
  }

  const score = basilPresenceAudioScore(cue)

  for (let index = 0; index < score.tones.length; index += 1) {
    scheduleTone(context, score, index)
  }

  return true
}

export async function closeBasilPresenceAudio(): Promise<void> {
  const context = audioContext
  audioContext = null

  if (context && context.state !== 'closed') {
    await context.close()
  }
}
