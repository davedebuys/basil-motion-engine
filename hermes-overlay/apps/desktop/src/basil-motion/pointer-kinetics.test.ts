import { describe, expect, it } from 'vitest'

import { createBasilPointerKineticsTracker, sampleBasilPointerKinetics } from './pointer-kinetics'

describe('Basil pointer kinetics', () => {
  it('detects a rapid inward approach but not an equally fast retreat', () => {
    const initial = sampleBasilPointerKinetics(
      createBasilPointerKineticsTracker(),
      { x: 700, y: 100 },
      { x: 100, y: 100 },
      0
    )

    const approach = sampleBasilPointerKinetics(initial.tracker, { x: 180, y: 100 }, { x: 100, y: 100 }, 100)
    const retreat = sampleBasilPointerKinetics(approach.tracker, { x: 700, y: 100 }, { x: 100, y: 100 }, 200)

    expect(approach.kinetics.approach).toBeGreaterThan(0.7)
    expect(approach.kinetics.speed).toBeGreaterThan(0.7)
    expect(retreat.kinetics.approach).toBe(0)
  })

  it('builds dwell only while the pointer remains slowly nearby', () => {
    let result = sampleBasilPointerKinetics(
      createBasilPointerKineticsTracker(),
      { x: 110, y: 100 },
      { x: 100, y: 100 },
      0
    )

    for (let time = 100; time <= 1400; time += 100) {
      result = sampleBasilPointerKinetics(result.tracker, { x: 110, y: 100 }, { x: 100, y: 100 }, time)
    }

    expect(result.kinetics.dwell).toBe(1)

    result = sampleBasilPointerKinetics(result.tracker, { x: 600, y: 100 }, { x: 100, y: 100 }, 1500)
    expect(result.kinetics.dwell).toBeLessThan(1)
  })

  it('returns bounded values after long or irregular sample gaps', () => {
    const first = sampleBasilPointerKinetics(
      createBasilPointerKineticsTracker(),
      { x: 0, y: 0 },
      { x: 100, y: 100 },
      100
    )

    const next = sampleBasilPointerKinetics(first.tracker, { x: 10000, y: 10000 }, { x: 100, y: 100 }, 10000)

    expect(next.kinetics.speed).toBe(1)
    expect(next.kinetics.approach).toBeGreaterThanOrEqual(0)
    expect(next.kinetics.approach).toBeLessThanOrEqual(1)
  })

  it('retains genuine velocity direction and reverses when the pointer reverses', () => {
    const first = sampleBasilPointerKinetics(
      createBasilPointerKineticsTracker(),
      { x: 100, y: 100 },
      { x: 0, y: 0 },
      0
    )

    const right = sampleBasilPointerKinetics(first.tracker, { x: 500, y: 100 }, { x: 0, y: 0 }, 100)
    const left = sampleBasilPointerKinetics(right.tracker, { x: 100, y: 100 }, { x: 0, y: 0 }, 200)

    expect(right.kinetics.velocityX).toBeGreaterThan(0.8)
    expect(Math.abs(right.kinetics.velocityY)).toBeLessThan(0.01)
    expect(left.kinetics.velocityX).toBeLessThan(-0.8)
  })

  it('smoothly settles retained velocity after genuine pointer movement stops', () => {
    let result = sampleBasilPointerKinetics(
      createBasilPointerKineticsTracker(),
      { x: 100, y: 100 },
      { x: 0, y: 0 },
      0
    )

    result = sampleBasilPointerKinetics(result.tracker, { x: 500, y: 100 }, { x: 0, y: 0 }, 50)
    const movingVelocity = result.kinetics.velocityX

    for (let time = 100; time <= 400; time += 50) {
      result = sampleBasilPointerKinetics(result.tracker, { x: 500, y: 100 }, { x: 0, y: 0 }, time)
    }

    expect(movingVelocity).toBeGreaterThan(0.8)
    expect(Math.abs(result.kinetics.velocityX)).toBeLessThan(0.05)
    expect(result.kinetics.speed).toBeLessThan(0.05)
  })
})
