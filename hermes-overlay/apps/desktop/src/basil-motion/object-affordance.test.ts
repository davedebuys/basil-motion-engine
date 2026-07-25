import { describe, expect, it } from 'vitest'

import { deriveBasilObjectAffordance } from './object-affordance'

describe('Basil object affordance geometry', () => {
  it('recognizes a wide surface and preserves the genuine contact point', () => {
    const result = deriveBasilObjectAffordance(
      'editor',
      { height: 180, width: 640, x: 200, y: 100 },
      { x: 264, y: 136 },
      { x: 100, y: 190 }
    )

    expect(result.shape).toBe('wide')
    expect(result.contact.x).toBeCloseTo(-0.8)
    expect(result.contact.y).toBeCloseTo(-0.6)
    expect(result.direction.x).toBeGreaterThan(0)
  })

  it('recognizes compact and tall controls from bounds alone', () => {
    expect(
      deriveBasilObjectAffordance(
        'tool',
        { height: 50, width: 140, x: 0, y: 0 },
        { x: 70, y: 25 },
        { x: -100, y: 25 }
      ).shape
    ).toBe('compact')
    expect(
      deriveBasilObjectAffordance(
        'document',
        { height: 700, width: 220, x: 0, y: 0 },
        { x: 110, y: 350 },
        { x: -100, y: 350 }
      ).shape
    ).toBe('tall')
  })

  it('measures near-to-far depth from the actor-facing object edge', () => {
    const bounds = { height: 300, width: 600, x: 200, y: 100 }
    const actor = { x: 100, y: 250 }
    const near = deriveBasilObjectAffordance('web', bounds, { x: 210, y: 250 }, actor)
    const far = deriveBasilObjectAffordance('web', bounds, { x: 780, y: 250 }, actor)

    expect(near.depth).toBeLessThan(0.05)
    expect(far.depth).toBeGreaterThan(0.95)
  })

  it('clamps pointer coordinates outside stale bounds', () => {
    const result = deriveBasilObjectAffordance(
      'image',
      { height: 100, width: 100, x: 50, y: 50 },
      { x: 500, y: -200 },
      { x: 0, y: 100 }
    )

    expect(result.contact).toEqual({ x: 1, y: -1 })
    expect(result.depth).toBeGreaterThanOrEqual(0)
    expect(result.depth).toBeLessThanOrEqual(1)
  })
})
