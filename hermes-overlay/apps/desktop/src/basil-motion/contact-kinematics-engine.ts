import type { BasilManipulationPose } from './manipulation-engine'
import type { BasilObjectAffordance } from './object-affordance'
import type { BasilSceneTarget } from './types'

export type BasilContactOrientation = 'above' | 'below' | 'left' | 'none' | 'right'

export interface BasilContactKinematicsInput {
  affordance: BasilObjectAffordance | null
  manipulation: BasilManipulationPose
  target: BasilSceneTarget
  travel: number
}

export interface BasilContactKinematicsPose {
  activeHand: { x: number; y: number }
  activeGripDegrees: number
  axis: number
  bodyLean: number
  bodyLift: number
  braceHand: { x: number; y: number }
  braceGripDegrees: number
  context: { x: number; y: number }
  coupling: number
  orientation: BasilContactOrientation
  pressure: number
  propTiltDegrees: number
}

const BRACED_TARGETS = new Set<BasilSceneTarget>([
  'data',
  'document',
  'editor',
  'folder',
  'image',
  'terminal',
  'tool'
])

function clamp(value: number, minimum = 0, maximum = 1): number {
  return Math.min(Math.max(value, minimum), maximum)
}

function orientationFor(affordance: BasilObjectAffordance): BasilContactOrientation {
  const { x, y } = affordance.direction

  if (Math.abs(x) >= Math.abs(y)) {
    return x < 0 ? 'left' : 'right'
  }

  return y < 0 ? 'above' : 'below'
}

function shapeDemand(affordance: BasilObjectAffordance): number {
  if (affordance.shape === 'surface') {
    return 1
  }

  if (affordance.shape === 'wide') {
    return 0.84
  }

  if (affordance.shape === 'tall') {
    return 0.68
  }

  return 0.34
}

export function deriveBasilContactKinematics(
  input: BasilContactKinematicsInput
): BasilContactKinematicsPose {
  const affordance = input.affordance?.target === input.target ? input.affordance : null

  if (!affordance || input.manipulation.stage === 'idle') {
    return {
      activeGripDegrees: 0,
      activeHand: { x: 0, y: 0 },
      axis: 0,
      bodyLean: 0,
      bodyLift: 0,
      braceGripDegrees: 0,
      braceHand: { x: 0, y: 0 },
      context: { x: 0, y: 0 },
      coupling: 0,
      orientation: 'none',
      pressure: 0,
      propTiltDegrees: 0
    }
  }

  const orientation = orientationFor(affordance)
  const verticalObject = orientation === 'above' || orientation === 'below'

  const directionSign = verticalObject
    ? orientation === 'above'
      ? -1
      : 1
    : orientation === 'left'
      ? -1
      : 1

  const axis = clamp(verticalObject ? affordance.contact.x : affordance.contact.y, -1, 1)
  const demand = shapeDemand(affordance)

  const handling = Math.max(
    input.manipulation.handProgress,
    input.manipulation.contact,
    input.manipulation.operationProgress
  )

  const releaseDamping = 1 - clamp(input.manipulation.release) * 0.72
  const travelDamping = 1 - clamp(input.travel) * 0.34
  const coupling = clamp(handling * releaseDamping * travelDamping)
  const depth = clamp(affordance.depth)
  const scale = clamp(affordance.scale)
  const forwardReach = (1.4 + depth * 4.8 + scale * 1.7 + demand * 1.2) * coupling
  const axisReach = axis * (3.2 + demand * 5.8) * coupling
  const braced = BRACED_TARGETS.has(input.target) ? 1 : 0.28

  const activeHand = verticalObject
    ? { x: axisReach * 0.82, y: directionSign * forwardReach }
    : { x: forwardReach, y: axisReach }

  const braceHand = verticalObject
    ? {
        x: -axisReach * (0.28 + demand * 0.16) * braced,
        y: directionSign * forwardReach * 0.34 * braced
      }
    : {
        x: forwardReach * 0.28 * braced,
        y: -axisReach * (0.3 + demand * 0.2) * braced
      }

  const contactPressure = Math.max(input.manipulation.contact, input.manipulation.operationProgress * 0.86)
  const pressure = clamp(contactPressure * (0.38 + depth * 0.42 + demand * 0.2) * releaseDamping)

  return {
    activeGripDegrees: axis * (8 + demand * 8) + (verticalObject ? directionSign * 5 : 0),
    activeHand,
    axis,
    bodyLean: verticalObject
      ? directionSign * axis * (1.1 + demand * 1.2) * coupling
      : directionSign * axis * (1.2 + demand * 1.5) * coupling,
    bodyLift: verticalObject
      ? directionSign * (1.4 + demand * 1.8) * coupling
      : axis * (0.4 + demand * 0.65) * coupling,
    braceGripDegrees: -axis * (5 + demand * 6),
    braceHand,
    context: verticalObject
      ? {
          x: axis * (1.4 + demand * 2.6) * coupling,
          y: directionSign * (5 + demand * 8) * coupling
        }
      : {
          x: 0,
          y: affordance.direction.y * (2 + demand * 5) * coupling
        },
    coupling,
    orientation,
    pressure,
    propTiltDegrees: clamp(axis * 4 + affordance.direction.y * 2.4, -6, 6) * coupling
  }
}
