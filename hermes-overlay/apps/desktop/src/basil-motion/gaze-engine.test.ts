import { describe, expect, it } from 'vitest'

import { deriveBasilGazePose } from './gaze-engine'

const BASE = {
  ambientX: 0,
  ambientY: 0,
  engagement: null,
  motionPhase: 0,
  objectIntensity: 0,
  objectX: 0,
  objectY: 0,
  pointerActive: false,
  pointerApproach: 0,
  pointerDwell: 0,
  pointerProximity: 0,
  pointerX: 0,
  pointerY: 0,
  state: 'idle' as const
}

describe('Basil gaze arbitration', () => {
  it('follows a genuine pointer even when it is far from the actor', () => {
    const pose = deriveBasilGazePose({ ...BASE, pointerActive: true, pointerX: 1, pointerY: -0.5 })

    expect(pose.source).toBe('pointer')
    expect(pose.eyeX).toBeGreaterThan(0.65)
    expect(pose.eyeY).toBeLessThan(-0.3)
  })

  it('looks at a noticed object instead of an unrelated distant pointer', () => {
    const pose = deriveBasilGazePose({
      ...BASE,
      engagement: 'notice',
      objectIntensity: 1,
      objectX: -1,
      pointerActive: true,
      pointerX: 1
    })

    expect(pose.source).toBe('object')
    expect(pose.eyeX).toBeLessThan(0)
    expect(pose.objectWeight).toBeGreaterThan(pose.pointerWeight)
  })

  it('keeps pointer-follow direction clear against a weak ambient point', () => {
    const pose = deriveBasilGazePose({
      ...BASE,
      engagement: 'notice',
      objectIntensity: 0.2,
      objectX: 1,
      pointerActive: true,
      pointerX: -0.4
    })

    expect(pose.source).toBe('pointer')
    expect(pose.eyeX).toBeLessThan(0)
  })

  it('shares attention when the pointer moves close during real object work', () => {
    const pose = deriveBasilGazePose({
      ...BASE,
      engagement: 'act',
      objectIntensity: 1,
      objectX: -1,
      pointerActive: true,
      pointerProximity: 1,
      pointerX: 1,
      state: 'writing'
    })

    expect(pose.source).toBe('shared')
    expect(pose.brow).toBe('focused')
    expect(Math.abs(pose.eyeX)).toBeLessThan(0.1)
  })

  it('uses social eye contact and a curious brow for permission', () => {
    const pose = deriveBasilGazePose({
      ...BASE,
      engagement: 'act',
      objectIntensity: 1,
      objectX: -0.4,
      pointerActive: true,
      pointerX: 0.8,
      state: 'awaiting_permission'
    })

    expect(pose.source).toBe('shared')
    expect(pose.brow).toBe('curious')
    expect(pose.pointerWeight).toBeGreaterThan(0.7)
  })

  it('ignores pointer and object noise while sleeping', () => {
    const pose = deriveBasilGazePose({
      ...BASE,
      ambientY: 0.3,
      engagement: 'act',
      objectIntensity: 1,
      objectX: -1,
      pointerActive: true,
      pointerProximity: 1,
      pointerX: 1,
      state: 'sleeping'
    })

    expect(pose.source).toBe('ambient')
    expect(pose.brow).toBe('soft')
    expect(pose.eyeY).toBeGreaterThan(0.25)
  })

  it('shows concern during a real error state', () => {
    const pose = deriveBasilGazePose({ ...BASE, pointerActive: true, pointerX: -1, state: 'error' })

    expect(pose.source).toBe('pointer')
    expect(pose.brow).toBe('concerned')
    expect(pose.eyeX).toBeLessThan(-0.7)
  })
})
