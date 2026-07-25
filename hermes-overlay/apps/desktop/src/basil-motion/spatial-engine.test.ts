import { describe, expect, it } from 'vitest'

import { BASIL_DEFAULT_PARAMETERS } from './engine'
import {
  applyBasilInteraction,
  directionToRect,
  fallbackBasilPoint,
  pointerDirection,
  pointInsideRect,
  pointNearAnchor,
  resolveBasilDestination,
  resolveBasilSpatialRoute,
  routeBasilNearAnchor,
  sceneTargetForSnapshot,
  stepBasilSpatialMotion
} from './spatial-engine'

const actor = { height: 100, width: 100 }
const viewport = { height: 700, width: 1000 }

describe('Basil spatial engine', () => {
  it('uses explicit event scene targets before state defaults', () => {
    expect(sceneTargetForSnapshot({ state: 'writing' })).toBe('document')
    expect(
      sceneTargetForSnapshot({
        lastEvent: { kind: 'writing', scene: { target: 'composer' } },
        state: 'writing'
      })
    ).toBe('composer')
  })

  it('places Basil beside real anchors and avoids screen edges', () => {
    const centered = pointNearAnchor(
      {
        id: 'composer',
        preferredSide: 'above',
        rect: { height: 80, width: 400, x: 300, y: 560 },
        target: 'composer'
      },
      actor,
      viewport
    )

    expect(centered).toEqual({ x: 450, y: 450 })

    const edge = pointNearAnchor(
      {
        id: 'edge',
        preferredSide: 'right',
        rect: { height: 80, width: 70, x: 930, y: 300 },
        target: 'tool'
      },
      actor,
      viewport
    )

    expect(edge.x).toBeLessThan(930)
    expect(edge.x).toBeGreaterThanOrEqual(8)
  })

  it('derives the direction from Basil to the object after placement', () => {
    const direction = directionToRect({ x: 400, y: 300 }, actor, { height: 80, width: 100, x: 200, y: 310 })

    expect(direction.x).toBeLessThan(-0.95)
    expect(Math.abs(direction.y)).toBeLessThan(0.2)
  })

  it('uses inclusive visible bounds for overlay hit testing', () => {
    const rect = { height: 120, width: 120, x: 300, y: 200 }

    expect(pointInsideRect({ x: 300, y: 200 }, rect)).toBe(true)
    expect(pointInsideRect({ x: 420, y: 320 }, rect)).toBe(true)
    expect(pointInsideRect({ x: 421, y: 320 }, rect)).toBe(false)
  })

  it('uses the highest-priority live anchor and distinct fallback zones', () => {
    const destination = resolveBasilDestination(
      { lastEvent: { kind: 'tool_start', scene: { target: 'tool' } }, state: 'using_tool' },
      [
        { id: 'old', priority: 2, rect: { height: 100, width: 200, x: 80, y: 200 }, target: 'tool' },
        { id: 'terminal', priority: 10, rect: { height: 300, width: 300, x: 650, y: 200 }, target: 'tool' }
      ],
      actor,
      viewport
    )

    expect(destination).toEqual({ x: 750, y: 90 })

    expect(fallbackBasilPoint('web', actor, viewport)).not.toEqual(fallbackBasilPoint('composer', actor, viewport))
  })

  it('routes genuine task phases along a large surface without crossing it', () => {
    const anchor = {
      id: 'editor',
      preferredSide: 'right' as const,
      rect: { height: 420, width: 400, x: 300, y: 100 },
      target: 'editor' as const
    }

    const phases = ['prepare', 'execute', 'inspect', 'complete'] as const

    const routes = phases.map(taskPhase =>
      resolveBasilSpatialRoute(
        {
          lastEvent: { kind: 'tool_start', scene: { target: 'editor', taskPhase } },
          state: 'writing'
        },
        [anchor],
        actor,
        viewport
      )
    )

    expect(routes.every(route => route.routed && route.side === 'right')).toBe(true)
    expect(routes.map(route => route.destination.x)).toEqual([710, 710, 710, 710])
    expect(routes.map(route => route.destination.y)).toEqual([...routes.map(route => route.destination.y)].sort((a, b) => a - b))
    expect(new Set(routes.map(route => Math.round(route.destination.y))).size).toBe(4)

    routes.forEach(route => {
      expect(route.destination.x).toBeGreaterThanOrEqual(anchor.rect.x + anchor.rect.width + 10)
      expect(route.contactPoint?.x).toBeLessThan(anchor.rect.x + anchor.rect.width)
      expect(route.contactPoint?.y).toBeCloseTo(route.destination.y + actor.height / 2)
    })

    expect(
      resolveBasilSpatialRoute(
        {
          lastEvent: { kind: 'tool_start', scene: { target: 'editor', taskPhase: 'execute' } },
          state: 'writing'
        },
        [anchor],
        actor,
        viewport
      )
    ).toEqual(routes[1])
  })

  it('keeps compact targets at their normal midpoint regardless of task phase', () => {
    const anchor = {
      id: 'compact-image',
      preferredSide: 'right' as const,
      rect: { height: 120, width: 120, x: 300, y: 220 },
      target: 'image' as const
    }

    const prepare = routeBasilNearAnchor(anchor, actor, viewport, 'prepare')
    const complete = routeBasilNearAnchor(anchor, actor, viewport, 'complete')

    expect(prepare.routed).toBe(false)
    expect(complete.routed).toBe(false)
    expect(prepare.destination).toEqual(complete.destination)
    expect(prepare.contactPoint).toEqual({ x: 360, y: 280 })
  })

  it('converges smoothly on a new destination', () => {
    let motion = { position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }
    const target = { x: 500, y: 320 }

    for (let frame = 0; frame < 180; frame += 1) {
      motion = stepBasilSpatialMotion(motion, target, 16)
    }

    expect(motion.position.x).toBeCloseTo(target.x, 1)
    expect(motion.position.y).toBeCloseTo(target.y, 1)
    expect(Math.hypot(motion.velocity.x, motion.velocity.y)).toBeLessThan(2)
  })

  it('tracks the pointer and blends real interaction into motion parameters', () => {
    const direction = pointerDirection({ x: 900, y: 100 }, { x: 400, y: 300 }, actor, viewport)
    expect(direction.eyeX).toBeGreaterThan(0)
    expect(direction.eyeY).toBeLessThan(0)

    const interactive = applyBasilInteraction(BASIL_DEFAULT_PARAMETERS, {
      active: true,
      actorHold: 0.8,
      actorRelease: 0,
      affection: 0.8,
      eyeX: direction.eyeX,
      eyeY: direction.eyeY,
      familiarity: 0,
      handoff: 0.8,
      handoffSource: 'folder',
      handoffTarget: 'editor',
      hover: 1,
      landing: 0,
      novelty: 1,
      pointerApproach: 0.7,
      pointerDeparture: 0,
      pointerDepartureX: 0,
      pointerDepartureY: 0,
      pointerBoop: 0,
      pointerTickle: 0,
      pointerTickleDirection: 0,
      pointerReturn: 0,
      pointerReturnX: 0,
      pointerReturnY: 0,
      pointerDwell: 0.4,
      pointerOrbit: 0.8,
      pointerOrbitDirection: 1,
      pointerPet: 0.7,
      pointerPetDirection: -1,
      pointerSpeed: 0.8,
      pointerSwipe: 0.7,
      pointerSwipeX: 1,
      pointerSwipeY: 0,
      press: 1,
      proximity: direction.proximity,
      reaction: 1,
      travel: 0.8,
      travelX: 1,
      travelY: -0.2
    })

    expect(interactive.eyeX).toBeGreaterThan(BASIL_DEFAULT_PARAMETERS.eyeX)
    expect(interactive.energy).toBeGreaterThan(BASIL_DEFAULT_PARAMETERS.energy)
    expect(interactive.squash).toBeGreaterThan(BASIL_DEFAULT_PARAMETERS.squash)
    expect(interactive.rotation).toBeGreaterThan(BASIL_DEFAULT_PARAMETERS.rotation)
  })
})
