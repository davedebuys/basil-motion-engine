export interface BasilAmbientVadOptions {
  baseThreshold: number
  calibrationMs: number
  calibrationSpeechThreshold: number
  idleMs: number
  minimumPeak: number
  minimumSpeechMs: number
  noiseMargin: number
  noiseMultiplier: number
  silenceMs: number
}

export interface BasilAmbientVadState {
  calibrated: boolean
  heardSpeech: boolean
  lastSpeechAt: number | null
  noiseFloor: number
  peak: number
  speechPeak: number
  speechStartedAt: number | null
  startedAt: number
}

export interface BasilAmbientVadSample {
  event: 'idle' | 'none' | 'speech-ended' | 'speech-started'
  state: BasilAmbientVadState
  threshold: number
}

export const BASIL_AMBIENT_VAD_DEFAULTS: BasilAmbientVadOptions = {
  baseThreshold: 0.11,
  calibrationMs: 700,
  calibrationSpeechThreshold: 0.28,
  idleMs: 8_000,
  minimumPeak: 0.3,
  minimumSpeechMs: 420,
  noiseMargin: 0.045,
  noiseMultiplier: 2.1,
  silenceMs: 850
}

function clamp(value: number, minimum = 0, maximum = 1): number {
  return Math.min(maximum, Math.max(minimum, Number.isFinite(value) ? value : minimum))
}

export function createBasilAmbientVadState(startedAt: number, noiseFloor = 0): BasilAmbientVadState {
  return {
    calibrated: false,
    heardSpeech: false,
    lastSpeechAt: null,
    noiseFloor: clamp(noiseFloor, 0, 0.2),
    peak: 0,
    speechPeak: 0,
    speechStartedAt: null,
    startedAt
  }
}

export function sampleBasilAmbientVad(
  previous: BasilAmbientVadState,
  levelInput: number,
  nowInput: number,
  options: BasilAmbientVadOptions = BASIL_AMBIENT_VAD_DEFAULTS
): BasilAmbientVadSample {
  const now = Number.isFinite(nowInput) ? Math.max(previous.startedAt, nowInput) : previous.startedAt
  const level = clamp(levelInput)
  const calibrationElapsed = now - previous.startedAt
  const calibrated = previous.calibrated || calibrationElapsed >= Math.max(0, options.calibrationMs)
  let noiseFloor = previous.noiseFloor

  const provisionalThreshold = Math.max(
    clamp(options.baseThreshold),
    noiseFloor * Math.max(1, options.noiseMultiplier) + Math.max(0, options.noiseMargin)
  )

  if (
    !previous.heardSpeech &&
    level < Math.max(provisionalThreshold, clamp(options.calibrationSpeechThreshold))
  ) {
    const response = calibrated ? 0.025 : 0.14

    noiseFloor = clamp(noiseFloor + (level - noiseFloor) * response, 0, 0.2)
  }

  const adaptiveThreshold = Math.max(
    clamp(options.baseThreshold),
    noiseFloor * Math.max(1, options.noiseMultiplier) + Math.max(0, options.noiseMargin)
  )

  const threshold = calibrated
    ? adaptiveThreshold
    : Math.max(adaptiveThreshold, clamp(options.calibrationSpeechThreshold))

  const loud = level >= threshold
  let heardSpeech = previous.heardSpeech
  let lastSpeechAt = previous.lastSpeechAt
  let speechPeak = previous.speechPeak
  let speechStartedAt = previous.speechStartedAt
  let event: BasilAmbientVadSample['event'] = 'none'

  if (loud) {
    speechStartedAt ??= now
    lastSpeechAt = now
    speechPeak = Math.max(speechPeak, level)

    if (
      !heardSpeech &&
      speechPeak >= clamp(options.minimumPeak) &&
      now - speechStartedAt >= Math.max(0, options.minimumSpeechMs)
    ) {
      heardSpeech = true
      event = 'speech-started'
    }
  } else if (!heardSpeech) {
    speechStartedAt = null
    speechPeak = 0
  } else if (lastSpeechAt !== null && now - lastSpeechAt >= Math.max(0, options.silenceMs)) {
    event = 'speech-ended'
  }

  if (!heardSpeech && event === 'none' && now - previous.startedAt >= Math.max(0, options.idleMs)) {
    event = 'idle'
  }

  return {
    event,
    state: {
      calibrated,
      heardSpeech,
      lastSpeechAt,
      noiseFloor,
      peak: Math.max(previous.peak, level),
      speechPeak,
      speechStartedAt,
      startedAt: previous.startedAt
    },
    threshold
  }
}
