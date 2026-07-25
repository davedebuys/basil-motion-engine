import type { BasilScenePhase } from './scene-choreography'
import type { BasilSceneTarget } from './types'

export interface BasilWorkspacePoint {
  x: number
  y: number
}

export interface BasilWorkspaceRect extends BasilWorkspacePoint {
  height: number
  width: number
}

export type BasilWorkspaceSide = 'above' | 'below' | 'left' | 'right'

export interface BasilWorkspaceCoordinationInput {
  actor: BasilWorkspaceRect
  clearance?: number
  frame: BasilWorkspaceRect
  gap?: number
  phase: BasilScenePhase
  pointer: BasilWorkspacePoint
  target: BasilWorkspaceRect
  targetType: BasilSceneTarget
  workArea: BasilWorkspaceRect
}

export interface BasilWorkspaceCoordinationPose {
  acknowledgment: number
  active: boolean
  bodyLean: number
  currentClearance: number
  destination: BasilWorkspaceRect
  gazeX: number
  gazeY: number
  pointerClearance: number
  side: BasilWorkspaceSide
  strength: number
  travel: BasilWorkspacePoint
}

const COORDINATED_TARGETS = new Set<BasilSceneTarget>([
  'data',
  'document',
  'editor',
  'folder',
  'image',
  'terminal',
  'tool',
  'web'
])

const SIDES: readonly BasilWorkspaceSide[] = ['right', 'left', 'above', 'below']

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum)
}

function unit(from: BasilWorkspacePoint, to: BasilWorkspacePoint): BasilWorkspacePoint {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const distance = Math.hypot(dx, dy)

  return distance > 0.001 ? { x: dx / distance, y: dy / distance } : { x: 0, y: 0 }
}

function pointRectDistance(point: BasilWorkspacePoint, rect: BasilWorkspaceRect): number {
  const dx = Math.max(rect.x - point.x, 0, point.x - (rect.x + rect.width))
  const dy = Math.max(rect.y - point.y, 0, point.y - (rect.y + rect.height))

  return Math.hypot(dx, dy)
}

function overlapArea(left: BasilWorkspaceRect, right: BasilWorkspaceRect): number {
  const width = Math.max(
    0,
    Math.min(left.x + left.width, right.x + right.width) - Math.max(left.x, right.x)
  )

  const height = Math.max(
    0,
    Math.min(left.y + left.height, right.y + right.height) - Math.max(left.y, right.y)
  )

  return width * height
}

function rectDistance(left: BasilWorkspaceRect, right: BasilWorkspaceRect): number {
  const dx = Math.max(
    right.x - (left.x + left.width),
    left.x - (right.x + right.width),
    0
  )

  const dy = Math.max(
    right.y - (left.y + left.height),
    left.y - (right.y + right.height),
    0
  )

  return Math.hypot(dx, dy)
}

function candidateActor(
  target: BasilWorkspaceRect,
  actor: BasilWorkspaceRect,
  side: BasilWorkspaceSide,
  gap: number
): BasilWorkspaceRect {
  if (side === 'right') {
    return {
      ...actor,
      x: target.x + target.width + gap,
      y: target.y + (target.height - actor.height) / 2
    }
  }

  if (side === 'left') {
    return {
      ...actor,
      x: target.x - actor.width - gap,
      y: target.y + (target.height - actor.height) / 2
    }
  }

  if (side === 'above') {
    return {
      ...actor,
      x: target.x + (target.width - actor.width) / 2,
      y: target.y - actor.height - gap
    }
  }

  return {
    ...actor,
    x: target.x + (target.width - actor.width) / 2,
    y: target.y + target.height + gap
  }
}

function frameForActor(
  candidate: BasilWorkspaceRect,
  actor: BasilWorkspaceRect,
  frame: BasilWorkspaceRect,
  workArea: BasilWorkspaceRect
): { actor: BasilWorkspaceRect; frame: BasilWorkspaceRect } {
  const actorInset = { x: actor.x - frame.x, y: actor.y - frame.y }

  const unclamped = {
    ...frame,
    x: candidate.x - actorInset.x,
    y: candidate.y - actorInset.y
  }

  const destination = {
    ...unclamped,
    x: clamp(
      unclamped.x,
      workArea.x,
      Math.max(workArea.x, workArea.x + workArea.width - frame.width)
    ),
    y: clamp(
      unclamped.y,
      workArea.y,
      Math.max(workArea.y, workArea.y + workArea.height - frame.height)
    )
  }

  return {
    actor: {
      ...actor,
      x: destination.x + actorInset.x,
      y: destination.y + actorInset.y
    },
    frame: destination
  }
}

function inactivePose(
  input: BasilWorkspaceCoordinationInput,
  currentClearance: number
): BasilWorkspaceCoordinationPose {
  return {
    acknowledgment: 0,
    active: false,
    bodyLean: 0,
    currentClearance,
    destination: input.frame,
    gazeX: 0,
    gazeY: 0,
    pointerClearance: currentClearance,
    side: 'right',
    strength: 0,
    travel: { x: 0, y: 0 }
  }
}

export function deriveBasilWorkspaceCoordination(
  input: BasilWorkspaceCoordinationInput
): BasilWorkspaceCoordinationPose {
  const currentClearance = pointRectDistance(input.pointer, input.actor)
  const clearance = Math.max(20, input.clearance ?? Math.max(input.actor.width, input.actor.height) * 0.3)

  if (
    input.phase !== 'engaged' ||
    !COORDINATED_TARGETS.has(input.targetType) ||
    currentClearance >= clearance
  ) {
    return inactivePose(input, currentClearance)
  }

  const gap = Math.max(8, input.gap ?? 14)
  const desiredClearance = Math.max(clearance * 1.7, Math.max(input.actor.width, input.actor.height) * 0.72)

  const currentCenter = {
    x: input.actor.x + input.actor.width / 2,
    y: input.actor.y + input.actor.height / 2
  }

  const candidates = SIDES.map((side, index) => {
    const placed = frameForActor(
      candidateActor(input.target, input.actor, side, gap),
      input.actor,
      input.frame,
      input.workArea
    )

    const pointerClearance = pointRectDistance(input.pointer, placed.actor)
    const targetOverlap = overlapArea(placed.actor, input.target)
    const targetClearance = rectDistance(placed.actor, input.target)

    const travelDistance = Math.hypot(
      placed.frame.x - input.frame.x,
      placed.frame.y - input.frame.y
    )

    const clearancePenalty = Math.max(0, desiredClearance - pointerClearance)
    const targetGapPenalty = Math.max(0, gap - targetClearance)

    const score =
      targetOverlap * 10_000 +
      clearancePenalty * clearancePenalty * 120 +
      targetGapPenalty * targetGapPenalty * 1_000 +
      travelDistance * 0.3 +
      index

    return {
      ...placed,
      pointerClearance,
      score,
      side,
      targetClearance,
      targetOverlap,
      travelDistance
    }
  }).sort((left, right) => left.score - right.score)

  const best = candidates[0]!
  const clearanceGain = best.pointerClearance - currentClearance

  if (
    best.targetOverlap > 0.5 ||
    best.targetClearance < gap - 0.5 ||
    clearanceGain < Math.max(22, clearance * 0.45) ||
    best.travelDistance < 18
  ) {
    return inactivePose(input, currentClearance)
  }

  const destinationCenter = {
    x: best.actor.x + best.actor.width / 2,
    y: best.actor.y + best.actor.height / 2
  }

  const gaze = unit(destinationCenter, input.pointer)
  const travel = unit(input.frame, best.frame)
  const obstruction = clamp((clearance - currentClearance) / clearance, 0, 1)
  const improvement = clamp(clearanceGain / Math.max(clearance, 1), 0, 1)
  const strength = clamp(obstruction * 0.7 + improvement * 0.3, 0, 1)
  const leanAway = unit(input.pointer, currentCenter)

  return {
    acknowledgment: clamp(0.46 + strength * 0.54, 0, 1),
    active: true,
    bodyLean: leanAway.x * (2.5 + strength * 4.5),
    currentClearance,
    destination: {
      ...best.frame,
      x: Math.round(best.frame.x),
      y: Math.round(best.frame.y)
    },
    gazeX: gaze.x,
    gazeY: gaze.y,
    pointerClearance: best.pointerClearance,
    side: best.side,
    strength,
    travel
  }
}
