import type { BasilScenePhase } from './scene-choreography'
import { type BasilPoint, type BasilSize, type BasilViewport, clampBasilPoint } from './spatial-engine'
import type { BasilSceneTarget, BasilState } from './types'

const NUDGE_STATES = new Set<BasilState>(['idle', 'listening', 'speaking', 'success'])
const MIN_SWIPE = 0.32
const MIN_TRAVEL = 18

export interface BasilPointerNudgeInput {
  actor: BasilSize
  phase: BasilScenePhase
  position: BasilPoint
  state: BasilState
  strength: number
  swipe: BasilPoint
  target: BasilSceneTarget
  viewport: BasilViewport
}

export interface BasilPointerNudgePlan {
  accepted: boolean
  destination: BasilPoint
  direction: BasilPoint
  distance: number
  reason: 'edge-slide' | 'nudged' | 'no-room' | 'protected' | 'weak'
}

function candidateDistance(position: BasilPoint, candidate: BasilPoint): number {
  return Math.hypot(candidate.x - position.x, candidate.y - position.y)
}

function normalizedDirection(from: BasilPoint, to: BasilPoint): BasilPoint {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const distance = Math.hypot(dx, dy)

  return distance > 0.001 ? { x: dx / distance, y: dy / distance } : { x: 0, y: 0 }
}

export function planBasilPointerNudge(input: BasilPointerNudgeInput): BasilPointerNudgePlan {
  const protectedContext = input.phase !== 'engaged' || !NUDGE_STATES.has(input.state)

  if (protectedContext) {
    return {
      accepted: false,
      destination: input.position,
      direction: { x: 0, y: 0 },
      distance: 0,
      reason: 'protected'
    }
  }

  const swipeMagnitude = Math.hypot(input.swipe.x, input.swipe.y)

  if (input.strength < MIN_SWIPE || swipeMagnitude < 0.4) {
    return {
      accepted: false,
      destination: input.position,
      direction: { x: 0, y: 0 },
      distance: 0,
      reason: 'weak'
    }
  }

  const direction = { x: input.swipe.x / swipeMagnitude, y: input.swipe.y / swipeMagnitude }
  const desiredDistance = 76 + Math.min(1, input.strength) * 104

  const primary = clampBasilPoint(
    {
      x: input.position.x + direction.x * desiredDistance,
      y: input.position.y + direction.y * desiredDistance
    },
    input.actor,
    input.viewport
  )

  let destination = primary
  let reason: BasilPointerNudgePlan['reason'] = 'nudged'
  let distance = candidateDistance(input.position, primary)

  if (distance < Math.max(MIN_TRAVEL, desiredDistance * 0.35)) {
    const perpendicular = { x: -direction.y, y: direction.x }

    const alternatives = [1, -1].map(sign =>
      clampBasilPoint(
        {
          x: input.position.x + perpendicular.x * desiredDistance * sign,
          y: input.position.y + perpendicular.y * desiredDistance * sign
        },
        input.actor,
        input.viewport
      )
    )

    const best = alternatives.sort(
      (a, b) => candidateDistance(input.position, b) - candidateDistance(input.position, a)
    )[0]!

    const bestDistance = candidateDistance(input.position, best)

    if (bestDistance > distance) {
      destination = best
      distance = bestDistance
      reason = 'edge-slide'
    }
  }

  if (distance < MIN_TRAVEL) {
    return {
      accepted: false,
      destination: input.position,
      direction: { x: 0, y: 0 },
      distance: 0,
      reason: 'no-room'
    }
  }

  return {
    accepted: true,
    destination,
    direction: normalizedDirection(input.position, destination),
    distance,
    reason
  }
}
