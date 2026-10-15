import type { BasilState } from './types'

export interface BasilPointerDepartureInput {
  directionX: number
  directionY: number
  state: BasilState
  strength: number
}

export interface BasilPointerDeparturePose {
  active: boolean
  angle: number
  eyeX: number
  eyeY: number
  strength: number
}

export interface BasilPointerReturnInput {
  directionX: number
  directionY: number
  state: BasilState
  strength: number
}

export interface BasilPointerReturnPose {
  active: boolean
  eyeX: number
  eyeY: number
  side: -1 | 1
  strength: number
  waveRotation: number
}

const SUPPRESSED_STATES = new Set<BasilState>(['awaiting_permission', 'error', 'sleeping', 'speaking'])
const RETURN_STATES = new Set<BasilState>(['idle', 'listening', 'success'])

function clamp(value: number, minimum = 0, maximum = 1): number {
  return Math.min(Math.max(value, minimum), maximum)
}

export function deriveBasilPointerDeparture(input: BasilPointerDepartureInput): BasilPointerDeparturePose {
  const strength = SUPPRESSED_STATES.has(input.state) ? 0 : clamp(input.strength)
  const magnitude = Math.hypot(input.directionX, input.directionY)
  const directionX = magnitude > 0.001 ? input.directionX / magnitude : 0
  const directionY = magnitude > 0.001 ? input.directionY / magnitude : 0

  return {
    active: strength > 0.01 && magnitude > 0.001,
    angle: Math.atan2(directionY, directionX) * (180 / Math.PI),
    eyeX: directionX * strength,
    eyeY: directionY * strength,
    strength
  }
}

export function deriveBasilPointerReturn(input: BasilPointerReturnInput): BasilPointerReturnPose {
  const strength = RETURN_STATES.has(input.state) ? clamp(input.strength) : 0
  const magnitude = Math.hypot(input.directionX, input.directionY)
  const directionX = magnitude > 0.001 ? input.directionX / magnitude : 0
  const directionY = magnitude > 0.001 ? input.directionY / magnitude : 0
  const side = directionX < 0 ? 1 : -1

  return {
    active: strength > 0.01 && magnitude > 0.001,
    eyeX: directionX * strength * 0.3,
    eyeY: directionY * strength * 0.18,
    side,
    strength,
    waveRotation: side * (8 + strength * 18)
  }
}
