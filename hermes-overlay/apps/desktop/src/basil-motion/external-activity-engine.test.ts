import { describe, expect, it } from 'vitest'

import { deriveBasilExternalActivityPose } from './external-activity-engine'

describe('Basil external activity engine', () => {
  it('turns a genuine editor change into bounded procedural typing motion', () => {
    const pose = deriveBasilExternalActivityPose({
      intensity: 0.8,
      kind: 'typing',
      motionPhase: 0.37,
      target: 'editor'
    })

    expect(pose.active).toBe(true)
    expect(pose.kind).toBe('typing')
    expect(pose.intensity).toBe(0.8)
    expect(pose.progress).toBeGreaterThanOrEqual(0)
    expect(pose.progress).toBeLessThan(1)
    expect(pose.gesture).toBeGreaterThan(0.3)
    expect(Math.abs(pose.propRotation)).toBeLessThanOrEqual(1.8)
  })

  it('supports text-like generic surfaces and rejects unrelated controls', () => {
    for (const target of ['data', 'document', 'editor', 'terminal'] as const) {
      expect(
        deriveBasilExternalActivityPose({
          intensity: 1,
          kind: 'typing',
          motionPhase: 0.1,
          target
        }).active
      ).toBe(true)
    }

    expect(
      deriveBasilExternalActivityPose({
        intensity: 1,
        kind: 'typing',
        motionPhase: 0.1,
        target: 'tool'
      }).active
    ).toBe(false)
  })

  it('turns a genuine structural selection into a restrained confirmation pose', () => {
    const first = deriveBasilExternalActivityPose({
      intensity: 0.7,
      kind: 'selecting',
      motionPhase: 0.1,
      target: 'folder'
    })

    const later = deriveBasilExternalActivityPose({
      intensity: 0.7,
      kind: 'selecting',
      motionPhase: 0.36,
      target: 'folder'
    })

    expect(first).toMatchObject({
      active: true,
      intensity: 0.7,
      kind: 'selecting'
    })
    expect(first.attentionY).toBeLessThan(0)
    expect(first.gesture).toBeGreaterThan(0.4)
    expect(first.propRotation).not.toBe(later.propRotation)
    expect(first.pulse).not.toBe(later.pulse)
  })

  it('supports selectable assets but rejects passive conversation and terminal surfaces', () => {
    for (const target of ['data', 'document', 'editor', 'folder', 'image', 'tool', 'web'] as const) {
      expect(
        deriveBasilExternalActivityPose({
          intensity: 1,
          kind: 'selecting',
          motionPhase: 0.2,
          target
        }).active
      ).toBe(true)
    }

    for (const target of ['conversation', 'terminal'] as const) {
      expect(
        deriveBasilExternalActivityPose({
          intensity: 1,
          kind: 'selecting',
          motionPhase: 0.2,
          target
        }).active
      ).toBe(false)
    }
  })

  it('turns a genuine control change into a rotating adjustment pose', () => {
    const first = deriveBasilExternalActivityPose({
      intensity: 0.6,
      kind: 'adjusting',
      motionPhase: 0.12,
      target: 'tool'
    })

    const later = deriveBasilExternalActivityPose({
      intensity: 0.6,
      kind: 'adjusting',
      motionPhase: 0.38,
      target: 'tool'
    })

    expect(first).toMatchObject({ active: true, intensity: 0.6, kind: 'adjusting' })
    expect(first.gesture).toBeGreaterThan(0.3)
    expect(first.propRotation).not.toBe(later.propRotation)
    expect(Math.abs(first.propRotation)).toBeLessThanOrEqual(4.2)
  })

  it('limits adjustment activity to generic tool and data controls', () => {
    for (const target of ['data', 'tool'] as const) {
      expect(
        deriveBasilExternalActivityPose({
          intensity: 1,
          kind: 'adjusting',
          motionPhase: 0.2,
          target
        }).active
      ).toBe(true)
    }

    expect(
      deriveBasilExternalActivityPose({
        intensity: 1,
        kind: 'adjusting',
        motionPhase: 0.2,
        target: 'document'
      }).active
    ).toBe(false)
  })

  it('turns a genuine control invocation into a bounded press-and-confirm pose', () => {
    const first = deriveBasilExternalActivityPose({
      intensity: 0.75,
      kind: 'invoking',
      motionPhase: 0.12,
      target: 'tool'
    })

    const later = deriveBasilExternalActivityPose({
      intensity: 0.75,
      kind: 'invoking',
      motionPhase: 0.36,
      target: 'tool'
    })

    expect(first).toMatchObject({ active: true, intensity: 0.75, kind: 'invoking' })
    expect(first.gesture).toBeGreaterThan(0.5)
    expect(first.pulse).not.toBe(later.pulse)
    expect(first.propRotation).not.toBe(later.propRotation)
  })

  it('limits invocation activity to generic tool and web controls', () => {
    for (const target of ['tool', 'web'] as const) {
      expect(
        deriveBasilExternalActivityPose({
          intensity: 1,
          kind: 'invoking',
          motionPhase: 0.2,
          target
        }).active
      ).toBe(true)
    }

    expect(
      deriveBasilExternalActivityPose({
        intensity: 1,
        kind: 'invoking',
        motionPhase: 0.2,
        target: 'document'
      }).active
    ).toBe(false)
  })

  it('turns genuine surface disappearance into a friendly farewell pose', () => {
    const first = deriveBasilExternalActivityPose({
      intensity: 1,
      kind: 'departing',
      motionPhase: 0.08,
      target: 'document'
    })

    const later = deriveBasilExternalActivityPose({
      intensity: 1,
      kind: 'departing',
      motionPhase: 0.32,
      target: 'document'
    })

    expect(first).toMatchObject({ active: true, intensity: 1, kind: 'departing' })
    expect(first.attentionY).toBeLessThan(0)
    expect(first.gesture).toBeGreaterThan(0.6)
    expect(first.propRotation).not.toBe(later.propRotation)
  })

  it('supports work-surface farewells but rejects conversation dismissal', () => {
    for (const target of ['data', 'document', 'editor', 'folder', 'image', 'terminal', 'tool', 'web'] as const) {
      expect(
        deriveBasilExternalActivityPose({
          intensity: 1,
          kind: 'departing',
          motionPhase: 0.2,
          target
        }).active
      ).toBe(true)
    }

    expect(
      deriveBasilExternalActivityPose({
        intensity: 1,
        kind: 'departing',
        motionPhase: 0.2,
        target: 'conversation'
      }).active
    ).toBe(false)
  })

  it('turns genuine native resizing into a bounded balancing pose', () => {
    const first = deriveBasilExternalActivityPose({
      intensity: 0.8,
      kind: 'resizing',
      motionPhase: 0.1,
      target: 'editor'
    })

    const later = deriveBasilExternalActivityPose({
      intensity: 0.8,
      kind: 'resizing',
      motionPhase: 0.34,
      target: 'editor'
    })

    expect(first).toMatchObject({ active: true, intensity: 0.8, kind: 'resizing' })
    expect(Math.abs(first.bodyLean)).toBeLessThanOrEqual(3.04)
    expect(first.gesture).toBeGreaterThan(0.5)
    expect(first.bodyLean).not.toBe(later.bodyLean)
    expect(first.pulse).not.toBe(later.pulse)
  })

  it('supports balancing on generic work surfaces but not conversation chrome', () => {
    for (const target of ['data', 'document', 'editor', 'folder', 'image', 'terminal', 'tool', 'web'] as const) {
      expect(
        deriveBasilExternalActivityPose({
          intensity: 1,
          kind: 'resizing',
          motionPhase: 0.2,
          target
        }).active
      ).toBe(true)
    }

    expect(
      deriveBasilExternalActivityPose({
        intensity: 1,
        kind: 'resizing',
        motionPhase: 0.2,
        target: 'conversation'
      }).active
    ).toBe(false)
  })

  it('leans against a genuine live surface translation with bounded direction', () => {
    const right = deriveBasilExternalActivityPose({
      directionX: 0.8,
      directionY: -0.2,
      intensity: 0.85,
      kind: 'surfing',
      motionPhase: 0.18,
      target: 'editor'
    })

    const left = deriveBasilExternalActivityPose({
      directionX: -0.8,
      directionY: 0.2,
      intensity: 0.85,
      kind: 'surfing',
      motionPhase: 0.18,
      target: 'editor'
    })

    expect(right).toMatchObject({
      active: true,
      directionX: 0.8,
      directionY: -0.2,
      intensity: 0.85,
      kind: 'surfing'
    })
    expect(right.bodyLean).toBeLessThan(0)
    expect(left.bodyLean).toBeGreaterThan(0)
    expect(Math.abs(right.bodyLean)).toBeLessThanOrEqual(5.355)
  })

  it('supports surface surfing on generic work targets but not conversation chrome', () => {
    for (const target of ['data', 'document', 'editor', 'folder', 'image', 'terminal', 'tool', 'web'] as const) {
      expect(
        deriveBasilExternalActivityPose({
          directionX: 1,
          intensity: 1,
          kind: 'surfing',
          motionPhase: 0.2,
          target
        }).active
      ).toBe(true)
    }

    expect(
      deriveBasilExternalActivityPose({
        directionX: 1,
        intensity: 1,
        kind: 'surfing',
        motionPhase: 0.2,
        target: 'conversation'
      }).active
    ).toBe(false)
  })

  it('turns real collection mutation into variant-aware organizing motion', () => {
    for (const variant of ['add', 'remove', 'reorder'] as const) {
      const pose = deriveBasilExternalActivityPose({
        intensity: 0.7,
        kind: 'organizing',
        motionPhase: 0.24,
        target: 'folder',
        variant
      })

      expect(pose).toMatchObject({
        active: true,
        intensity: 0.7,
        kind: 'organizing',
        variant
      })
      expect(pose.gesture).toBeGreaterThan(0.3)
    }
  })

  it('limits organizing activity to collection-like targets', () => {
    for (const target of ['data', 'document', 'folder'] as const) {
      expect(
        deriveBasilExternalActivityPose({
          intensity: 1,
          kind: 'organizing',
          motionPhase: 0.2,
          target
        }).active
      ).toBe(true)
    }

    expect(
      deriveBasilExternalActivityPose({
        intensity: 1,
        kind: 'organizing',
        motionPhase: 0.2,
        target: 'tool'
      }).active
    ).toBe(false)
  })

  it('clamps intensity and returns an inert pose without a real activity', () => {
    expect(
      deriveBasilExternalActivityPose({
        intensity: 4,
        kind: 'typing',
        motionPhase: 0.2,
        target: 'editor'
      }).intensity
    ).toBe(1)
    expect(deriveBasilExternalActivityPose(null)).toMatchObject({
      active: false,
      intensity: 0,
      kind: null
    })
  })
})
