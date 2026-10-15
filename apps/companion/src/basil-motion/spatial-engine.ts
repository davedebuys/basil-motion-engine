import { clampParameter, normalizedParameter } from './engine'
import type {
  BasilInteractionInput,
  BasilParameters,
  BasilSceneTarget,
  BasilStateSnapshot,
  BasilTaskPhase
} from './types'

export interface BasilPoint {
  x: number
  y: number
}

export interface BasilSize {
  height: number
  width: number
}

export interface BasilRect extends BasilPoint, BasilSize {}

export type BasilAnchorSide = 'above' | 'right' | 'left' | 'below'

export interface BasilSceneAnchor {
  id: string
  preferredSide?: BasilAnchorSide
  priority?: number
  rect: BasilRect
  target: BasilSceneTarget
}

export interface BasilViewport extends BasilSize {}

export interface BasilSpatialMotion {
  position: BasilPoint
  velocity: BasilPoint
}

export interface BasilSpatialRoute {
  anchor: BasilSceneAnchor | null
  contactPoint: BasilPoint | null
  destination: BasilPoint
  routed: boolean
  side: BasilAnchorSide | null
}

const STATE_SCENE_TARGETS: Record<BasilStateSnapshot['state'], BasilSceneTarget> = {
  awaiting_permission: 'permission',
  error: 'error',
  idle: 'rest',
  listening: 'composer',
  reading: 'document',
  searching: 'web',
  sleeping: 'rest',
  speaking: 'conversation',
  success: 'conversation',
  thinking: 'conversation',
  using_tool: 'tool',
  writing: 'document'
}

const FALLBACK_POSITIONS: Record<BasilSceneTarget, BasilPoint> = {
  composer: { x: 0.62, y: 0.7 },
  conversation: { x: 0.58, y: 0.3 },
  data: { x: 0.72, y: 0.46 },
  document: { x: 0.72, y: 0.5 },
  editor: { x: 0.74, y: 0.54 },
  error: { x: 0.5, y: 0.34 },
  folder: { x: 0.7, y: 0.48 },
  image: { x: 0.68, y: 0.34 },
  permission: { x: 0.5, y: 0.46 },
  rest: { x: 0.68, y: 0.56 },
  terminal: { x: 0.76, y: 0.62 },
  tool: { x: 0.76, y: 0.56 },
  web: { x: 0.76, y: 0.22 }
}

const SIDES: readonly BasilAnchorSide[] = ['above', 'right', 'left', 'below']
const ANCHOR_GAP = 10
const VIEWPORT_MARGIN = 8
const SURFACE_ROUTE_TARGETS = new Set<BasilSceneTarget>(['data', 'document', 'editor', 'image', 'terminal', 'web'])

const TASK_PHASE_POSITIONS: Record<BasilTaskPhase, number> = {
  complete: 0.86,
  execute: 0.38,
  inspect: 0.68,
  prepare: 0.14
}

export function sceneTargetForSnapshot(snapshot: BasilStateSnapshot): BasilSceneTarget {
  return snapshot.lastEvent?.scene?.target ?? STATE_SCENE_TARGETS[snapshot.state]
}

export function clampBasilPoint(point: BasilPoint, actor: BasilSize, viewport: BasilViewport): BasilPoint {
  return {
    x: Math.min(Math.max(VIEWPORT_MARGIN, point.x), Math.max(VIEWPORT_MARGIN, viewport.width - actor.width - VIEWPORT_MARGIN)),
    y: Math.min(Math.max(VIEWPORT_MARGIN, point.y), Math.max(VIEWPORT_MARGIN, viewport.height - actor.height - VIEWPORT_MARGIN))
  }
}

function pointAtSide(rect: BasilRect, actor: BasilSize, side: BasilAnchorSide): BasilPoint {
  if (side === 'above') {
    return { x: rect.x + (rect.width - actor.width) / 2, y: rect.y - actor.height - ANCHOR_GAP }
  }

  if (side === 'right') {
    return { x: rect.x + rect.width + ANCHOR_GAP, y: rect.y + (rect.height - actor.height) / 2 }
  }

  if (side === 'left') {
    return { x: rect.x - actor.width - ANCHOR_GAP, y: rect.y + (rect.height - actor.height) / 2 }
  }

  return { x: rect.x + (rect.width - actor.width) / 2, y: rect.y + rect.height + ANCHOR_GAP }
}

function isInsideViewport(point: BasilPoint, actor: BasilSize, viewport: BasilViewport): boolean {
  return (
    point.x >= VIEWPORT_MARGIN &&
    point.y >= VIEWPORT_MARGIN &&
    point.x + actor.width <= viewport.width - VIEWPORT_MARGIN &&
    point.y + actor.height <= viewport.height - VIEWPORT_MARGIN
  )
}

function anchorSide(anchor: BasilSceneAnchor, actor: BasilSize, viewport: BasilViewport) {
  const preferred = anchor.preferredSide ?? 'above'
  const sideOrder = [preferred, ...SIDES.filter(side => side !== preferred)]

  for (const side of sideOrder) {
    const point = pointAtSide(anchor.rect, actor, side)

    if (isInsideViewport(point, actor, viewport)) {
      return { point, safe: true, side }
    }
  }

  return {
    point: clampBasilPoint(pointAtSide(anchor.rect, actor, preferred), actor, viewport),
    safe: false,
    side: preferred
  }
}

function contactPointAtSide(rect: BasilRect, side: BasilAnchorSide, axis: number): BasilPoint {
  const insetX = Math.min(12, rect.width * 0.08)
  const insetY = Math.min(12, rect.height * 0.08)

  if (side === 'right') {
    return { x: rect.x + rect.width - insetX, y: axis }
  }

  if (side === 'left') {
    return { x: rect.x + insetX, y: axis }
  }

  if (side === 'above') {
    return { x: axis, y: rect.y + insetY }
  }

  return { x: axis, y: rect.y + rect.height - insetY }
}

export function routeBasilNearAnchor(
  anchor: BasilSceneAnchor,
  actor: BasilSize,
  viewport: BasilViewport,
  taskPhase?: BasilTaskPhase
): Omit<BasilSpatialRoute, 'anchor'> {
  const base = anchorSide(anchor, actor, viewport)
  const verticalEdge = base.side === 'left' || base.side === 'right'
  const axisLength = verticalEdge ? anchor.rect.height : anchor.rect.width
  const actorLength = verticalEdge ? actor.height : actor.width

  const canRoute =
    Boolean(taskPhase) && base.safe && SURFACE_ROUTE_TARGETS.has(anchor.target) && axisLength >= actorLength * 1.55

  if (!canRoute || !taskPhase) {
    return {
      contactPoint: {
        x: anchor.rect.x + anchor.rect.width / 2,
        y: anchor.rect.y + anchor.rect.height / 2
      },
      destination: base.point,
      routed: false,
      side: base.side
    }
  }

  const axisStart = verticalEdge ? anchor.rect.y : anchor.rect.x
  const axisInset = Math.min(actorLength * 0.42, axisLength * 0.18)
  const axis = axisStart + axisInset + (axisLength - axisInset * 2) * TASK_PHASE_POSITIONS[taskPhase]

  const destination = clampBasilPoint(
    verticalEdge
      ? { x: base.point.x, y: axis - actor.height / 2 }
      : { x: axis - actor.width / 2, y: base.point.y },
    actor,
    viewport
  )

  return {
    contactPoint: contactPointAtSide(anchor.rect, base.side, axis),
    destination,
    routed: true,
    side: base.side
  }
}

export function pointNearAnchor(anchor: BasilSceneAnchor, actor: BasilSize, viewport: BasilViewport): BasilPoint {
  return anchorSide(anchor, actor, viewport).point
}

export function directionToRect(actorPosition: BasilPoint, actor: BasilSize, rect: BasilRect): BasilPoint {
  const dx = rect.x + rect.width / 2 - (actorPosition.x + actor.width / 2)
  const dy = rect.y + rect.height / 2 - (actorPosition.y + actor.height / 2)
  const distance = Math.hypot(dx, dy)

  return distance > 0.5 ? { x: dx / distance, y: dy / distance } : { x: 0, y: 0 }
}

export function pointInsideRect(point: BasilPoint, rect: BasilRect): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  )
}

export function chooseBasilAnchor(
  target: BasilSceneTarget,
  anchors: readonly BasilSceneAnchor[]
): BasilSceneAnchor | null {
  let chosen: BasilSceneAnchor | null = null

  for (const anchor of anchors) {
    if (anchor.target !== target) {
      continue
    }

    if (!chosen || (anchor.priority ?? 0) >= (chosen.priority ?? 0)) {
      chosen = anchor
    }
  }

  return chosen
}

export function fallbackBasilPoint(
  target: BasilSceneTarget,
  actor: BasilSize,
  viewport: BasilViewport
): BasilPoint {
  const ratio = FALLBACK_POSITIONS[target]

  return clampBasilPoint(
    {
      x: viewport.width * ratio.x - actor.width / 2,
      y: viewport.height * ratio.y - actor.height / 2
    },
    actor,
    viewport
  )
}

export function resolveBasilDestination(
  snapshot: BasilStateSnapshot,
  anchors: readonly BasilSceneAnchor[],
  actor: BasilSize,
  viewport: BasilViewport
): BasilPoint {
  return resolveBasilSpatialRoute(snapshot, anchors, actor, viewport).destination
}

export function resolveBasilSpatialRoute(
  snapshot: BasilStateSnapshot,
  anchors: readonly BasilSceneAnchor[],
  actor: BasilSize,
  viewport: BasilViewport
): BasilSpatialRoute {
  const target = sceneTargetForSnapshot(snapshot)
  const anchor = chooseBasilAnchor(target, anchors)

  if (!anchor) {
    return {
      anchor: null,
      contactPoint: null,
      destination: fallbackBasilPoint(target, actor, viewport),
      routed: false,
      side: null
    }
  }

  return {
    anchor,
    ...routeBasilNearAnchor(anchor, actor, viewport, snapshot.lastEvent?.scene?.taskPhase)
  }
}

export function stepBasilSpatialMotion(
  motion: BasilSpatialMotion,
  target: BasilPoint,
  dtMs: number
): BasilSpatialMotion {
  const dt = Math.min(Math.max(dtMs, 0), 34) / 1000
  const stiffness = 112
  const damping = 20
  const ax = (target.x - motion.position.x) * stiffness - motion.velocity.x * damping
  const ay = (target.y - motion.position.y) * stiffness - motion.velocity.y * damping

  const velocity = {
    x: motion.velocity.x + ax * dt,
    y: motion.velocity.y + ay * dt
  }

  const position = {
    x: motion.position.x + velocity.x * dt,
    y: motion.position.y + velocity.y * dt
  }

  const settled = Math.hypot(target.x - position.x, target.y - position.y) < 0.25 && Math.hypot(velocity.x, velocity.y) < 2

  return settled ? { position: target, velocity: { x: 0, y: 0 } } : { position, velocity }
}

export function pointerDirection(
  pointer: BasilPoint,
  actorPosition: BasilPoint,
  actor: BasilSize,
  viewport: BasilViewport
): Pick<BasilInteractionInput, 'eyeX' | 'eyeY' | 'proximity'> {
  const centerX = actorPosition.x + actor.width / 2
  const centerY = actorPosition.y + actor.height / 2
  const dx = pointer.x - centerX
  const dy = pointer.y - centerY
  const distance = Math.hypot(dx, dy)
  const eyeRangeX = Math.max(180, viewport.width * 0.35)
  const eyeRangeY = Math.max(150, viewport.height * 0.35)

  return {
    eyeX: clampParameter(dx / eyeRangeX),
    eyeY: clampParameter(dy / eyeRangeY),
    proximity: normalizedParameter(1 - distance / Math.max(220, Math.min(viewport.width, viewport.height) * 0.5))
  }
}

export function applyBasilInteraction(
  parameters: BasilParameters,
  interaction: BasilInteractionInput
): BasilParameters {
  if (!interaction.active && interaction.travel <= 0.001 && interaction.reaction <= 0.001) {
    return parameters
  }

  const gazeWeight = interaction.active ? 0.86 : 0
  const handoffWeight = interaction.handoff * (interaction.active ? 0.16 : 0.42)

  const excitement =
    interaction.actorHold * 0.08 +
    interaction.affection * 0.12 +
    interaction.hover * 0.16 +
    interaction.press * 0.34 +
    interaction.reaction * 0.22 +
    interaction.novelty * interaction.handoff * 0.1 +
    interaction.pointerApproach * 0.16 +
    interaction.pointerOrbit * 0.18 +
    interaction.pointerPet * 0.1 +
    interaction.pointerSpeed * 0.04 +
    interaction.pointerSwipe * 0.16

  const eyeX = parameters.eyeX * (1 - gazeWeight) + interaction.eyeX * gazeWeight
  const eyeY = parameters.eyeY * (1 - gazeWeight) + interaction.eyeY * gazeWeight

  return {
    ...parameters,
    energy: normalizedParameter(parameters.energy + excitement + interaction.travel * 0.2),
    eyeX: clampParameter(eyeX * (1 - handoffWeight) + interaction.travelX * handoffWeight),
    eyeY: clampParameter(eyeY * (1 - handoffWeight) + interaction.travelY * handoffWeight),
    glow: normalizedParameter(
      parameters.glow +
        interaction.affection * 0.12 +
        interaction.pointerOrbit * 0.1 +
        interaction.pointerPet * 0.08 +
        interaction.reaction * 0.08 +
        interaction.travel * 0.1 +
        interaction.pointerDwell * 0.08
    ),
    mouth: clampParameter(
      parameters.mouth +
        interaction.actorHold * 0.08 +
        interaction.affection * 0.18 +
        interaction.hover * 0.12 +
        interaction.reaction * 0.18 +
        interaction.novelty * interaction.handoff * 0.06 +
        interaction.pointerDwell * 0.1 +
        interaction.pointerPet * 0.14
    ),
    particleIntensity: normalizedParameter(
      parameters.particleIntensity +
        interaction.affection * 0.16 +
        interaction.pointerOrbit * 0.24 +
        interaction.pointerPet * 0.18 +
        interaction.reaction * 0.12 +
        interaction.travel * 0.28 +
        interaction.pointerSwipe * 0.18
    ),
    rotation: clampParameter(
      parameters.rotation +
        interaction.eyeX * interaction.hover * 0.04 +
        interaction.eyeX * interaction.pointerSpeed * 0.035 +
        interaction.pointerOrbitDirection * interaction.pointerOrbit * 0.16 +
        interaction.pointerPetDirection * interaction.pointerPet * 0.035 +
        interaction.pointerSwipeX * interaction.pointerSwipe * 0.12 +
        interaction.travelX * interaction.travel * 0.15 +
        interaction.travelX * interaction.handoff * 0.06
    ),
    squash: clampParameter(
      parameters.squash +
        interaction.affection * 0.08 +
        interaction.press * 0.28 +
        interaction.pointerOrbit * 0.06 +
        interaction.reaction * 0.12 +
        interaction.travel * 0.08 +
        interaction.pointerApproach * 0.16 +
        interaction.pointerPet * 0.05 +
        interaction.pointerSwipe * 0.16
    )
  }
}
