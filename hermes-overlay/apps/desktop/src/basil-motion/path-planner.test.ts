import { describe, expect, it } from 'vitest'

import { planBasilTravelPath } from './path-planner'
import type { BasilPathObstacle } from './path-planner'

const actor = { height: 100, width: 100 }
const viewport = { height: 720, width: 1100 }

function actorOverlapsObstacle(x: number, y: number, obstacle: BasilPathObstacle): boolean {
  return (
    x < obstacle.rect.x + obstacle.rect.width &&
    x + actor.width > obstacle.rect.x &&
    y < obstacle.rect.y + obstacle.rect.height &&
    y + actor.height > obstacle.rect.y
  )
}

function expectRouteToAvoid(path: readonly { x: number; y: number }[], obstacles: readonly BasilPathObstacle[]) {
  for (let index = 1; index < path.length; index += 1) {
    const start = path[index - 1]
    const end = path[index]
    const steps = Math.max(1, Math.ceil(Math.hypot(end.x - start.x, end.y - start.y) / 2))

    for (let step = 0; step <= steps; step += 1) {
      const progress = step / steps
      const x = start.x + (end.x - start.x) * progress
      const y = start.y + (end.y - start.y) * progress

      obstacles.forEach(obstacle => expect(actorOverlapsObstacle(x, y, obstacle)).toBe(false))
    }
  }
}

describe('Basil path planner', () => {
  it('keeps an unobstructed trip direct', () => {
    const path = planBasilTravelPath(
      { x: 40, y: 80 },
      { x: 850, y: 500 },
      actor,
      viewport,
      [{ id: 'off-route', rect: { height: 100, width: 120, x: 100, y: 520 } }]
    )

    expect(path.obstructed).toBe(false)
    expect(path.points).toEqual([
      { x: 40, y: 80 },
      { x: 850, y: 500 }
    ])
  })

  it('routes around a panel that blocks the direct segment', () => {
    const obstacle = { id: 'panel', rect: { height: 260, width: 220, x: 390, y: 210 } }
    const path = planBasilTravelPath({ x: 50, y: 310 }, { x: 900, y: 330 }, actor, viewport, [obstacle])

    expect(path.obstructed).toBe(true)
    expect(path.obstacleIds).toEqual(['panel'])
    expect(path.points.length).toBeGreaterThan(2)
    expectRouteToAvoid(path.points, [obstacle])
  })

  it('finds a multi-waypoint route through staggered work surfaces', () => {
    const obstacles = [
      { id: 'left-panel', rect: { height: 420, width: 180, x: 280, y: 0 } },
      { id: 'right-panel', rect: { height: 400, width: 180, x: 600, y: 320 } }
    ]

    const path = planBasilTravelPath({ x: 40, y: 540 }, { x: 930, y: 80 }, actor, viewport, obstacles)

    expect(path.obstructed).toBe(true)
    expect(path.points.length).toBeGreaterThan(3)
    expectRouteToAvoid(path.points, obstacles)
  })

  it('uses the available side when an obstacle meets a viewport edge', () => {
    const obstacle = { id: 'top-panel', rect: { height: 330, width: 250, x: 390, y: 0 } }
    const path = planBasilTravelPath({ x: 60, y: 180 }, { x: 880, y: 170 }, actor, viewport, [obstacle])

    expect(path.points.some(point => point.y > obstacle.rect.y + obstacle.rect.height)).toBe(true)
    expectRouteToAvoid(path.points, [obstacle])
  })

  it('ignores giant layout backgrounds and tiny decorative elements', () => {
    const path = planBasilTravelPath(
      { x: 40, y: 60 },
      { x: 900, y: 520 },
      actor,
      viewport,
      [
        { id: 'background', rect: { height: 700, width: 1080, x: 0, y: 0 } },
        { id: 'icon', rect: { height: 8, width: 8, x: 420, y: 280 } }
      ]
    )

    expect(path.obstructed).toBe(false)
    expect(path.points).toHaveLength(2)
  })

  it('allows arrival beside an active surface containing the destination', () => {
    const destination = { x: 710, y: 270 }
    const target = { id: 'target', rect: { height: 300, width: 300, x: 650, y: 200 } }
    const path = planBasilTravelPath({ x: 40, y: 300 }, destination, actor, viewport, [target])

    expect(path.obstructed).toBe(false)
    expect(path.points.at(-1)).toEqual(destination)
  })

  it('returns deterministic paths for identical geometry', () => {
    const obstacles = [
      { id: 'one', rect: { height: 190, width: 220, x: 320, y: 200 } },
      { id: 'two', rect: { height: 180, width: 190, x: 650, y: 360 } }
    ]

    const input = [{ x: 40, y: 280 }, { x: 920, y: 300 }, actor, viewport, obstacles] as const

    expect(planBasilTravelPath(...input)).toEqual(planBasilTravelPath(...input))
  })

  it('settles immediately when start and destination are the same', () => {
    const path = planBasilTravelPath({ x: 240, y: 180 }, { x: 240, y: 180 }, actor, viewport, [])

    expect(path).toEqual({
      distance: 0,
      obstacleIds: [],
      obstructed: false,
      points: [{ x: 240, y: 180 }]
    })
  })
})
