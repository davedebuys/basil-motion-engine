import { describe, expect, it } from 'vitest'

import { deriveBasilPointerDeparture, deriveBasilPointerReturn } from './pointer-departure-engine'

describe('deriveBasilPointerDeparture', () => {
  it('normalizes a genuine exit direction into a bounded glance', () => {
    const pose = deriveBasilPointerDeparture({
      directionX: 8,
      directionY: -6,
      state: 'idle',
      strength: 0.8
    })

    expect(pose.active).toBe(true)
    expect(pose.eyeX).toBeCloseTo(0.64)
    expect(pose.eyeY).toBeCloseTo(-0.48)
    expect(pose.angle).toBeCloseTo(-36.87, 1)
  })

  it('clamps malformed strength and returns exactly inactive without direction', () => {
    const clamped = deriveBasilPointerDeparture({
      directionX: -1,
      directionY: 0,
      state: 'thinking',
      strength: 8
    })

    const inactive = deriveBasilPointerDeparture({
      directionX: 0,
      directionY: 0,
      state: 'idle',
      strength: 1
    })

    expect(clamped.strength).toBe(1)
    expect(clamped.eyeX).toBe(-1)
    expect(inactive).toEqual({
      active: false,
      angle: 0,
      eyeX: 0,
      eyeY: 0,
      strength: 1
    })
  })

  it.each(['awaiting_permission', 'error', 'sleeping', 'speaking'] as const)(
    'preserves the authoritative %s face',
    state => {
      expect(
        deriveBasilPointerDeparture({
          directionX: 1,
          directionY: 0,
          state,
          strength: 1
        })
      ).toMatchObject({ active: false, eyeX: 0, eyeY: 0, strength: 0 })
    }
  )

  it('derives a side-aware welcome pose from genuine pointer re-entry', () => {
    const pose = deriveBasilPointerReturn({
      directionX: -4,
      directionY: 3,
      state: 'idle',
      strength: 0.75
    })

    expect(pose).toMatchObject({ active: true, side: 1, strength: 0.75, waveRotation: 21.5 })
    expect(pose.eyeX).toBeCloseTo(-0.18)
    expect(pose.eyeY).toBeCloseTo(0.081)
  })

  it.each(['thinking', 'searching', 'reading', 'writing', 'using_tool', 'awaiting_permission', 'error', 'speaking', 'sleeping'] as const)(
    'does not interrupt the authoritative %s state on re-entry',
    state => {
      expect(
        deriveBasilPointerReturn({
          directionX: 1,
          directionY: 0,
          state,
          strength: 1
        })
      ).toMatchObject({ active: false, eyeX: 0, eyeY: 0, strength: 0 })
    }
  )
})
