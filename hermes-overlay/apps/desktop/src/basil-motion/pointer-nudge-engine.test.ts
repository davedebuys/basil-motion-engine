import { describe, expect, it } from 'vitest'

import { planBasilPointerNudge } from './pointer-nudge-engine'

const actor = { height: 108, width: 108 }
const viewport = { height: 720, width: 1100 }

describe('Basil pointer nudge engine', () => {
  it('moves a resting Basil in the direction of a deliberate swipe', () => {
    const plan = planBasilPointerNudge({
      actor,
      phase: 'engaged',
      position: { x: 420, y: 300 },
      state: 'idle',
      strength: 0.9,
      swipe: { x: 1, y: 0.08 },
      target: 'rest',
      viewport
    })

    expect(plan.accepted).toBe(true)
    expect(plan.reason).toBe('nudged')
    expect(plan.destination.x).toBeGreaterThan(580)
    expect(plan.direction.x).toBeGreaterThan(0.99)
    expect(plan.distance).toBeGreaterThan(160)
  })

  it('allows an idle Basil to leave a stale completed work target', () => {
    const plan = planBasilPointerNudge({
      actor,
      phase: 'engaged',
      position: { x: 420, y: 300 },
      state: 'idle',
      strength: 0.8,
      swipe: { x: -1, y: 0 },
      target: 'document',
      viewport
    })

    expect(plan.accepted).toBe(true)
    expect(plan.destination.x).toBeLessThan(300)
  })

  it('slides along an edge when the swipe direction has no safe room', () => {
    const plan = planBasilPointerNudge({
      actor,
      phase: 'engaged',
      position: { x: 984, y: 260 },
      state: 'idle',
      strength: 1,
      swipe: { x: 1, y: 0 },
      target: 'rest',
      viewport
    })

    expect(plan.accepted).toBe(true)
    expect(plan.reason).toBe('edge-slide')
    expect(plan.destination.x).toBe(984)
    expect(plan.destination.y).toBeGreaterThan(420)
    expect(plan.destination.y + actor.height).toBeLessThanOrEqual(viewport.height - 8)
  })

  it('protects active work, previews, permission, errors, and sleep from displacement', () => {
    const base = {
      actor,
      phase: 'engaged' as const,
      position: { x: 420, y: 300 },
      strength: 1,
      swipe: { x: 1, y: 0 },
      viewport
    }

    expect(planBasilPointerNudge({ ...base, state: 'writing', target: 'editor' }).reason).toBe('protected')
    expect(planBasilPointerNudge({ ...base, phase: 'preview', state: 'idle', target: 'rest' }).reason).toBe(
      'protected'
    )
    expect(planBasilPointerNudge({ ...base, state: 'awaiting_permission', target: 'permission' }).reason).toBe(
      'protected'
    )
    expect(planBasilPointerNudge({ ...base, state: 'error', target: 'error' }).reason).toBe('protected')
    expect(planBasilPointerNudge({ ...base, state: 'sleeping', target: 'rest' }).reason).toBe('protected')
  })

  it('rejects incidental weak pointer movement', () => {
    const plan = planBasilPointerNudge({
      actor,
      phase: 'engaged',
      position: { x: 420, y: 300 },
      state: 'idle',
      strength: 0.2,
      swipe: { x: 1, y: 0 },
      target: 'rest',
      viewport
    })

    expect(plan).toEqual({
      accepted: false,
      destination: { x: 420, y: 300 },
      direction: { x: 0, y: 0 },
      distance: 0,
      reason: 'weak'
    })
  })
})
