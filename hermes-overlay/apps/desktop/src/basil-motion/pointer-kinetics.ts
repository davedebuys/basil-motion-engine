import type { BasilPoint } from './spatial-engine'

export interface BasilPointerKinetics {
  approach: number
  dwell: number
  speed: number
  velocityX: number
  velocityY: number
}

export interface BasilPointerKineticsTracker {
  dwellMs: number
  lastAt: number | null
  lastDistance: number | null
  lastPoint: BasilPoint | null
  velocity: BasilPoint
}

export function createBasilPointerKineticsTracker(): BasilPointerKineticsTracker {
  return {
    dwellMs: 0,
    lastAt: null,
    lastDistance: null,
    lastPoint: null,
    velocity: { x: 0, y: 0 }
  }
}

function normalized(value: number): number {
  return Math.max(0, Math.min(1, value))
}

function signed(value: number): number {
  return Math.max(-1, Math.min(1, value))
}

export function sampleBasilPointerKinetics(
  tracker: BasilPointerKineticsTracker,
  pointer: BasilPoint,
  actorCenter: BasilPoint,
  now: number
): { kinetics: BasilPointerKinetics; tracker: BasilPointerKineticsTracker } {
  const distance = Math.hypot(pointer.x - actorCenter.x, pointer.y - actorCenter.y)

  if (tracker.lastAt === null || tracker.lastPoint === null || tracker.lastDistance === null) {
    return {
      kinetics: { approach: 0, dwell: 0, speed: 0, velocityX: 0, velocityY: 0 },
      tracker: {
        dwellMs: 0,
        lastAt: now,
        lastDistance: distance,
        lastPoint: pointer,
        velocity: { x: 0, y: 0 }
      }
    }
  }

  const dtMs = Math.max(1, Math.min(250, now - tracker.lastAt))
  const dtSeconds = dtMs / 1000
  const dx = pointer.x - tracker.lastPoint.x
  const dy = pointer.y - tracker.lastPoint.y
  const movement = Math.hypot(dx, dy)
  const moving = movement > 0.25
  const response = 1 - Math.exp(-dtMs / (moving ? 38 : 74))
  const targetVelocity = moving ? { x: dx / dtSeconds, y: dy / dtSeconds } : { x: 0, y: 0 }

  const velocity = {
    x: tracker.velocity.x + (targetVelocity.x - tracker.velocity.x) * response,
    y: tracker.velocity.y + (targetVelocity.y - tracker.velocity.y) * response
  }

  const speedPxPerSecond = Math.hypot(velocity.x, velocity.y)
  const inwardPxPerSecond = (tracker.lastDistance - distance) / dtSeconds
  const nearness = normalized(1 - distance / 190)
  const isDwelling = nearness > 0.48 && speedPxPerSecond < 52

  const dwellMs = isDwelling
    ? Math.min(1800, tracker.dwellMs + dtMs)
    : Math.max(0, tracker.dwellMs - dtMs * 2.4)

  return {
    kinetics: {
      approach: normalized(inwardPxPerSecond / 900) * normalized(0.35 + nearness),
      dwell: normalized(dwellMs / 1200),
      speed: normalized(speedPxPerSecond / 1100),
      velocityX: signed(velocity.x / 1100),
      velocityY: signed(velocity.y / 1100)
    },
    tracker: { dwellMs, lastAt: now, lastDistance: distance, lastPoint: pointer, velocity }
  }
}
