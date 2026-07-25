import { describe, expect, it } from 'vitest'

import { deriveBasilActorDragPose } from './actor-drag-engine'

describe('deriveBasilActorDragPose', () => {
  it('lifts and counterbalances a genuinely held actor without locomotion semantics', () => {
    const left = deriveBasilActorDragPose({
      directionX: -1,
      directionY: 0.2,
      hold: 1,
      release: 0,
      travel: 0.8
    })

    const right = deriveBasilActorDragPose({
      directionX: 1,
      directionY: 0.2,
      hold: 1,
      release: 0,
      travel: 0.8
    })

    expect(left.stage).toBe('held')
    expect(left.lift).toBeGreaterThan(5)
    expect(left.shadowOpacity).toBeLessThan(0.6)
    expect(left.bodyLean).toBeLessThan(0)
    expect(right.bodyLean).toBeGreaterThan(0)
    expect(right.scaleY).toBeGreaterThan(1)
  })

  it('squashes on genuine release and returns exactly to idle', () => {
    const release = deriveBasilActorDragPose({
      directionX: 0,
      directionY: 0,
      hold: 0,
      release: 1,
      travel: 0
    })

    const idle = deriveBasilActorDragPose({
      directionX: 0,
      directionY: 0,
      hold: 0,
      release: 0,
      travel: 0
    })

    expect(release.stage).toBe('release')
    expect(release.scaleX).toBeGreaterThan(1)
    expect(release.scaleY).toBeLessThan(1)
    expect(release.shadowScale).toBeGreaterThan(1)
    expect(idle).toEqual({
      active: false,
      bodyLean: 0,
      grip: 0,
      lift: 0,
      release: 0,
      scaleX: 1,
      scaleY: 1,
      shadowOpacity: 1,
      shadowScale: 1,
      stage: 'idle'
    })
  })

  it('keeps every pose finite and bounded across malformed inputs', () => {
    for (let index = -200; index <= 1200; index += 1) {
      const pose = deriveBasilActorDragPose({
        directionX: Math.sin(index),
        directionY: Math.cos(index),
        hold: index / 1000,
        release: 1 - index / 1000,
        travel: index / 500
      })

      for (const value of Object.values(pose).filter(value => typeof value === 'number')) {
        expect(Number.isFinite(value)).toBe(true)
      }

      expect(pose.grip).toBeGreaterThanOrEqual(0)
      expect(pose.grip).toBeLessThanOrEqual(1)
      expect(pose.release).toBeGreaterThanOrEqual(0)
      expect(pose.release).toBeLessThanOrEqual(1)
      expect(pose.shadowOpacity).toBeGreaterThanOrEqual(0.5)
      expect(pose.shadowScale).toBeGreaterThanOrEqual(0.78)
    }
  })
})
