import { describe, expect, it } from 'vitest'

import { type BasilPointerIntentInput, deriveBasilPointerIntent } from './pointer-intent-engine'

const BASE: BasilPointerIntentInput = {
  active: true,
  approach: 0,
  dwell: 0,
  objectCommitment: 0,
  pointerX: 0,
  pointerY: 0,
  proximity: 0.3,
  speed: 0,
  state: 'idle',
  velocityX: 0,
  velocityY: 0
}

describe('Basil pointer intent', () => {
  it('looks ahead of a genuinely fast moving pointer', () => {
    const pose = deriveBasilPointerIntent({
      ...BASE,
      pointerX: 0.1,
      speed: 0.9,
      velocityX: 0.9
    })

    expect(pose.mode).toBe('anticipate')
    expect(pose.lead).toBeGreaterThan(0.15)
    expect(pose.gazeX).toBeGreaterThan(0.25)
  })

  it('predicts both axes and stays bounded', () => {
    const pose = deriveBasilPointerIntent({
      ...BASE,
      pointerX: 0.95,
      pointerY: -0.9,
      speed: 1,
      velocityX: 1,
      velocityY: -1
    })

    expect(pose.gazeX).toBe(1)
    expect(pose.gazeY).toBe(-1)
  })

  it('settles directly onto a nearby dwelling pointer', () => {
    const pose = deriveBasilPointerIntent({
      ...BASE,
      dwell: 0.9,
      pointerX: -0.4,
      pointerY: 0.2,
      proximity: 1,
      speed: 0.2,
      velocityX: 0.4
    })

    expect(pose.mode).toBe('settle')
    expect(pose.lead).toBeLessThan(0.01)
    expect(pose.gazeX).toBeCloseTo(-0.4)
    expect(pose.eyeOpen).toBeLessThan(1)
  })

  it('reduces prediction while Basil is committed to object work', () => {
    const free = deriveBasilPointerIntent({
      ...BASE,
      speed: 0.9,
      velocityX: 0.9
    })

    const working = deriveBasilPointerIntent({
      ...BASE,
      objectCommitment: 1,
      speed: 0.9,
      velocityX: 0.9
    })

    expect(working.lead).toBeLessThan(free.lead * 0.5)
  })

  it('suppresses pointer intent while sleeping', () => {
    const pose = deriveBasilPointerIntent({
      ...BASE,
      pointerX: 1,
      speed: 1,
      state: 'sleeping',
      velocityX: 1
    })

    expect(pose.mode).toBe('sleep')
    expect(pose.lead).toBe(0)
    expect(pose.gazeX).toBeLessThan(0.1)
  })
})
