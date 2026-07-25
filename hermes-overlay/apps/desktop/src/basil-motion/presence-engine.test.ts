import { describe, expect, it } from 'vitest'

import {
  BASIL_HIDE_DURATION_MS,
  BASIL_SUMMON_DURATION_MS,
  type BasilPresencePose,
  sampleBasilPresence
} from './presence-engine'

function expectFinitePose(pose: BasilPresencePose) {
  for (const value of Object.values(pose)) {
    if (typeof value === 'number') {
      expect(Number.isFinite(value)).toBe(true)
    }
  }
}

describe('Basil presence engine', () => {
  it('rises from the aperture, overshoots, and settles when summoned', () => {
    const start = sampleBasilPresence('summoning', 0)
    const middle = sampleBasilPresence('summoning', BASIL_SUMMON_DURATION_MS * 0.58)
    const end = sampleBasilPresence('summoning', BASIL_SUMMON_DURATION_MS)

    expect(start.opacity).toBe(0)
    expect(start.translateY).toBeGreaterThan(25)
    expect(middle.opacity).toBeGreaterThan(0.9)
    expect(middle.ringOpacity).toBeGreaterThan(0)
    expect(middle.scaleX).toBeGreaterThan(0.9)
    expect(end.opacity).toBe(1)
    expect(end.translateY).toBeCloseTo(0)
    expect(end.scaleX).toBeCloseTo(1)
    expectFinitePose(middle)
  })

  it('hops before collapsing into the aperture when hidden', () => {
    const hop = sampleBasilPresence('hiding', BASIL_HIDE_DURATION_MS * 0.2)
    const collapse = sampleBasilPresence('hiding', BASIL_HIDE_DURATION_MS * 0.82)
    const end = sampleBasilPresence('hiding', BASIL_HIDE_DURATION_MS)

    expect(hop.translateY).toBeLessThan(0)
    expect(hop.rotation).toBeGreaterThan(0)
    expect(collapse.scaleY).toBeLessThan(collapse.scaleX)
    expect(collapse.portalWidth).toBeGreaterThan(0)
    expect(end.opacity).toBe(0)
    expect(end.translateY).toBeGreaterThan(25)
    expectFinitePose(collapse)
  })

  it('uses a restrained fade when reduced motion is requested', () => {
    const pose = sampleBasilPresence('summoning', BASIL_SUMMON_DURATION_MS * 0.5, true)

    expect(pose.rotation).toBe(0)
    expect(pose.translateY).toBeGreaterThanOrEqual(0)
    expect(pose.translateY).toBeLessThanOrEqual(4)
    expect(pose.scaleX).toBeGreaterThanOrEqual(0.94)
    expectFinitePose(pose)
  })
})
