import { describe, expect, it } from 'vitest'

import { deriveBasilPointOfInterest } from './point-of-interest-engine'

const BASE = {
  actor: { height: 108, width: 108, x: 400, y: 300 },
  preferredTarget: 'composer' as const,
  viewport: { height: 900, width: 1440 }
}

describe('Basil point-of-interest selection', () => {
  it('selects the preferred genuine surface and derives a bounded direction', () => {
    const pose = deriveBasilPointOfInterest({
      ...BASE,
      candidates: [
        { id: 'folder', priority: 12, rect: { height: 80, width: 180, x: 20, y: 180 }, target: 'folder' },
        { id: 'composer', priority: 10, rect: { height: 90, width: 680, x: 560, y: 760 }, target: 'composer' }
      ]
    })

    expect(pose).toMatchObject({ id: 'composer', intensity: 0.86, source: 'preferred', target: 'composer' })
    expect(pose!.direction.x).toBeGreaterThan(0)
    expect(pose!.direction.y).toBeGreaterThan(0)
    expect(Math.abs(pose!.direction.x)).toBeLessThanOrEqual(1)
    expect(Math.abs(pose!.direction.y)).toBeLessThanOrEqual(1)
  })

  it('lets a visible permission or error point override ordinary focus', () => {
    const pose = deriveBasilPointOfInterest({
      ...BASE,
      candidates: [
        { id: 'composer', priority: 10, rect: { height: 90, width: 680, x: 560, y: 760 }, target: 'composer' },
        { id: 'permission', priority: 12, rect: { height: 180, width: 380, x: 40, y: 80 }, target: 'permission' }
      ]
    })

    expect(pose).toMatchObject({ id: 'permission', intensity: 1, source: 'urgent', target: 'permission' })
    expect(pose!.direction.x).toBeLessThan(0)
    expect(pose!.direction.y).toBeLessThan(0)
  })

  it('uses the composer as a restrained ambient fallback', () => {
    const pose = deriveBasilPointOfInterest({
      ...BASE,
      preferredTarget: 'rest',
      candidates: [
        { id: 'folder', priority: 11, rect: { height: 80, width: 180, x: 20, y: 180 }, target: 'folder' },
        { id: 'composer', priority: 10, rect: { height: 90, width: 680, x: 560, y: 760 }, target: 'composer' }
      ]
    })

    expect(pose).toMatchObject({ id: 'composer', intensity: 0.2, source: 'ambient' })
  })

  it('returns no interest for an empty or invalid surface set', () => {
    expect(deriveBasilPointOfInterest({ ...BASE, candidates: [] })).toBeNull()
    expect(
      deriveBasilPointOfInterest({
        ...BASE,
        candidates: [{ id: 'hidden', rect: { height: 0, width: 20, x: 10, y: 10 }, target: 'tool' }]
      })
    ).toBeNull()
  })
})
