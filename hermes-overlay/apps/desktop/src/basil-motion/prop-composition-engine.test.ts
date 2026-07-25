import { describe, expect, it } from 'vitest'

import { deriveBasilPropComposition } from './prop-composition-engine'

describe('deriveBasilPropComposition', () => {
  it('keeps an ordinary scene context when no interaction accessory exists', () => {
    expect(deriveBasilPropComposition({ hasPhysicalContext: false })).toEqual({
      accessoryOpacity: 0,
      accessoryRole: 'none',
      contextOpacity: 1,
      gripOpacity: 0
    })
  })

  it('makes a held interaction prop primary when no real object exists', () => {
    expect(deriveBasilPropComposition({ accessory: 'terminal', hasPhysicalContext: false })).toEqual({
      accessoryOpacity: 0.9,
      accessoryRole: 'interaction',
      contextOpacity: 0,
      gripOpacity: 1
    })
  })

  it('keeps a real object primary and demotes the semantic prop to a hand-free badge', () => {
    expect(deriveBasilPropComposition({ accessory: 'terminal', hasPhysicalContext: true })).toEqual({
      accessoryOpacity: 0.54,
      accessoryRole: 'semantic_badge',
      contextOpacity: 1,
      gripOpacity: 0
    })
  })

  it('preserves floating symbols and worn cues without inventing grips', () => {
    expect(deriveBasilPropComposition({ accessory: 'heart', hasPhysicalContext: false })).toMatchObject({
      accessoryRole: 'symbol',
      contextOpacity: 1,
      gripOpacity: 0
    })
    expect(deriveBasilPropComposition({ accessory: 'glasses', hasPhysicalContext: true })).toMatchObject({
      accessoryRole: 'worn',
      contextOpacity: 1,
      gripOpacity: 0
    })
  })

  it('uses the existing state-aware crown signal for antenna interactions', () => {
    expect(deriveBasilPropComposition({ accessory: 'antenna', hasPhysicalContext: false })).toEqual({
      accessoryOpacity: 0,
      accessoryRole: 'worn',
      contextOpacity: 1,
      gripOpacity: 0
    })
  })
})
