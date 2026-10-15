import type { BasilState } from './types'

export interface BasilDirectTouchInput {
  boop: number
  state: BasilState
  tickle?: number
  tickleDirection?: number
}

export interface BasilDirectTouchPose {
  active: boolean
  cheekBoost: number
  scaleX: number
  scaleY: number
  strength: number
  surprise: number
  tickle: number
  tickleRotation: number
}

const BOOP_STATES = new Set<BasilState>(['idle', 'listening', 'success'])

function clamp(value: number): number {
  return Math.min(Math.max(value, 0), 1)
}

export function deriveBasilDirectTouchPose(input: BasilDirectTouchInput): BasilDirectTouchPose {
  const allowed = BOOP_STATES.has(input.state)
  const boop = allowed ? clamp(input.boop) : 0
  const tickle = allowed ? clamp(input.tickle ?? 0) : 0
  const tickleDirection = Math.sign(input.tickleDirection ?? 0)
  const strength = Math.max(boop, tickle)

  return {
    active: strength > 0.025,
    cheekBoost: boop * 0.42 + tickle * 0.3,
    scaleX: 1 + boop * 0.065 + tickle * 0.025,
    scaleY: 1 - boop * 0.055 - tickle * 0.018,
    strength,
    surprise: boop * 0.86,
    tickle,
    tickleRotation: tickle * tickleDirection * 7
  }
}
