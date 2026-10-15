import type { BasilPoint } from './spatial-engine'
import type { BasilSceneTarget } from './types'

export interface BasilAttentionVisit {
  point: BasilPoint
  target: BasilSceneTarget
}

export interface BasilAttentionMemory {
  visits: BasilAttentionVisit[]
}

export interface BasilAttentionTransition {
  direction: BasilPoint
  distance: number
  familiarity: number
  novelty: number
  previousTarget: BasilSceneTarget | null
  sequenceLength: number
  switchedTarget: boolean
}

const MEMORY_LIMIT = 6

export function createBasilAttentionMemory(): BasilAttentionMemory {
  return { visits: [] }
}

export function recordBasilAttention(
  memory: BasilAttentionMemory,
  target: BasilSceneTarget,
  point: BasilPoint,
  origin: BasilPoint = point
): { memory: BasilAttentionMemory; transition: BasilAttentionTransition } {
  const previous = memory.visits.at(-1)
  const from = previous?.point ?? origin
  const dx = point.x - from.x
  const dy = point.y - from.y
  const distance = Math.hypot(dx, dy)
  const priorVisits = memory.visits.filter(visit => visit.target === target).length
  const familiarity = Math.min(1, priorVisits / 3)
  const visits = [...memory.visits, { point, target }].slice(-MEMORY_LIMIT)

  return {
    memory: { visits },
    transition: {
      direction: distance > 0.5 ? { x: dx / distance, y: dy / distance } : { x: 0, y: 0 },
      distance,
      familiarity,
      novelty: 1 - familiarity,
      previousTarget: previous?.target ?? null,
      sequenceLength: visits.length,
      switchedTarget: previous ? previous.target !== target : true
    }
  }
}
