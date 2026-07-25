import { describe, expect, it } from 'vitest'

import {
  BASIL_AMBIENT_VAD_DEFAULTS,
  createBasilAmbientVadState,
  sampleBasilAmbientVad
} from './ambient-vad-engine'

function sampleSequence(levels: Array<[number, number]>) {
  let state = createBasilAmbientVadState(0)
  let sample = sampleBasilAmbientVad(state, 0, 0)

  for (const [now, level] of levels) {
    sample = sampleBasilAmbientVad(state, level, now)
    state = sample.state
  }

  return sample
}

describe('Basil ambient VAD engine', () => {
  it('learns a steady room-noise floor without classifying it as speech', () => {
    const sample = sampleSequence([
      [0, 0.1],
      [120, 0.1],
      [240, 0.1],
      [480, 0.1],
      [720, 0.1],
      [1_200, 0.1],
      [8_100, 0.1]
    ])

    expect(sample.state.heardSpeech).toBe(false)
    expect(sample.state.noiseFloor).toBeGreaterThan(0.04)
    expect(sample.threshold).toBeGreaterThan(0.1)
    expect(sample.event).toBe('idle')
  })

  it('requires sustained voice before accepting speech and ends after real silence', () => {
    let state = createBasilAmbientVadState(0, 0.03)

    state = sampleBasilAmbientVad(state, 0.35, 800).state
    const short = sampleBasilAmbientVad(state, 0.35, 930)

    expect(short.state.heardSpeech).toBe(false)

    const started = sampleBasilAmbientVad(short.state, 0.35, 1_240)

    expect(started.event).toBe('speech-started')
    expect(started.state.heardSpeech).toBe(true)

    const ended = sampleBasilAmbientVad(started.state, 0.01, 2_100)

    expect(ended.event).toBe('speech-ended')
  })

  it('rejects an isolated loud spike', () => {
    const sample = sampleSequence([
      [800, 0.5],
      [900, 0.02],
      [1_800, 0.02]
    ])

    expect(sample.state.heardSpeech).toBe(false)
    expect(sample.event).toBe('none')
  })

  it('accepts clear immediate speech during calibration', () => {
    let state = createBasilAmbientVadState(0)

    state = sampleBasilAmbientVad(state, 0.4, 0).state
    const started = sampleBasilAmbientVad(state, 0.4, BASIL_AMBIENT_VAD_DEFAULTS.minimumSpeechMs)

    expect(started.event).toBe('speech-started')
    expect(started.state.heardSpeech).toBe(true)
  })

  it('clamps malformed host levels and timestamps', () => {
    const initial = createBasilAmbientVadState(100, Number.POSITIVE_INFINITY)
    const sample = sampleBasilAmbientVad(initial, Number.NaN, Number.NEGATIVE_INFINITY)

    expect(sample.state.noiseFloor).toBe(0)
    expect(sample.state.peak).toBe(0)
    expect(sample.state.speechPeak).toBe(0)
    expect(sample.threshold).toBeGreaterThanOrEqual(BASIL_AMBIENT_VAD_DEFAULTS.baseThreshold)
  })
})
