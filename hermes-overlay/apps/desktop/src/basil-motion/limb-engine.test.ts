import { describe, expect, it } from 'vitest'

import { deriveBasilContactKinematics } from './contact-kinematics-engine'
import { deriveBasilEngagementPose } from './engagement-engine'
import { basilCarryPose, basilSceneLimbPose } from './limb-engine'
import { deriveBasilManipulationPose } from './manipulation-engine'
import { deriveBasilObjectAffordance } from './object-affordance'
import { basilSceneMotion } from './scene-motion'

describe('Basil procedural limb poses', () => {
  it('places two typing hands against an editor prop', () => {
    const pose = basilSceneLimbPose('editor', basilSceneMotion('editor', 0.25, 0.8), 1, 0)

    expect(pose?.intent).toBe('type')
    expect(pose?.primary.hand.x).toBeGreaterThan(pose?.primary.shoulder.x ?? 0)
    expect(pose?.secondary).toBeTruthy()
    expect(pose?.primary.hand.y).toBeGreaterThan(20)
  })

  it('uses a restrained partial reach for preview and no limbs at rest', () => {
    const motion = basilSceneMotion('folder', 0.2, 0.5)
    const preview = basilSceneLimbPose('folder', motion, 0.56, 0)
    const engaged = basilSceneLimbPose('folder', motion, 1, 0)

    expect(preview?.opacity).toBeLessThan(engaged?.opacity ?? 0)
    expect(preview?.primary.hand.x).toBeLessThan(engaged?.primary.hand.x ?? 0)
    expect(basilSceneLimbPose('rest', basilSceneMotion('rest'), 1, 0)).toBeNull()
  })

  it('carries a parcel from the trailing side over the shell to delivery', () => {
    const source = basilCarryPose(1, 1, 0, 0)
    const overhead = basilCarryPose(1, 0.5, 0, 0)
    const destination = basilCarryPose(1, 0, 1, 0)

    expect(source.parcel.x).toBeLessThan(-40)
    expect(overhead.parcel.y).toBeLessThan(-55)
    expect(destination.parcel.x).toBeGreaterThan(40)
    expect(source.limbs.intent).toBe('carry')
    expect(destination.limbs.intent).toBe('deliver')
  })

  it('mirrors carried-work geometry for a left-side destination', () => {
    const right = basilCarryPose(1, 0.8, 0, 0.2)
    const left = basilCarryPose(-1, 0.8, 0, 0.2)

    expect(left.parcel.x).toBeCloseTo(-right.parcel.x)
    expect(left.limbs.primary.shoulder.x).toBeCloseTo(-right.limbs.primary.shoulder.x)
    expect(left.parcel.y).toBeCloseTo(right.parcel.y)
  })

  it('carries a heavy asset lower with a larger parcel than a light asset', () => {
    const light = basilCarryPose(1, 0.5, 0, 0.2, 0.2, 0.8)
    const heavy = basilCarryPose(1, 0.5, 0, 0.2, 0.8, 4)

    expect(heavy.parcel.y).toBeGreaterThan(light.parcel.y + 10)
    expect(heavy.parcel.scale).toBeGreaterThan(light.parcel.scale)
    expect(heavy.limbs.primary.hand.y).toBeGreaterThan(light.limbs.primary.hand.y)
  })

  it('aims a working hand deeper and lower for a far lower surface contact', () => {
    const motion = basilSceneMotion('editor', 0.25, 0.8)
    const bounds = { height: 300, width: 600, x: 200, y: 100 }
    const actor = { x: 100, y: 250 }
    const nearTop = deriveBasilObjectAffordance('editor', bounds, { x: 210, y: 110 }, actor)
    const farBottom = deriveBasilObjectAffordance('editor', bounds, { x: 790, y: 390 }, actor)
    const nearPose = basilSceneLimbPose('editor', motion, 1, 0, nearTop)!
    const farPose = basilSceneLimbPose('editor', motion, 1, 0, farBottom)!

    expect(farPose.primary.hand.x).toBeGreaterThan(nearPose.primary.hand.x)
    expect(farPose.primary.hand.y).toBeGreaterThan(nearPose.primary.hand.y)
  })

  it('uses exact contact kinematics to move the active hand and counter-brace the second hand', () => {
    const motion = basilSceneMotion('editor', 0.6, 0.8)
    const bounds = { height: 500, width: 700, x: 200, y: 100 }
    const actor = { x: 80, y: 350 }
    const upper = deriveBasilObjectAffordance('editor', bounds, { x: 850, y: 130 }, actor)
    const lower = deriveBasilObjectAffordance('editor', bounds, { x: 850, y: 570 }, actor)

    const manipulation = deriveBasilManipulationPose({
      engagement: 'act',
      landing: 0,
      motionPhase: 0.6,
      target: 'editor',
      travel: 0
    })

    const upperKinematics = deriveBasilContactKinematics({
      affordance: upper,
      manipulation,
      target: 'editor',
      travel: 0
    })

    const lowerKinematics = deriveBasilContactKinematics({
      affordance: lower,
      manipulation,
      target: 'editor',
      travel: 0
    })

    const upperPose = basilSceneLimbPose('editor', motion, 1, 0, upper, null, manipulation, upperKinematics)!
    const lowerPose = basilSceneLimbPose('editor', motion, 1, 0, lower, null, manipulation, lowerKinematics)!

    expect(lowerPose.primary.hand.y).toBeGreaterThan(upperPose.primary.hand.y + 12)
    expect(lowerPose.secondary!.hand.y).toBeLessThan(upperPose.secondary!.hand.y)
    expect(lowerPose.primary.gripDegrees).toBeGreaterThan(upperPose.primary.gripDegrees)
  })

  it('moves from a one-hand considering pose through reach to two-hand work', () => {
    const motion = basilSceneMotion('editor', 0.25, 0.8)

    const notice = basilSceneLimbPose('editor', motion, 0.56, 0, null, deriveBasilEngagementPose('editor', 'preview'))!

    const prepare = basilSceneLimbPose('editor', motion, 1, 0.8, null, deriveBasilEngagementPose('editor', 'approach'))!

    const act = basilSceneLimbPose('editor', motion, 1, 0, null, deriveBasilEngagementPose('editor', 'engaged'))!

    expect(notice).toMatchObject({ intent: 'consider' })
    expect(notice.secondary).toBeUndefined()
    expect(prepare).toMatchObject({ intent: 'reach' })
    expect(prepare.secondary).toBeTruthy()
    expect(act).toMatchObject({ intent: 'type' })
    expect(act.primary.hand.x).toBeGreaterThan(prepare.primary.hand.x)
  })

  it('synchronizes reach and release with the manipulation cycle', () => {
    const motion = basilSceneMotion('folder', 0.2, 0.6)
    const engagement = deriveBasilEngagementPose('folder', 'engaged')

    const reaching = deriveBasilManipulationPose({
      engagement: 'act',
      landing: 0,
      motionPhase: 0.2,
      target: 'folder',
      travel: 0
    })

    const releasing = deriveBasilManipulationPose({
      engagement: 'act',
      landing: 0,
      motionPhase: 0.93,
      target: 'folder',
      travel: 0
    })

    const operating = deriveBasilManipulationPose({
      engagement: 'act',
      landing: 0,
      motionPhase: 0.6,
      target: 'folder',
      travel: 0
    })

    const reachPose = basilSceneLimbPose('folder', motion, 1, 0, null, engagement, reaching)!
    const releasePose = basilSceneLimbPose('folder', motion, 1, 0, null, engagement, releasing)!
    const operatePose = basilSceneLimbPose('folder', motion, 1, 0, null, engagement, operating)!

    expect(reachPose.intent).toBe('reach')
    expect(releasePose.intent).toBe('release')
    expect(reachPose.primary.hand.x).toBeLessThan(operatePose.primary.hand.x)
    expect(releasePose.primary.hand.x).toBeLessThan(operatePose.primary.hand.x)
  })
})
