import { describe, expect, it } from 'vitest'

import { deriveBasilShellLighting } from './shell-lighting-engine'

describe('deriveBasilShellLighting', () => {
  it('moves shell light opposite genuine rightward gaze and shifts contact shadow', () => {
    const pose = deriveBasilShellLighting({ energy: 0.5, gazeX: 0.8, gazeY: -0.5 })

    expect(pose).toMatchObject({
      gradientCx: 30,
      gradientCy: 27,
      highlightX: -1.92,
      highlightY: 0.9,
      rimOpacity: 0.178
    })
    expect(pose.shadowOffsetX).toBeCloseTo(1.44)
  })

  it('clamps malformed host values to the portable lighting range', () => {
    expect(deriveBasilShellLighting({ energy: 9, gazeX: -4, gazeY: 3 })).toMatchObject({
      gradientCx: 39,
      gradientCy: 21,
      highlightX: 2.4,
      highlightY: -1.8,
      shadowOffsetX: -1.8
    })
  })
})
