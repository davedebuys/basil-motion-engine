import { describe, expect, it } from 'vitest'

import { deriveBasilPointerContact } from './pointer-contact-engine'

const BASE = {
  directInteraction: 0,
  dwell: 0,
  objectCommitment: 0,
  phase: 0.2,
  pointerX: 1,
  pointerY: 0,
  proximity: 0.9,
  state: 'idle' as const
}

describe('deriveBasilPointerContact', () => {
  it('advances only from genuine proximity and dwell', () => {
    expect(deriveBasilPointerContact({ ...BASE, proximity: 0.2 }).stage).toBe('none')
    expect(deriveBasilPointerContact(BASE).stage).toBe('notice')
    expect(deriveBasilPointerContact({ ...BASE, dwell: 0.4 }).stage).toBe('reach')
    expect(deriveBasilPointerContact({ ...BASE, dwell: 0.8 }).stage).toBe('touch')
  })

  it('mirrors the hand and tracks bounded pointer height', () => {
    const left = deriveBasilPointerContact({ ...BASE, dwell: 0.5, pointerX: -4, pointerY: -3 })
    const right = deriveBasilPointerContact({ ...BASE, dwell: 0.5, pointerX: 4, pointerY: 3 })

    expect(left.side).toBe(-1)
    expect(right.side).toBe(1)
    expect(left.handY).toBe(-9)
    expect(right.handY).toBe(9)
    expect(left.reach).toBe(right.reach)
  })

  it.each(['idle', 'listening', 'success'] as const)('allows social contact in %s', state => {
    expect(deriveBasilPointerContact({ ...BASE, dwell: 0.8, state }).stage).toBe('touch')
  })

  it.each([
    'awaiting_permission',
    'error',
    'reading',
    'searching',
    'sleeping',
    'speaking',
    'thinking',
    'using_tool',
    'writing'
  ] as const)('keeps %s authoritative over pointer contact', state => {
    expect(deriveBasilPointerContact({ ...BASE, dwell: 0.8, state }).stage).toBe('none')
  })

  it('suppresses contact during committed object work or stronger direct gestures', () => {
    expect(deriveBasilPointerContact({ ...BASE, dwell: 0.8, objectCommitment: 0.7 }).stage).toBe('none')
    expect(deriveBasilPointerContact({ ...BASE, directInteraction: 0.8, dwell: 0.8 }).stage).toBe('none')
  })

  it('sanitizes malformed host values and keeps every output finite', () => {
    const pose = deriveBasilPointerContact({
      ...BASE,
      directInteraction: Number.NaN,
      dwell: Number.POSITIVE_INFINITY,
      objectCommitment: Number.NaN,
      phase: Number.NaN,
      pointerX: Number.NEGATIVE_INFINITY,
      pointerY: Number.POSITIVE_INFINITY,
      proximity: Number.NaN
    })

    expect(pose.stage).toBe('none')
    expect(
      Object.values(pose)
        .filter(value => typeof value === 'number')
        .every(Number.isFinite)
    ).toBe(true)
  })
})
