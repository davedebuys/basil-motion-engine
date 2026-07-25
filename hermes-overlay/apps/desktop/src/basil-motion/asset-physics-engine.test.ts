import { describe, expect, it } from 'vitest'

import { deriveBasilAssetPhysics } from './asset-physics-engine'
import { deriveBasilObjectAffordance } from './object-affordance'

const OPERATE = {
  contact: 1,
  contactPulse: 0,
  gazeLead: 0.2,
  handProgress: 1,
  operationProgress: 0.8,
  propResponse: 1,
  release: 0,
  stage: 'operate' as const
}

describe('Basil asset physics', () => {
  it('treats data and tools as heavier than links and messages', () => {
    const web = deriveBasilAssetPhysics({
      delivery: 0,
      focusSide: 1,
      manipulation: OPERATE,
      target: 'web',
      travel: 0
    })

    const data = deriveBasilAssetPhysics({
      delivery: 0,
      focusSide: 1,
      manipulation: OPERATE,
      target: 'data',
      travel: 0
    })

    expect(web.weight).toBe('light')
    expect(data.weight).toBe('heavy')
    expect(data.effort).toBeGreaterThan(web.effort * 2)
    expect(data.handSag).toBeGreaterThan(web.handSag)
  })

  it('uses genuine scale, shape, and depth without retaining object content', () => {
    const nearCompact = deriveBasilObjectAffordance(
      'editor',
      { height: 70, width: 100, x: 100, y: 100 },
      { x: 105, y: 130 },
      { x: 0, y: 130 }
    )

    const deepSurface = deriveBasilObjectAffordance(
      'editor',
      { height: 500, width: 700, x: 100, y: 100 },
      { x: 780, y: 350 },
      { x: 0, y: 350 }
    )

    const compact = deriveBasilAssetPhysics({
      affordance: nearCompact,
      delivery: 0,
      focusSide: 1,
      manipulation: OPERATE,
      target: 'editor',
      travel: 0
    })

    const surface = deriveBasilAssetPhysics({
      affordance: deepSurface,
      delivery: 0,
      focusSide: 1,
      manipulation: OPERATE,
      target: 'editor',
      travel: 0
    })

    expect(surface.load).toBeGreaterThan(compact.load + 0.15)
    expect(surface.bodyDrop).toBeGreaterThan(compact.bodyDrop)
    expect(surface.shadowScaleX).toBeGreaterThan(compact.shadowScaleX)
  })

  it('does not strain before genuine handling begins', () => {
    const pose = deriveBasilAssetPhysics({
      delivery: 0,
      focusSide: -1,
      manipulation: { ...OPERATE, contact: 0, handProgress: 0, operationProgress: 0, stage: 'observe' },
      target: 'tool',
      travel: 0
    })

    expect(pose.load).toBeGreaterThan(0.6)
    expect(pose.effort).toBe(0)
    expect(pose.bodyLean).toBe(0)
  })

  it('lowers heavy carried assets and leans away from their destination side', () => {
    const pose = deriveBasilAssetPhysics({
      delivery: 0.2,
      focusSide: 1,
      manipulation: OPERATE,
      payloadKind: 'data',
      target: 'terminal',
      travel: 0.8
    })

    expect(pose.weight).toBe('heavy')
    expect(pose.carrySag).toBeGreaterThan(3)
    expect(pose.bodyLean).toBeLessThan(0)
    expect(pose.scaleY).toBeLessThan(1)
  })
})
