import type { BasilState } from './types'

export type BasilPointerContactStage = 'none' | 'notice' | 'reach' | 'touch'

export interface BasilPointerContactInput {
  directInteraction: number
  dwell: number
  objectCommitment: number
  phase: number
  pointerX: number
  pointerY: number
  proximity: number
  state: BasilState
}

export interface BasilPointerContactPose {
  contactPulse: number
  handY: number
  reach: number
  side: -1 | 1
  stage: BasilPointerContactStage
  strength: number
  wave: number
}

const CONTACT_STATES = new Set<BasilState>(['idle', 'listening', 'success'])

function clamp(value: number, minimum = 0, maximum = 1): number {
  return Math.min(Math.max(Number.isFinite(value) ? value : minimum, minimum), maximum)
}

export function deriveBasilPointerContact(input: BasilPointerContactInput): BasilPointerContactPose {
  const side = clamp(input.pointerX, -1, 1) < 0 ? -1 : 1
  const handY = clamp(input.pointerY, -1, 1) * 9
  const proximity = clamp(input.proximity)
  const dwell = clamp(input.dwell)
  const objectCommitment = clamp(input.objectCommitment)
  const directInteraction = clamp(input.directInteraction)
  const phase = Number.isFinite(input.phase) ? input.phase : 0
  const allowed = CONTACT_STATES.has(input.state)

  if (!allowed || proximity < 0.35 || objectCommitment > 0.5 || directInteraction > 0.24) {
    return {
      contactPulse: 0,
      handY,
      reach: 0,
      side,
      stage: 'none',
      strength: 0,
      wave: 0
    }
  }

  const proximityStrength = clamp((proximity - 0.35) / 0.65)
  const dwellStrength = clamp((dwell - 0.12) / 0.76)
  const suppression = (1 - objectCommitment) * (1 - directInteraction)
  const strength = clamp(proximityStrength * (0.28 + dwellStrength * 0.72) * suppression)
  const stage: BasilPointerContactStage = dwell > 0.6 ? 'touch' : dwell > 0.22 ? 'reach' : 'notice'
  const reach = clamp((proximityStrength * 0.46 + dwellStrength * 0.54) * suppression)
  const wave = stage === 'notice' ? Math.sin(phase * Math.PI * 6) * strength * 5 : 0
  const contactPulse = stage === 'touch' ? (0.72 + Math.sin(phase * Math.PI * 4) * 0.18) * strength : 0

  return {
    contactPulse,
    handY,
    reach,
    side,
    stage: strength > 0.035 ? stage : 'none',
    strength,
    wave
  }
}
