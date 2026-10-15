import type { BasilSceneTarget } from './types'

export interface BasilGeometryPoint {
  x: number
  y: number
}

export interface BasilGeometryRect extends BasilGeometryPoint {
  height: number
  width: number
}

export type BasilObjectShape = 'compact' | 'surface' | 'tall' | 'wide'

export interface BasilObjectAffordance {
  contact: BasilGeometryPoint
  depth: number
  direction: BasilGeometryPoint
  scale: number
  shape: BasilObjectShape
  target: BasilSceneTarget
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum)
}

function normalizedContact(value: number, start: number, size: number): number {
  return clamp(((value - start) / Math.max(1, size)) * 2 - 1, -1, 1)
}

function objectShape(bounds: BasilGeometryRect): BasilObjectShape {
  const diagonal = Math.hypot(bounds.width, bounds.height)
  const aspect = bounds.width / Math.max(1, bounds.height)

  if (diagonal <= 220) {
    return 'compact'
  }

  if (aspect >= 1.8) {
    return 'wide'
  }

  if (aspect <= 0.56) {
    return 'tall'
  }

  return 'surface'
}

export function deriveBasilObjectAffordance(
  target: BasilSceneTarget,
  bounds: BasilGeometryRect,
  point: BasilGeometryPoint,
  actorCenter: BasilGeometryPoint
): BasilObjectAffordance {
  const contact = {
    x: normalizedContact(point.x, bounds.x, bounds.width),
    y: normalizedContact(point.y, bounds.y, bounds.height)
  }

  const dx = point.x - actorCenter.x
  const dy = point.y - actorCenter.y
  const distance = Math.hypot(dx, dy)
  const direction = distance > 0.5 ? { x: dx / distance, y: dy / distance } : { x: 0, y: 0 }
  const horizontalApproach = Math.abs(direction.x) >= Math.abs(direction.y)

  const depth = horizontalApproach
    ? direction.x >= 0
      ? (contact.x + 1) / 2
      : (1 - contact.x) / 2
    : direction.y >= 0
      ? (contact.y + 1) / 2
      : (1 - contact.y) / 2

  return {
    contact,
    depth: clamp(depth, 0, 1),
    direction,
    scale: clamp(Math.sqrt(bounds.width * bounds.height) / 420, 0.18, 1),
    shape: objectShape(bounds),
    target
  }
}
