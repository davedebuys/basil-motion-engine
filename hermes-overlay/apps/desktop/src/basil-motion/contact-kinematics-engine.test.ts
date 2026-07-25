import { describe, expect, it } from 'vitest'

import { deriveBasilContactKinematics } from './contact-kinematics-engine'
import type { BasilManipulationPose } from './manipulation-engine'
import { deriveBasilObjectAffordance } from './object-affordance'

const OPERATE: BasilManipulationPose = {
  contact: 1,
  contactPulse: 0.3,
  gazeLead: 0.2,
  handProgress: 1,
  operationProgress: 1,
  propResponse: 1,
  release: 0,
  stage: 'operate'
}

describe('Basil contact kinematics', () => {
  it('classifies genuine object direction on all four sides', () => {
    const bounds = { height: 300, width: 400, x: 300, y: 300 }

    const cases = [
      { actor: { x: 100, y: 450 }, expected: 'right' },
      { actor: { x: 900, y: 450 }, expected: 'left' },
      { actor: { x: 500, y: 100 }, expected: 'below' },
      { actor: { x: 500, y: 900 }, expected: 'above' }
    ] as const

    for (const { actor, expected } of cases) {
      const affordance = deriveBasilObjectAffordance('editor', bounds, { x: 500, y: 450 }, actor)

      const pose = deriveBasilContactKinematics({
        affordance,
        manipulation: OPERATE,
        target: 'editor',
        travel: 0
      })

      expect(pose.orientation).toBe(expected)
    }
  })

  it('tracks opposite contact regions with the active hand and counter-braces the second hand', () => {
    const bounds = { height: 500, width: 700, x: 200, y: 100 }
    const actor = { x: 80, y: 350 }
    const upper = deriveBasilObjectAffordance('editor', bounds, { x: 850, y: 130 }, actor)
    const lower = deriveBasilObjectAffordance('editor', bounds, { x: 850, y: 570 }, actor)
    const input = { manipulation: OPERATE, target: 'editor' as const, travel: 0 }
    const upperPose = deriveBasilContactKinematics({ ...input, affordance: upper })
    const lowerPose = deriveBasilContactKinematics({ ...input, affordance: lower })

    expect(upperPose.activeHand.y).toBeLessThan(-6)
    expect(lowerPose.activeHand.y).toBeGreaterThan(6)
    expect(upperPose.braceHand.y).toBeGreaterThan(0)
    expect(lowerPose.braceHand.y).toBeLessThan(0)
    expect(upperPose.activeGripDegrees).toBeLessThan(lowerPose.activeGripDegrees)
  })

  it('moves the complete upright prop posture above or below without rotating it sideways', () => {
    const bounds = { height: 240, width: 520, x: 200, y: 260 }
    const point = { x: 700, y: 380 }
    const above = deriveBasilObjectAffordance('document', bounds, point, { x: 450, y: 760 })
    const below = deriveBasilObjectAffordance('document', bounds, point, { x: 450, y: 40 })
    const input = { manipulation: OPERATE, target: 'document' as const, travel: 0 }
    const abovePose = deriveBasilContactKinematics({ ...input, affordance: above })
    const belowPose = deriveBasilContactKinematics({ ...input, affordance: below })

    expect(abovePose.orientation).toBe('above')
    expect(abovePose.context.y).toBeLessThan(-8)
    expect(belowPose.orientation).toBe('below')
    expect(belowPose.context.y).toBeGreaterThan(8)
    expect(Math.abs(abovePose.propTiltDegrees)).toBeLessThanOrEqual(6)
  })

  it('does not invent contact pressure before genuine handling', () => {
    const affordance = deriveBasilObjectAffordance(
      'tool',
      { height: 300, width: 500, x: 200, y: 100 },
      { x: 650, y: 250 },
      { x: 80, y: 250 }
    )

    const pose = deriveBasilContactKinematics({
      affordance,
      manipulation: { ...OPERATE, contact: 0, handProgress: 0.08, operationProgress: 0, stage: 'observe' },
      target: 'tool',
      travel: 0
    })

    expect(pose.coupling).toBeLessThan(0.1)
    expect(pose.pressure).toBe(0)
    expect(Math.abs(pose.activeHand.y)).toBeLessThan(1)
  })

  it('reaches and presses farther into a deep surface than a compact control', () => {
    const compact = deriveBasilObjectAffordance(
      'data',
      { height: 70, width: 90, x: 200, y: 100 },
      { x: 205, y: 135 },
      { x: 80, y: 135 }
    )

    const deep = deriveBasilObjectAffordance(
      'data',
      { height: 520, width: 760, x: 200, y: 100 },
      { x: 930, y: 360 },
      { x: 80, y: 360 }
    )

    const input = { manipulation: OPERATE, target: 'data' as const, travel: 0 }
    const compactPose = deriveBasilContactKinematics({ ...input, affordance: compact })
    const deepPose = deriveBasilContactKinematics({ ...input, affordance: deep })

    expect(deepPose.activeHand.x).toBeGreaterThan(compactPose.activeHand.x + 3)
    expect(deepPose.pressure).toBeGreaterThan(compactPose.pressure + 0.2)
  })
})
