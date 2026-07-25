import type { BasilContactKinematicsPose } from './contact-kinematics-engine'
import type { BasilEngagementPose } from './engagement-engine'
import type { BasilManipulationPose } from './manipulation-engine'
import type { BasilObjectAffordance } from './object-affordance'
import type { BasilSceneMotion } from './scene-motion'
import type { BasilSceneTarget } from './types'

export interface BasilLimbPoint {
  x: number
  y: number
}

export type BasilLimbIntent =
  | 'carry'
  | 'consider'
  | 'deliver'
  | 'hold'
  | 'inspect'
  | 'operate'
  | 'point'
  | 'reach'
  | 'release'
  | 'type'

export interface BasilLimb {
  elbow: BasilLimbPoint
  gripDegrees: number
  hand: BasilLimbPoint
  shoulder: BasilLimbPoint
}

export interface BasilLimbPose {
  intent: BasilLimbIntent
  opacity: number
  primary: BasilLimb
  secondary?: BasilLimb
}

export interface BasilCarryPose {
  limbs: BasilLimbPose
  parcel: BasilLimbPoint & { scale: number }
}

interface SceneContact {
  intent: BasilLimbIntent
  primary: BasilLimbPoint
  primaryGrip: number
  secondary?: BasilLimbPoint
  secondaryGrip?: number
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value))
}

function mix(from: number, to: number, amount: number): number {
  return from + (to - from) * amount
}

function limb(shoulder: BasilLimbPoint, hand: BasilLimbPoint, gripDegrees: number, bend: number): BasilLimb {
  return {
    elbow: {
      x: (shoulder.x + hand.x) / 2 + bend,
      y: (shoulder.y + hand.y) / 2 - Math.abs(bend) * 0.35
    },
    gripDegrees,
    hand,
    shoulder
  }
}

function sceneContact(target: BasilSceneTarget, motion: BasilSceneMotion): SceneContact | null {
  if (target === 'document') {
    return {
      intent: 'hold',
      primary: { x: 40, y: 28 },
      primaryGrip: 82,
      secondary: { x: 41, y: 7 },
      secondaryGrip: -72
    }
  }

  if (target === 'folder') {
    return {
      intent: 'hold',
      primary: { x: 39, y: 29 - motion.gesture },
      primaryGrip: 75,
      secondary: { x: 42, y: 10 },
      secondaryGrip: -70
    }
  }

  if (target === 'image') {
    return {
      intent: 'inspect',
      primary: { x: 39, y: 27 },
      primaryGrip: 76,
      secondary: { x: 42, y: -1 },
      secondaryGrip: -68
    }
  }

  if (target === 'data') {
    return {
      intent: 'operate',
      primary: { x: 43 + motion.progress * 8, y: 24 - motion.gesture },
      primaryGrip: 12,
      secondary: { x: 39, y: 28 },
      secondaryGrip: 78
    }
  }

  if (target === 'editor' || target === 'terminal') {
    return {
      intent: 'type',
      primary: { x: 43 + motion.progress * 7, y: 28 - motion.gesture },
      primaryGrip: 4,
      secondary: { x: 51 - motion.progress * 5, y: 29 + motion.gesture * 0.35 },
      secondaryGrip: -4
    }
  }

  if (target === 'web') {
    return { intent: 'point', primary: { x: 43 + motion.progress * 12, y: -11 }, primaryGrip: -22 }
  }

  if (target === 'tool') {
    return {
      intent: 'operate',
      primary: { x: 47 + motion.progress * 10, y: 12 + motion.progress * 12 },
      primaryGrip: 8,
      secondary: { x: 39, y: 28 },
      secondaryGrip: 76
    }
  }

  if (target === 'composer') {
    return { intent: 'point', primary: { x: 43 + motion.progress * 10, y: -11 }, primaryGrip: -20 }
  }

  if (target === 'permission') {
    return {
      intent: 'hold',
      primary: { x: 43, y: -8 },
      primaryGrip: -68,
      secondary: { x: 44, y: -22 },
      secondaryGrip: 68
    }
  }

  return null
}

export function basilSceneLimbPose(
  target: BasilSceneTarget = 'rest',
  motion: BasilSceneMotion,
  focusIntensity = 1,
  travel = 0,
  affordance?: BasilObjectAffordance | null,
  engagement?: BasilEngagementPose | null,
  manipulation?: BasilManipulationPose | null,
  contactKinematics?: BasilContactKinematicsPose | null
): BasilLimbPose | null {
  const contact = sceneContact(target, motion)

  if (!contact) {
    return null
  }

  if (engagement?.stage === 'notice') {
    return {
      intent: 'consider',
      opacity: 0.82,
      primary: limb({ x: 35.5, y: 22 }, { x: 28.5, y: 8 }, -32, 5.5)
    }
  }

  const baseReach = engagement?.limbReach ?? 0.42 + clamp01(focusIntensity) * 0.58
  const reach = manipulation ? Math.min(baseReach, manipulation.handProgress) : baseReach
  const travelLift = clamp01(travel) * 2.5
  const activeAffordance = affordance?.target === target ? affordance : null
  const geometryLift = (activeAffordance?.contact.y ?? 0) * (activeAffordance?.shape === 'tall' ? 7 : 4)

  const geometryReach =
    (activeAffordance?.depth ?? 0.5) *
    (activeAffordance?.shape === 'surface' || activeAffordance?.shape === 'wide' ? 4 : 1.8)

  const primaryShoulder = {
    x: 37.5,
    y: 13 - travelLift + (contactKinematics?.activeHand.y ?? 0) * 0.12
  }

  const primaryHand = {
    x: mix(34, contact.primary.x, reach) + geometryReach + (contactKinematics?.activeHand.x ?? 0),
    y:
      mix(15, contact.primary.y, reach) -
      travelLift +
      geometryLift +
      (contactKinematics?.activeHand.y ?? 0)
  }

  const secondaryShoulder = {
    x: 35.5,
    y: 23 - travelLift * 0.5 + (contactKinematics?.braceHand.y ?? 0) * 0.08
  }

  const secondaryHand = contact.secondary
    ? {
        x: mix(32, contact.secondary.x, reach) + (contactKinematics?.braceHand.x ?? 0),
        y:
          mix(23, contact.secondary.y, reach) -
          travelLift * 0.5 +
          geometryLift * 0.72 +
          (contactKinematics?.braceHand.y ?? 0)
      }
    : undefined

  return {
    intent:
      engagement?.stage === 'prepare' || manipulation?.stage === 'reach'
        ? 'reach'
        : manipulation?.stage === 'release'
          ? 'release'
          : contact.intent,
    opacity: 0.28 + clamp01(focusIntensity) * 0.72,
    primary: limb(
      primaryShoulder,
      primaryHand,
      contact.primaryGrip + (contactKinematics?.activeGripDegrees ?? 0),
      5.5
    ),
    secondary:
      secondaryHand && (engagement?.handCount ?? 2) > 1
        ? limb(
            secondaryShoulder,
            secondaryHand,
            (contact.secondaryGrip ?? 0) + (contactKinematics?.braceGripDegrees ?? 0),
            4
          )
        : undefined
  }
}

export function basilCarryPose(
  focusSide: number,
  travel: number,
  delivery: number,
  motionPhase: number,
  assetLoad = 0,
  carrySag = 0
): BasilCarryPose {
  const side = focusSide < 0 ? -1 : 1
  const travelAmount = clamp01(travel)
  const load = clamp01(assetLoad)
  const progress = 1 - travelAmount
  const smoothProgress = progress * progress * (3 - 2 * progress)
  const parcelX = mix(-side * 48, side * 48, smoothProgress)
  const arcHeight = 64 - load * 14

  const parcelY =
    mix(15, -2 - clamp01(delivery) * 14, smoothProgress) -
    Math.sin(progress * Math.PI) * arcHeight +
    Math.max(0, carrySag)

  const parcelScale = 0.72 + load * 0.1 + Math.sin(progress * Math.PI) * 0.12 - clamp01(delivery) * 0.08
  const parcelSide = Math.abs(parcelX) < 2 ? side : Math.sign(parcelX)
  const bounce = Math.sin(motionPhase * Math.PI * 4) * travelAmount * (1.2 - load * 0.42)
  const primaryHand = { x: parcelX - parcelSide * 9, y: parcelY + 4 + bounce }
  const secondaryHand = { x: parcelX - parcelSide * 8, y: parcelY - 4 + bounce }
  const raised = parcelY < -20
  const primaryShoulder = { x: parcelSide * 29, y: raised ? -8 : 10 }
  const secondaryShoulder = { x: parcelSide * 29, y: raised ? 6 : 23 }

  return {
    limbs: {
      intent: delivery > 0.12 ? 'deliver' : 'carry',
      opacity: 0.94,
      primary: limb(primaryShoulder, primaryHand, parcelSide > 0 ? -8 : 188, parcelSide * 7),
      secondary: limb(secondaryShoulder, secondaryHand, parcelSide > 0 ? 8 : 172, parcelSide * 5)
    },
    parcel: { scale: parcelScale, x: parcelX, y: parcelY + bounce }
  }
}
