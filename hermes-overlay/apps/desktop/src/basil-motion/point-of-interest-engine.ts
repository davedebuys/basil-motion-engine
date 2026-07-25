import type { BasilSceneTarget } from './types'

export interface BasilPointOfInterestRect {
  height: number
  width: number
  x: number
  y: number
}

export interface BasilPointOfInterestCandidate {
  id: string
  priority?: number
  rect: BasilPointOfInterestRect
  target: BasilSceneTarget
}

export interface BasilPointOfInterestInput {
  actor: BasilPointOfInterestRect
  candidates: readonly BasilPointOfInterestCandidate[]
  preferredTarget: BasilSceneTarget
  viewport: { height: number; width: number }
}

export type BasilPointOfInterestSource = 'ambient' | 'preferred' | 'urgent'

export interface BasilPointOfInterestPose {
  direction: { x: number; y: number }
  id: string
  intensity: number
  source: BasilPointOfInterestSource
  target: BasilSceneTarget
}

const URGENT_TARGETS = new Set<BasilSceneTarget>(['error', 'permission'])

function clamp(value: number, minimum = -1, maximum = 1): number {
  return Math.min(Math.max(value, minimum), maximum)
}

function center(rect: BasilPointOfInterestRect): { x: number; y: number } {
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }
}

function sourceFor(
  candidate: BasilPointOfInterestCandidate,
  preferredTarget: BasilSceneTarget
): BasilPointOfInterestSource {
  if (URGENT_TARGETS.has(candidate.target)) {
    return 'urgent'
  }

  return candidate.target === preferredTarget ? 'preferred' : 'ambient'
}

function candidateScore(
  candidate: BasilPointOfInterestCandidate,
  actorCenter: { x: number; y: number },
  preferredTarget: BasilSceneTarget
): number {
  const candidateCenter = center(candidate.rect)
  const distance = Math.hypot(candidateCenter.x - actorCenter.x, candidateCenter.y - actorCenter.y)
  const source = sourceFor(candidate, preferredTarget)

  const sourceScore =
    source === 'urgent' ? 300 : source === 'preferred' ? 180 : candidate.target === 'composer' ? 70 : 0

  return sourceScore + (candidate.priority ?? 0) - Math.min(24, distance / 180)
}

export function deriveBasilPointOfInterest(
  input: BasilPointOfInterestInput
): BasilPointOfInterestPose | null {
  const candidates = input.candidates.filter(
    candidate =>
      Number.isFinite(candidate.rect.x) &&
      Number.isFinite(candidate.rect.y) &&
      candidate.rect.width > 1 &&
      candidate.rect.height > 1 &&
      candidate.target !== 'rest'
  )

  if (candidates.length === 0) {
    return null
  }

  const actorCenter = center(input.actor)

  const candidate = [...candidates].sort((left, right) => {
    const scoreDelta =
      candidateScore(right, actorCenter, input.preferredTarget) -
      candidateScore(left, actorCenter, input.preferredTarget)

    return scoreDelta || left.id.localeCompare(right.id)
  })[0]

  if (!candidate) {
    return null
  }

  const targetCenter = center(candidate.rect)
  const source = sourceFor(candidate, input.preferredTarget)
  const rangeX = Math.max(180, input.viewport.width * 0.35)
  const rangeY = Math.max(150, input.viewport.height * 0.35)

  return {
    direction: {
      x: clamp((targetCenter.x - actorCenter.x) / rangeX),
      y: clamp((targetCenter.y - actorCenter.y) / rangeY)
    },
    id: candidate.id,
    intensity:
      source === 'urgent' ? 1 : source === 'preferred' ? 0.86 : candidate.target === 'composer' ? 0.2 : 0.16,
    source,
    target: candidate.target
  }
}
