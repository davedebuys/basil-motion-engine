import type { BasilHandoffPayloadKind } from './handoff-engine'
import type { BasilManipulationPose } from './manipulation-engine'
import type { BasilObjectAffordance } from './object-affordance'
import type { BasilSceneTarget } from './types'

export type BasilAssetWeight = 'heavy' | 'light' | 'medium'

export interface BasilAssetPhysicsInput {
  affordance?: BasilObjectAffordance | null
  delivery: number
  focusSide: number
  manipulation: BasilManipulationPose
  payloadKind?: BasilHandoffPayloadKind | null
  target: BasilSceneTarget
  travel: number
}

export interface BasilAssetPhysicsPose {
  bodyDrop: number
  bodyLean: number
  carrySag: number
  effort: number
  handSag: number
  load: number
  scaleX: number
  scaleY: number
  shadowScaleX: number
  weight: BasilAssetWeight
}

const TARGET_LOAD: Record<BasilSceneTarget, number> = {
  composer: 0.16,
  conversation: 0.1,
  data: 0.72,
  document: 0.3,
  editor: 0.46,
  error: 0.2,
  folder: 0.4,
  image: 0.36,
  permission: 0.54,
  rest: 0.06,
  terminal: 0.6,
  tool: 0.66,
  web: 0.22
}

const PAYLOAD_LOAD: Record<BasilHandoffPayloadKind, number> = {
  code: 0.5,
  data: 0.76,
  document: 0.3,
  folder: 0.42,
  image: 0.36,
  message: 0.16,
  tool: 0.68,
  web: 0.22
}

function clamp(value: number, minimum = 0, maximum = 1): number {
  return Math.min(Math.max(value, minimum), maximum)
}

function assetWeight(load: number): BasilAssetWeight {
  return load >= 0.64 ? 'heavy' : load >= 0.34 ? 'medium' : 'light'
}

export function basilAssetLoadForPayload(kind: BasilHandoffPayloadKind): number {
  return PAYLOAD_LOAD[kind]
}

export function deriveBasilAssetPhysics(input: BasilAssetPhysicsInput): BasilAssetPhysicsPose {
  const travel = clamp(input.travel)
  const delivery = clamp(input.delivery)
  const activeAffordance = input.affordance?.target === input.target ? input.affordance : null
  const baseLoad = input.payloadKind ? PAYLOAD_LOAD[input.payloadKind] : TARGET_LOAD[input.target]
  const geometryScale = activeAffordance ? (activeAffordance.scale - 0.5) * 0.22 : 0

  const shapeLoad =
    activeAffordance?.shape === 'wide' || activeAffordance?.shape === 'surface'
      ? 0.07
      : activeAffordance?.shape === 'tall'
        ? 0.04
        : 0

  const depthLoad = activeAffordance ? activeAffordance.depth * 0.045 : 0
  const load = clamp(baseLoad + geometryScale + shapeLoad + depthLoad, 0.06, 0.92)

  const contactWork =
    input.manipulation.contact * 0.52 +
    input.manipulation.operationProgress * 0.32 +
    input.manipulation.handProgress * 0.16

  const handling = input.payloadKind ? clamp(travel * 0.72 + delivery * 0.5) : clamp(contactWork)
  const effort = clamp(load * handling * (1 - travel * 0.12))
  const side = input.focusSide < 0 ? -1 : 1

  return {
    bodyDrop: effort * 1.8,
    bodyLean: -side * effort * 3.4,
    carrySag: input.payloadKind ? load * (2.2 + travel * 2.8) : 0,
    effort,
    handSag: effort * 3.2,
    load,
    scaleX: 1 + effort * 0.035,
    scaleY: 1 - effort * 0.045,
    shadowScaleX: 1 + effort * 0.18,
    weight: assetWeight(load)
  }
}
