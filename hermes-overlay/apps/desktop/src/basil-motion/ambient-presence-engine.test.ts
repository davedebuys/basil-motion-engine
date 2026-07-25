import { describe, expect, it } from 'vitest'

import { deriveBasilAmbientPresenceAction } from './ambient-presence-engine'

describe('Basil ambient presence engine', () => {
  it('accepts summon only while fully hidden', () => {
    expect(deriveBasilAmbientPresenceAction({ command: 'summon', presence: 'hidden' })).toBe('summon')

    for (const presence of ['summoning', 'visible', 'hiding'] as const) {
      expect(deriveBasilAmbientPresenceAction({ command: 'summon', presence })).toBeNull()
    }
  })

  it('accepts hide only while fully visible', () => {
    expect(deriveBasilAmbientPresenceAction({ command: 'hide', presence: 'visible' })).toBe('hide')

    for (const presence of ['hidden', 'summoning', 'hiding'] as const) {
      expect(deriveBasilAmbientPresenceAction({ command: 'hide', presence })).toBeNull()
    }
  })

  it('rejects unrecognized transcripts in every phase', () => {
    for (const presence of ['hidden', 'summoning', 'visible', 'hiding'] as const) {
      expect(deriveBasilAmbientPresenceAction({ command: null, presence })).toBeNull()
    }
  })
})
