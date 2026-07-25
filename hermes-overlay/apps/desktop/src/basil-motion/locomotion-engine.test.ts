import { describe, expect, it } from 'vitest'

import { deriveBasilLocomotionPose } from './locomotion-engine'

const BASE = { acceleration: 0, directionX: 1, directionY: 0, landing: 0, phase: 1 / 12, travel: 0 }

describe('Basil procedural locomotion', () => {
  it('stays grounded without genuine travel', () => {
    expect(deriveBasilLocomotionPose(BASE)).toMatchObject({ lift: 0, mode: 'grounded', scaleX: 1, scaleY: 1 })
  })

  it('rolls across horizontal travel with shell motion and a separated shadow', () => {
    const pose = deriveBasilLocomotionPose({ ...BASE, travel: 0.9 })

    expect(pose.mode).toBe('roll')
    expect(pose.lift).toBeLessThan(0)
    expect(pose.shellRotation).toBeGreaterThan(0)
    expect(pose.shadowOpacity).toBeLessThan(0.72)
  })

  it('hops on a predominantly vertical path', () => {
    const pose = deriveBasilLocomotionPose({ ...BASE, directionX: 0.1, directionY: -1, travel: 0.8 })

    expect(pose.mode).toBe('hop')
    expect(pose.lift).toBeLessThan(-5)
    expect(pose.shadowScaleY).toBeLessThan(0.8)
  })

  it('leans against genuine deceleration before arrival', () => {
    const pose = deriveBasilLocomotionPose({ ...BASE, acceleration: -0.8, travel: 0.45 })

    expect(pose.mode).toBe('brake')
    expect(pose.bodyRotation).toBeLessThan(-5)
    expect(pose.shadowScaleX).toBeGreaterThan(1.1)
  })

  it('prioritizes landing compression over travel and mirrors impact lean', () => {
    const right = deriveBasilLocomotionPose({ ...BASE, landing: 1, travel: 0.2 })
    const left = deriveBasilLocomotionPose({ ...BASE, directionX: -1, landing: 1, travel: 0.2 })

    expect(right).toMatchObject({ lift: 2.8, mode: 'land', scaleX: 1.1, scaleY: 0.88 })
    expect(left.bodyRotation).toBeCloseTo(-right.bodyRotation)
  })
})
