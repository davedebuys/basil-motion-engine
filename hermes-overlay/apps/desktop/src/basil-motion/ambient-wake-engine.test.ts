import { describe, expect, it } from 'vitest'

import { deriveBasilAmbientWakeDirective } from './ambient-wake-engine'

describe('Basil ambient wake engine', () => {
  it('listens only while Basil is in a stable presence phase', () => {
    expect(deriveBasilAmbientWakeDirective({ enabled: true, playbackActive: false, presence: 'hidden' })).toBe('listen')
    expect(deriveBasilAmbientWakeDirective({ enabled: true, playbackActive: false, presence: 'visible' })).toBe('listen')

    for (const presence of ['summoning', 'hiding'] as const) {
      expect(deriveBasilAmbientWakeDirective({ enabled: true, playbackActive: false, presence })).toBe('armed')
    }
  })

  it('stays off until explicitly enabled and pauses for voice playback', () => {
    expect(deriveBasilAmbientWakeDirective({ enabled: false, playbackActive: false, presence: 'hidden' })).toBe('off')
    expect(deriveBasilAmbientWakeDirective({ enabled: true, playbackActive: true, presence: 'hidden' })).toBe('pause')
    expect(deriveBasilAmbientWakeDirective({ enabled: true, playbackActive: true, presence: 'visible' })).toBe('pause')
  })
})
