import { describe, expect, it } from 'vitest'

import { applyBasilManipulationMotion, deriveBasilManipulationPose } from './manipulation-engine'
import { basilSceneMotion } from './scene-motion'

const BASE = { engagement: 'act' as const, landing: 0, motionPhase: 0, target: 'folder' as const, travel: 0 }

describe('Basil object manipulation timing', () => {
  it('looks before reaching and keeps the prop still during genuine preview', () => {
    const pose = deriveBasilManipulationPose({ ...BASE, engagement: 'notice' })

    expect(pose).toMatchObject({ gazeLead: 1, handProgress: 0.12, propResponse: 0, stage: 'observe' })
  })

  it('reaches without operating the object during travel preparation', () => {
    const pose = deriveBasilManipulationPose({ ...BASE, engagement: 'prepare', travel: 0.9 })

    expect(pose).toMatchObject({ contact: 0, handProgress: 0.64, propResponse: 0, stage: 'reach' })
  })

  it('contacts first and lets the object respond as a real landing settles', () => {
    const impact = deriveBasilManipulationPose({ ...BASE, landing: 1 })
    const settling = deriveBasilManipulationPose({ ...BASE, landing: 0.35 })

    expect(impact).toMatchObject({ contact: 1, contactPulse: 1, propResponse: 0, stage: 'contact' })
    expect(settling.propResponse).toBeGreaterThan(0.5)
    expect(settling.handProgress).toBe(1)
  })

  it('cycles gaze, reach, contact, operation, and release only while engaged', () => {
    const stages = [0.05, 0.2, 0.35, 0.6, 0.93].map(
      motionPhase => deriveBasilManipulationPose({ ...BASE, motionPhase }).stage
    )

    expect(stages).toEqual(['observe', 'reach', 'contact', 'operate', 'release'])
  })

  it('keeps work-surface traversal continuously in contact', () => {
    const pose = deriveBasilManipulationPose({ ...BASE, motionPhase: 0.6, target: 'editor', travel: 0.48 })

    expect(pose).toMatchObject({ contact: 1, handProgress: 1, propResponse: 1, stage: 'operate' })
  })

  it('gates prop motion while preserving anticipatory gaze motion', () => {
    const motion = basilSceneMotion('folder', 0.25, 0.8)

    const waiting = applyBasilManipulationMotion(
      motion,
      deriveBasilManipulationPose({ ...BASE, engagement: 'prepare', motionPhase: 0.25 })
    )

    const operating = applyBasilManipulationMotion(
      motion,
      deriveBasilManipulationPose({ ...BASE, motionPhase: 0.6, travel: 0.48 })
    )

    expect(waiting).toMatchObject({ gesture: 0, progress: 0, propLift: 0, propRotation: 0, pulse: 0 })
    expect(waiting.attentionX).toBe(motion.attentionX)
    expect(operating.gesture).toBe(motion.gesture)
    expect(operating.progress).toBeCloseTo(motion.progress * 0.6)
  })

  it('leaves non-manipulated states and props unchanged', () => {
    const motion = basilSceneMotion('rest', 0.4, 0.8)
    const pose = deriveBasilManipulationPose({ ...BASE, engagement: null, target: 'rest' })

    expect(pose.stage).toBe('idle')
    expect(applyBasilManipulationMotion(motion, pose)).toBe(motion)
  })
})
