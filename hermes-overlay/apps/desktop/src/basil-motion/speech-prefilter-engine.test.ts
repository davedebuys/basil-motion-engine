import { describe, expect, it } from 'vitest'

import { deriveBasilSpeechPrefilterDecision } from './speech-prefilter-engine'

describe('Basil speech prefilter engine', () => {
  it('discards only a confident local rejection', () => {
    expect(deriveBasilSpeechPrefilterDecision({ available: true, candidate: false })).toBe('discard')
  })

  it('keeps candidates and unavailable-host fallbacks on the strict STT path', () => {
    expect(deriveBasilSpeechPrefilterDecision({ available: true, candidate: true })).toBe('transcribe')
    expect(deriveBasilSpeechPrefilterDecision({ available: false, candidate: false })).toBe('transcribe')
    expect(deriveBasilSpeechPrefilterDecision({ available: false, candidate: true })).toBe('transcribe')
  })
})
