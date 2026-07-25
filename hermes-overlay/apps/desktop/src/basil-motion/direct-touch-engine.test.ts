import { describe, expect, it } from 'vitest'

import { deriveBasilDirectTouchPose } from './direct-touch-engine'

describe('deriveBasilDirectTouchPose', () => {
  it('derives a bounded compact squash from a genuine boop impulse', () => {
    expect(deriveBasilDirectTouchPose({ boop: 1.8, state: 'idle' })).toEqual({
      active: true,
      cheekBoost: 0.42,
      scaleX: 1.065,
      scaleY: 0.945,
      strength: 1,
      surprise: 0.86,
      tickle: 0,
      tickleRotation: 0
    })
  })

  it('derives a signed laugh wiggle from genuine wheel input', () => {
    const pose = deriveBasilDirectTouchPose({
      boop: 0,
      state: 'idle',
      tickle: 0.8,
      tickleDirection: -1
    })

    expect(pose).toMatchObject({
      active: true,
      strength: 0.8,
      surprise: 0,
      tickle: 0.8
    })
    expect(pose.tickleRotation).toBeCloseTo(-5.6)
  })

  it.each(['idle', 'listening', 'success'] as const)('supports booping during the social %s state', state => {
    expect(deriveBasilDirectTouchPose({ boop: 0.7, state }).active).toBe(true)
  })

  it.each(['thinking', 'searching', 'reading', 'writing', 'using_tool', 'awaiting_permission', 'error', 'speaking', 'sleeping'] as const)(
    'does not interrupt the authoritative %s state',
    state => {
      expect(deriveBasilDirectTouchPose({ boop: 1, state })).toMatchObject({
        active: false,
        strength: 0,
        surprise: 0
      })
    }
  )
})
