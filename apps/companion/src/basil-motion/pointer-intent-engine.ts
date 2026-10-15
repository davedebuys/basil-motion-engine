import type { BasilState } from './types'

export type BasilPointerIntentMode = 'anticipate' | 'follow' | 'inactive' | 'settle' | 'sleep' | 'social'

export interface BasilPointerIntentInput {
  active: boolean
  approach: number
  dwell: number
  objectCommitment: number
  pointerX: number
  pointerY: number
  proximity: number
  speed: number
  state: BasilState
  velocityX: number
  velocityY: number
}

export interface BasilPointerIntentPose {
  eyeOpen: number
  gazeX: number
  gazeY: number
  lead: number
  mode: BasilPointerIntentMode
}

const SOCIAL_STATES = new Set<BasilState>(['awaiting_permission', 'error', 'listening', 'speaking', 'success'])

function clamp(value: number, minimum = 0, maximum = 1): number {
  return Math.min(Math.max(value, minimum), maximum)
}

function signed(value: number): number {
  return clamp(value, -1, 1)
}

export function deriveBasilPointerIntent(input: BasilPointerIntentInput): BasilPointerIntentPose {
  if (input.state === 'sleeping') {
    return {
      eyeOpen: 0.98,
      gazeX: signed(input.pointerX * 0.04),
      gazeY: signed(input.pointerY * 0.04),
      lead: 0,
      mode: 'sleep'
    }
  }

  if (!input.active) {
    return {
      eyeOpen: 1,
      gazeX: signed(input.pointerX),
      gazeY: signed(input.pointerY),
      lead: 0,
      mode: 'inactive'
    }
  }

  const speed = clamp(input.speed)
  const proximity = clamp(input.proximity)
  const dwell = clamp(input.dwell)
  const approach = clamp(input.approach)
  const objectCommitment = clamp(input.objectCommitment)
  const velocityMagnitude = clamp(Math.hypot(input.velocityX, input.velocityY))
  const settling = dwell > 0.38 || (speed < 0.045 && velocityMagnitude < 0.045)
  const social = SOCIAL_STATES.has(input.state)
  const workDamping = 1 - objectCommitment * 0.58
  const socialDamping = social ? 0.72 : 1
  const settleDamping = settling ? 0.08 : 1

  const lead =
    clamp(speed * velocityMagnitude * (0.18 + (1 - proximity) * 0.16), 0, 0.32) *
    workDamping *
    socialDamping *
    settleDamping

  let mode: BasilPointerIntentMode = 'follow'

  if (settling) {
    mode = 'settle'
  } else if (social) {
    mode = 'social'
  } else if (lead > 0.025) {
    mode = 'anticipate'
  }

  return {
    eyeOpen: clamp(1 + approach * 0.055 + speed * 0.022 - dwell * 0.025, 0.97, 1.08),
    gazeX: signed(input.pointerX + input.velocityX * lead),
    gazeY: signed(input.pointerY + input.velocityY * lead),
    lead,
    mode
  }
}
