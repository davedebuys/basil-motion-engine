import { describe, expect, it } from 'vitest'

import { type BasilFaceIntentInput, deriveBasilFaceIntentPose } from './face-intent-engine'

const BASE: BasilFaceIntentInput = {
  gaze: {
    brow: 'neutral',
    eyeX: 0,
    eyeY: 0,
    headTilt: 0,
    objectWeight: 0,
    pointerWeight: 0,
    source: 'ambient'
  },
  manipulation: {
    contact: 0,
    contactPulse: 0,
    gazeLead: 0,
    handProgress: 0,
    operationProgress: 0,
    propResponse: 1,
    release: 0,
    stage: 'idle'
  },
  objectX: 0,
  objectY: 0,
  pointerActive: false,
  pointerApproach: 0,
  pointerDwell: 0,
  pointerProximity: 0,
  pointerSpeed: 0,
  pointerX: 0,
  pointerY: 0,
  state: 'idle'
}

describe('Basil face intent', () => {
  it('looks toward a genuine object before the hands reach it', () => {
    const pose = deriveBasilFaceIntentPose({
      ...BASE,
      gaze: { ...BASE.gaze, eyeX: 0.1, objectWeight: 0.9, source: 'object' },
      manipulation: { ...BASE.manipulation, gazeLead: 1, handProgress: 0.12, stage: 'observe' },
      objectX: -1,
      objectY: 0.5,
      state: 'writing'
    })

    expect(pose.intent).toBe('orient')
    expect(pose.eyeX).toBeLessThan(-0.2)
    expect(pose.eyeY).toBeGreaterThan(0.1)
  })

  it('checks in with a rapidly approaching real pointer without discarding work focus', () => {
    const pose = deriveBasilFaceIntentPose({
      ...BASE,
      gaze: {
        ...BASE.gaze,
        eyeX: -0.35,
        objectWeight: 0.86,
        pointerWeight: 0.72,
        source: 'shared'
      },
      manipulation: { ...BASE.manipulation, contact: 1, gazeLead: 0.2, stage: 'operate' },
      objectX: -1,
      pointerActive: true,
      pointerApproach: 1,
      pointerProximity: 0.9,
      pointerSpeed: 0.8,
      pointerX: 1,
      state: 'writing'
    })

    expect(pose.intent).toBe('check_in')
    expect(pose.eyeX).toBeGreaterThan(0)
    expect(pose.focus).toBeGreaterThan(0.6)
  })

  it('returns attention to the user while releasing an object', () => {
    const pose = deriveBasilFaceIntentPose({
      ...BASE,
      gaze: { ...BASE.gaze, eyeX: -0.4, objectWeight: 0.7, pointerWeight: 0.55, source: 'shared' },
      manipulation: { ...BASE.manipulation, gazeLead: 0.15, release: 0.9, stage: 'release' },
      objectX: -1,
      pointerActive: true,
      pointerX: 0.8,
      pointerY: -0.2,
      state: 'writing'
    })

    expect(pose.intent).toBe('check_in')
    expect(pose.eyeX).toBeGreaterThan(0.2)
  })

  it('adds restrained facial depth in the direction of gaze', () => {
    const right = deriveBasilFaceIntentPose({
      ...BASE,
      gaze: { ...BASE.gaze, eyeX: 1, source: 'pointer' },
      pointerActive: true,
      pointerX: 1
    })

    expect(right.faceX).toBeGreaterThan(1.6)
    expect(right.eyeSpacing).toBeLessThan(1)
    expect(right.leftEyeScaleX).toBeLessThan(right.rightEyeScaleX)
  })

  it('suppresses pointer and object intent while sleeping', () => {
    const pose = deriveBasilFaceIntentPose({
      ...BASE,
      gaze: { ...BASE.gaze, eyeX: 1, eyeY: -1, objectWeight: 1, pointerWeight: 1, source: 'shared' },
      manipulation: { ...BASE.manipulation, gazeLead: 1, stage: 'operate' },
      objectX: -1,
      pointerActive: true,
      pointerApproach: 1,
      pointerSpeed: 1,
      pointerX: 1,
      state: 'sleeping'
    })

    expect(pose.intent).toBe('sleep')
    expect(Math.abs(pose.eyeX)).toBeLessThan(0.1)
    expect(pose.faceX).toBe(0)
  })
})
