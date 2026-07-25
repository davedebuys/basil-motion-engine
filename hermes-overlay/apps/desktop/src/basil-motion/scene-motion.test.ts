import { describe, expect, it } from 'vitest'

import { basilSceneMotion } from './scene-motion'

describe('basilSceneMotion', () => {
  it('keeps non-working scenes still', () => {
    expect(basilSceneMotion('rest', 0.37, 1)).toEqual({
      attentionX: 0,
      attentionY: 0,
      gesture: 0,
      progress: 0,
      propLift: 0,
      propRotation: 0,
      pulse: 0
    })
  })

  it('gives working targets distinct deterministic actions', () => {
    const folder = basilSceneMotion('folder', 0.25, 0.8)
    const editor = basilSceneMotion('editor', 0.25, 0.8)
    const web = basilSceneMotion('web', 0.25, 0.8)
    const image = basilSceneMotion('image', 0.25, 0.8)
    const data = basilSceneMotion('data', 0.25, 0.8)

    expect(folder.gesture).not.toBe(editor.gesture)
    expect(editor.attentionX).not.toBe(web.attentionX)
    expect(image.attentionY).not.toBe(data.attentionY)
    expect(folder.progress).toBe(0.25)
  })

  it('normalizes wrapped phases and scales motion with energy', () => {
    expect(basilSceneMotion('document', 1.25, 0.8)).toEqual(basilSceneMotion('document', 0.25, 0.8))
    expect(Math.abs(basilSceneMotion('terminal', 0.1, 1).gesture)).toBeGreaterThan(
      Math.abs(basilSceneMotion('terminal', 0.1, 0).gesture)
    )
  })
})
