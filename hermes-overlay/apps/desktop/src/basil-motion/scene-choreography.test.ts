import { describe, expect, it } from 'vitest'

import { BASIL_DEFAULT_PARAMETERS } from './engine'
import { applyBasilSceneChoreography } from './scene-choreography'

describe('Basil scene choreography', () => {
  it('gives reading, coding, terminal, and web scenes distinct motion profiles', () => {
    const document = applyBasilSceneChoreography(BASIL_DEFAULT_PARAMETERS, 'document')
    const editor = applyBasilSceneChoreography(BASIL_DEFAULT_PARAMETERS, 'editor')
    const terminal = applyBasilSceneChoreography(BASIL_DEFAULT_PARAMETERS, 'terminal')
    const web = applyBasilSceneChoreography(BASIL_DEFAULT_PARAMETERS, 'web')

    expect(editor.energy).toBeGreaterThan(document.energy)
    expect(terminal.particleIntensity).toBeGreaterThan(editor.particleIntensity)
    expect(web.glow).toBeGreaterThan(document.glow)
    expect(new Set([document.rotation, editor.rotation, terminal.rotation, web.rotation]).size).toBe(4)
  })

  it('adds travel energy only while approaching an object', () => {
    const approaching = applyBasilSceneChoreography(BASIL_DEFAULT_PARAMETERS, 'folder', 'approach')
    const engaged = applyBasilSceneChoreography(BASIL_DEFAULT_PARAMETERS, 'folder', 'engaged')

    expect(approaching.energy).toBeGreaterThan(engaged.energy)
    expect(approaching.particleIntensity).toBeGreaterThan(engaged.particleIntensity)
    expect(approaching.squash).toBeGreaterThan(engaged.squash)
  })

  it('uses a restrained preview pose before an object is activated', () => {
    const preview = applyBasilSceneChoreography(BASIL_DEFAULT_PARAMETERS, 'image', 'preview')
    const engaged = applyBasilSceneChoreography(BASIL_DEFAULT_PARAMETERS, 'image', 'engaged')

    expect(preview.energy).toBeGreaterThan(BASIL_DEFAULT_PARAMETERS.energy)
    expect(preview.energy).toBeLessThan(engaged.energy)
    expect(preview.accessoryVisibility).toBeLessThan(engaged.accessoryVisibility)
    expect(Math.abs(preview.rotation)).toBeLessThan(Math.abs(engaged.rotation))
  })

  it('adds working energy while traversing a large active surface', () => {
    const engaged = applyBasilSceneChoreography(BASIL_DEFAULT_PARAMETERS, 'editor', 'engaged')
    const traversing = applyBasilSceneChoreography(BASIL_DEFAULT_PARAMETERS, 'editor', 'traverse')

    expect(traversing.energy).toBeGreaterThan(engaged.energy)
    expect(traversing.glow).toBeGreaterThan(engaged.glow)
    expect(traversing.particleIntensity).toBeGreaterThan(engaged.particleIntensity)
    expect(traversing.squash).toBeGreaterThan(engaged.squash)
  })

  it('faces directional scene gaze and lean toward an object on the left', () => {
    const right = applyBasilSceneChoreography(BASIL_DEFAULT_PARAMETERS, 'terminal', 'engaged', 1)
    const left = applyBasilSceneChoreography(BASIL_DEFAULT_PARAMETERS, 'terminal', 'engaged', -1)

    expect(right.eyeX).toBeGreaterThan(0)
    expect(left.eyeX).toBeLessThan(0)
    expect(Math.sign(left.rotation)).toBe(-Math.sign(right.rotation))
  })

  it('preserves a stronger genuine agent state instead of weakening it', () => {
    const active = { ...BASIL_DEFAULT_PARAMETERS, energy: 0.9, glow: 0.8, particleIntensity: 0.7 }
    const choreographed = applyBasilSceneChoreography(active, 'document')

    expect(choreographed.energy).toBe(0.9)
    expect(choreographed.glow).toBe(0.8)
    expect(choreographed.particleIntensity).toBe(0.7)
  })
})
