import { useCallback, useEffect, useRef, useState } from 'react'
import type { MutableRefObject, PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from 'react'

import { createBasilAttentionMemory, recordBasilAttention } from './attention-engine'
import { type BasilDragCollaborationPose, deriveBasilDragCollaboration } from './drag-collaboration-engine'
import { createBasilHandoffPayload } from './handoff-engine'
import { type BasilObjectAffordance, deriveBasilObjectAffordance } from './object-affordance'
import { planBasilTravelPath } from './path-planner'
import {
  type BasilPointerGesture,
  createBasilPointerGestureTracker,
  sampleBasilPointerGesture
} from './pointer-gestures'
import { createBasilPointerKineticsTracker, sampleBasilPointerKinetics } from './pointer-kinetics'
import { planBasilPointerNudge } from './pointer-nudge-engine'
import type { BasilScenePhase } from './scene-choreography'
import {
  type BasilPoint,
  type BasilSceneAnchor,
  type BasilSize,
  type BasilSpatialMotion,
  type BasilSpatialRoute,
  clampBasilPoint,
  fallbackBasilPoint,
  pointerDirection,
  pointNearAnchor,
  resolveBasilSpatialRoute,
  sceneTargetForSnapshot,
  stepBasilSpatialMotion
} from './spatial-engine'
import type { BasilInteractionInput, BasilSceneTarget, BasilStateSnapshot } from './types'
import { type BasilWorkspaceCoordinationPose, deriveBasilWorkspaceCoordination } from './workspace-coordination-engine'

const POSITION_KEY = 'basil.motion.position.v1'
const DEFAULT_VIEWPORT = { height: 720, width: 1120 }
const DOM_PREVIEW_DELAY_MS = 600
const DOM_PREVIEW_RADIUS = 5

const DOM_PREVIEW_TARGETS = new Set<BasilSceneTarget>([
  'composer',
  'data',
  'document',
  'editor',
  'folder',
  'image',
  'permission',
  'terminal',
  'tool',
  'web'
])

const DOM_DRAG_TARGETS = new Set<BasilSceneTarget>([
  'data',
  'document',
  'editor',
  'folder',
  'image',
  'terminal',
  'tool',
  'web'
])

const TRAVEL_OBSTACLE_TARGETS = new Set<BasilSceneTarget>([
  'composer',
  'data',
  'document',
  'editor',
  'error',
  'folder',
  'image',
  'permission',
  'terminal',
  'tool',
  'web'
])

export const BASIL_ACTOR_SIZE: BasilSize = { height: 108, width: 108 }

export interface BasilSpatialAdapter {
  anchorFromElement: (element: Element) => BasilSceneAnchor | null
  snapshotAnchors: () => BasilSceneAnchor[]
  subscribeLayoutChanges?: (callback: () => void) => () => void
}

interface DragState {
  dx: number
  dy: number
  moved: boolean
  pointerId: number
  startX: number
  startY: number
}

interface ObjectDragState {
  active: boolean
  anchor: BasilSceneAnchor
  lastAt: number
  lastPoint: BasilPoint
  pointerId: number
  start: BasilPoint
}

interface HoverIntent {
  key: string
  origin: BasilPoint
  timer: number
}

export interface BasilSpatialResult {
  actorRef: MutableRefObject<HTMLButtonElement | null>
  dragCollaboration: BasilDragCollaborationPose | null
  focusAffordance: BasilObjectAffordance | null
  focusDirection: BasilPoint
  focusPhase: BasilScenePhase
  focusTarget: BasilSceneTarget
  interactionRef: MutableRefObject<BasilInteractionInput>
  onClick: () => void
  onDoubleClick: () => void
  onPointerCancel: (event: ReactPointerEvent<HTMLButtonElement>) => void
  onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => void
  onPointerEnter: () => void
  onPointerLeave: () => void
  onPointerMove: (event: ReactPointerEvent<HTMLButtonElement>) => void
  onPointerUp: (event: ReactPointerEvent<HTMLButtonElement>) => void
  onWheel: (event: ReactWheelEvent<HTMLButtonElement>) => void
  position: BasilPoint
  workspaceCoordination: BasilWorkspaceCoordinationPose | null
}

function viewportSize() {
  if (typeof window === 'undefined') {
    return DEFAULT_VIEWPORT
  }

  return { height: window.innerHeight || DEFAULT_VIEWPORT.height, width: window.innerWidth || DEFAULT_VIEWPORT.width }
}

function initialPosition(): BasilPoint {
  const viewport = viewportSize()

  try {
    const parsed = JSON.parse(window.localStorage.getItem(POSITION_KEY) ?? '') as Partial<BasilPoint>

    if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
      return clampBasilPoint({ x: parsed.x, y: parsed.y }, BASIL_ACTOR_SIZE, viewport)
    }
  } catch {
    // The viewport-relative fallback below is the durable default.
  }

  return fallbackBasilPoint('rest', BASIL_ACTOR_SIZE, viewport)
}

function persistPosition(point: BasilPoint): void {
  try {
    window.localStorage.setItem(POSITION_KEY, JSON.stringify(point))
  } catch {
    // Position persistence is cosmetic; movement remains available in-memory.
  }
}

function anchorKey(anchor: BasilSceneAnchor): string {
  return [
    anchor.target,
    Math.round(anchor.rect.x),
    Math.round(anchor.rect.y),
    Math.round(anchor.rect.width),
    Math.round(anchor.rect.height)
  ].join(':')
}

function spatialRouteKey(route: BasilSpatialRoute): string {
  if (!route.anchor) {
    return `fallback:${route.destination.x.toFixed(2)}:${route.destination.y.toFixed(2)}`
  }

  return [
    route.anchor.id,
    route.anchor.rect.x,
    route.anchor.rect.y,
    route.anchor.rect.width,
    route.anchor.rect.height,
    route.destination.x,
    route.destination.y,
    route.contactPoint?.x ?? '',
    route.contactPoint?.y ?? ''
  ]
    .map(value => (typeof value === 'number' ? value.toFixed(2) : value))
    .join(':')
}

function spatialAnchorLayoutKey(anchors: readonly BasilSceneAnchor[]): string {
  return anchors
    .filter(anchor => TRAVEL_OBSTACLE_TARGETS.has(anchor.target))
    .map(anchor =>
      [
        anchor.id,
        anchor.rect.x.toFixed(1),
        anchor.rect.y.toFixed(1),
        anchor.rect.width.toFixed(1),
        anchor.rect.height.toFixed(1)
      ].join(':')
    )
    .sort()
    .join('|')
}

function sameAnchorGeometry(left: BasilSceneAnchor, right: BasilSceneAnchor): boolean {
  return (
    left.target === right.target &&
    Math.abs(left.rect.x - right.rect.x) < 1 &&
    Math.abs(left.rect.y - right.rect.y) < 1 &&
    Math.abs(left.rect.width - right.rect.width) < 1 &&
    Math.abs(left.rect.height - right.rect.height) < 1
  )
}

const EMPTY_INTERACTION: BasilInteractionInput = {
  active: false,
  actorHold: 0,
  actorRelease: 0,
  affection: 0,
  eyeX: 0,
  eyeY: 0,
  familiarity: 0,
  handoff: 0,
  handoffSource: null,
  handoffTarget: null,
  hover: 0,
  landing: 0,
  novelty: 0,
  pointerApproach: 0,
  pointerDeparture: 0,
  pointerDepartureX: 0,
  pointerDepartureY: 0,
  pointerBoop: 0,
  pointerTickle: 0,
  pointerTickleDirection: 0,
  pointerReturn: 0,
  pointerReturnX: 0,
  pointerReturnY: 0,
  pointerDwell: 0,
  pointerOrbit: 0,
  pointerOrbitDirection: 0,
  pointerPet: 0,
  pointerPetDirection: 0,
  pointerSpeed: 0,
  pointerVelocityX: 0,
  pointerVelocityY: 0,
  pointerSwipe: 0,
  pointerSwipeX: 0,
  pointerSwipeY: 0,
  press: 0,
  proximity: 0,
  reaction: 0,
  travel: 0,
  travelX: 0,
  travelY: 0
}

export function useBasilSpatial(
  snapshot: BasilStateSnapshot,
  adapter: BasilSpatialAdapter,
  paused = false
): BasilSpatialResult {
  const [position, setPosition] = useState<BasilPoint>(initialPosition)
  const [focusTarget, setFocusTarget] = useState<BasilSceneTarget>(() => sceneTargetForSnapshot(snapshot))
  const [focusAffordance, setFocusAffordance] = useState<BasilObjectAffordance | null>(null)
  const [focusDirection, setFocusDirection] = useState<BasilPoint>({ x: 1, y: 0 })
  const [focusPhase, setFocusPhase] = useState<BasilScenePhase>('engaged')
  const [dragCollaboration, setDragCollaboration] = useState<BasilDragCollaborationPose | null>(null)

  const [workspaceCoordination, setWorkspaceCoordination] = useState<BasilWorkspaceCoordinationPose | null>(null)

  const initial = useRef(position).current
  const actorRef = useRef<HTMLButtonElement | null>(null)
  const interactionRef = useRef<BasilInteractionInput>({ ...EMPTY_INTERACTION })
  const attentionRef = useRef(createBasilAttentionMemory())
  const pointerGestureRef = useRef(createBasilPointerGestureTracker())
  const pointerGestureEventQueueRef = useRef<Array<{ at: number; point: BasilPoint }>>([])
  const pointerKineticsRef = useRef(createBasilPointerKineticsTracker())
  const motionRef = useRef<BasilSpatialMotion>({ position: initial, velocity: { x: 0, y: 0 } })
  const targetRef = useRef<BasilPoint>(initial)
  const finalTargetRef = useRef<BasilPoint>(initial)
  const waypointQueueRef = useRef<BasilPoint[]>([])
  const dragRef = useRef<DragState | null>(null)
  const actorDragSuppressClickRef = useRef(false)
  const objectDragRef = useRef<ObjectDragState | null>(null)
  const objectDragReleaseTimerRef = useRef<number | null>(null)
  const objectDragSuppressClickRef = useRef(false)
  const hoverIntentRef = useRef<HoverIntent | null>(null)
  const previewActiveRef = useRef(false)
  const activatedAnchorKeyRef = useRef<string | null>(null)
  const focusPhaseRef = useRef(focusPhase)
  const focusTargetRef = useRef(focusTarget)
  const activeRouteKeyRef = useRef<string | null>(null)
  const activeAnchorRef = useRef<BasilSceneAnchor | null>(null)
  const reconcileActiveAnchorRef = useRef<(() => void) | null>(null)
  const snapshotRef = useRef(snapshot)
  const lastFrameRef = useRef(0)
  const lastPointerRef = useRef<BasilPoint | null>(null)
  const lastWorkspaceYieldAtRef = useRef(0)
  const workspaceCoordinationRef = useRef<BasilWorkspaceCoordinationPose | null>(null)
  const wasTravelingRef = useRef(false)
  const adapterRef = useRef(adapter)
  adapterRef.current = adapter
  focusPhaseRef.current = focusPhase
  focusTargetRef.current = focusTarget
  snapshotRef.current = snapshot

  const queueTravel = useCallback(
    (
      destination: BasilPoint,
      anchors: readonly BasilSceneAnchor[],
      activeAnchor: BasilSceneAnchor | null = null,
      avoidActiveAnchor = false
    ) => {
      const viewport = viewportSize()

      const obstacles = anchors
        .filter(anchor => TRAVEL_OBSTACLE_TARGETS.has(anchor.target))
        .filter(
          anchor =>
            !activeAnchor ||
            avoidActiveAnchor ||
            (anchor.id !== activeAnchor.id && !sameAnchorGeometry(anchor, activeAnchor))
        )
        .map(anchor => {
          const isActive =
            Boolean(activeAnchor) && (anchor.id === activeAnchor?.id || sameAnchorGeometry(anchor, activeAnchor!))

          return { id: isActive ? `${anchor.id}:active-yield` : anchor.id, rect: anchor.rect }
        })

      const current = motionRef.current.position
      let routeStart = current

      if (avoidActiveAnchor && activeAnchor) {
        const rect = activeAnchor.rect
        const outwardGap = 20

        if (current.x >= rect.x + rect.width) {
          routeStart = { x: Math.max(current.x, rect.x + rect.width + outwardGap), y: current.y }
        } else if (current.x + BASIL_ACTOR_SIZE.width <= rect.x) {
          routeStart = {
            x: Math.min(current.x, rect.x - BASIL_ACTOR_SIZE.width - outwardGap),
            y: current.y
          }
        } else if (current.y + BASIL_ACTOR_SIZE.height <= rect.y) {
          routeStart = {
            x: current.x,
            y: Math.min(current.y, rect.y - BASIL_ACTOR_SIZE.height - outwardGap)
          }
        } else {
          routeStart = { x: current.x, y: Math.max(current.y, rect.y + rect.height + outwardGap) }
        }

        routeStart = clampBasilPoint(routeStart, BASIL_ACTOR_SIZE, viewport)
      }

      const path = planBasilTravelPath(routeStart, destination, BASIL_ACTOR_SIZE, viewport, obstacles)

      const points =
        Math.hypot(routeStart.x - current.x, routeStart.y - current.y) > 0.5
          ? [current, routeStart, ...path.points.slice(1)]
          : path.points

      const upcoming = points.slice(1)

      finalTargetRef.current = points.at(-1) ?? destination
      targetRef.current = upcoming.shift() ?? finalTargetRef.current
      waypointQueueRef.current = upcoming
    },
    []
  )

  useEffect(() => {
    if (paused) {
      lastFrameRef.current = 0

      return
    }

    let raf = 0
    let cancelled = false

    const tick = (now: number) => {
      const dt = Math.min(34, now - (lastFrameRef.current || now))
      lastFrameRef.current = now
      const next = stepBasilSpatialMotion(motionRef.current, targetRef.current, dt)
      motionRef.current = next
      const speed = Math.hypot(next.velocity.x, next.velocity.y)
      let remaining = Math.hypot(targetRef.current.x - next.position.x, targetRef.current.y - next.position.y)

      if (remaining < 5 && waypointQueueRef.current.length) {
        targetRef.current = waypointQueueRef.current.shift() ?? finalTargetRef.current
        remaining = Math.hypot(targetRef.current.x - next.position.x, targetRef.current.y - next.position.y)
      }

      const routePending = waypointQueueRef.current.length > 0
      const interaction = interactionRef.current
      interaction.travel += (Math.min(1, speed / 420) - interaction.travel) * 0.18
      interaction.affection *= Math.exp(-dt / 1150)
      interaction.actorRelease *= Math.exp(-dt / 420)
      interaction.landing *= Math.exp(-dt / 360)
      interaction.pointerDeparture *= Math.exp(-dt / 680)
      interaction.pointerBoop *= Math.exp(-dt / 430)
      interaction.pointerTickle *= Math.exp(-dt / 520)
      interaction.pointerReturn *= Math.exp(-dt / 520)
      interaction.reaction *= Math.exp(-dt / 520)
      interaction.handoff *= Math.exp(-dt / 920)

      if (speed > 4) {
        interaction.travelX = next.velocity.x / speed
        interaction.travelY = next.velocity.y / speed
      }

      if (speed > 12 || remaining > 2 || routePending) {
        wasTravelingRef.current = true
        interaction.landing = 0
        setFocusPhase('approach')
      } else if (wasTravelingRef.current) {
        wasTravelingRef.current = false
        interaction.landing = 1
        interaction.reaction = 1
        setFocusPhase('engaged')

        if (workspaceCoordinationRef.current) {
          workspaceCoordinationRef.current = null
          setWorkspaceCoordination(null)
        }
      }

      if (lastPointerRef.current) {
        const actorCenter = {
          x: next.position.x + BASIL_ACTOR_SIZE.width / 2,
          y: next.position.y + BASIL_ACTOR_SIZE.height / 2
        }

        const kinetics = sampleBasilPointerKinetics(
          pointerKineticsRef.current,
          lastPointerRef.current,
          actorCenter,
          now
        )

        let previousGesture = pointerGestureRef.current
        let triggeredSwipe: BasilPointerGesture | null = null

        for (const sample of pointerGestureEventQueueRef.current) {
          const sampledGesture = sampleBasilPointerGesture(
            previousGesture,
            sample.point,
            actorCenter,
            Math.max(sample.at, (previousGesture.lastAt ?? sample.at) + 0.01)
          )

          if (sampledGesture.tracker.lastSwipeAt > previousGesture.lastSwipeAt) {
            triggeredSwipe = sampledGesture.gesture
          }

          previousGesture = sampledGesture.tracker
        }

        pointerGestureEventQueueRef.current = []

        const gesture = sampleBasilPointerGesture(
          previousGesture,
          lastPointerRef.current,
          actorCenter,
          Math.max(now, previousGesture.lastAt ?? now)
        )

        const swipeTriggered = triggeredSwipe !== null

        pointerKineticsRef.current = kinetics.tracker
        pointerGestureRef.current = gesture.tracker

        if (swipeTriggered && !dragRef.current) {
          const swipe = triggeredSwipe ?? gesture.gesture

          const nudge = planBasilPointerNudge({
            actor: BASIL_ACTOR_SIZE,
            phase: focusPhaseRef.current,
            position: next.position,
            state: snapshotRef.current.state,
            strength: swipe.swipe,
            swipe: { x: swipe.swipeX, y: swipe.swipeY },
            target: focusTargetRef.current,
            viewport: viewportSize()
          })

          if (nudge.accepted) {
            waypointQueueRef.current = []
            finalTargetRef.current = nudge.destination
            targetRef.current = nudge.destination
            persistPosition(nudge.destination)
            Object.assign(interaction, {
              handoff: 0,
              handoffSource: null,
              handoffTarget: null,
              novelty: 0,
              reaction: 1,
              travelX: nudge.direction.x,
              travelY: nudge.direction.y
            })
          }
        }

        Object.assign(
          interaction,
          pointerDirection(lastPointerRef.current, next.position, BASIL_ACTOR_SIZE, viewportSize()),
          {
            active: true,
            pointerApproach: kinetics.kinetics.approach,
            pointerDwell: kinetics.kinetics.dwell,
            pointerOrbit: gesture.gesture.orbit,
            pointerOrbitDirection: gesture.gesture.orbitDirection,
            pointerPet: gesture.gesture.pet,
            pointerPetDirection: gesture.gesture.petDirection,
            pointerSpeed: kinetics.kinetics.speed,
            pointerVelocityX: kinetics.kinetics.velocityX,
            pointerVelocityY: kinetics.kinetics.velocityY,
            pointerSwipe: gesture.gesture.swipe,
            pointerSwipeX: gesture.gesture.swipeX,
            pointerSwipeY: gesture.gesture.swipeY
          }
        )
      }

      setPosition(previous =>
        Math.abs(previous.x - next.position.x) > 0.05 || Math.abs(previous.y - next.position.y) > 0.05
          ? next.position
          : previous
      )

      if (!cancelled) {
        raf = requestAnimationFrame(tick)
      }
    }

    raf = requestAnimationFrame(tick)

    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
    }
  }, [paused])

  useEffect(() => {
    if (hoverIntentRef.current) {
      window.clearTimeout(hoverIntentRef.current.timer)
      hoverIntentRef.current = null
    }

    previewActiveRef.current = false
    activatedAnchorKeyRef.current = null
    activeRouteKeyRef.current = null
    activeAnchorRef.current = null
    reconcileActiveAnchorRef.current = null
    workspaceCoordinationRef.current = null
    setWorkspaceCoordination(null)

    if (!snapshot.lastEvent) {
      return
    }

    let raf = 0

    const eventTarget = sceneTargetForSnapshot(snapshot)

    const moveToEventTarget = (recordAttention: boolean, requireAnchor = false, react = true) => {
      setFocusTarget(eventTarget)
      const anchors = adapterRef.current.snapshotAnchors()
      const route = resolveBasilSpatialRoute(snapshot, anchors, BASIL_ACTOR_SIZE, viewportSize())
      const { anchor, destination } = route

      activeAnchorRef.current = anchor

      if (requireAnchor && !anchor) {
        return
      }

      const routeKey = `${spatialRouteKey(route)}|layout:${spatialAnchorLayoutKey(anchors)}`

      if (!recordAttention && activeRouteKeyRef.current === routeKey) {
        return
      }

      activeRouteKeyRef.current = routeKey

      const movementRequired =
        Math.hypot(destination.x - motionRef.current.position.x, destination.y - motionRef.current.position.y) > 2 ||
        Math.hypot(motionRef.current.velocity.x, motionRef.current.velocity.y) > 12

      queueTravel(destination, anchors, anchor)
      setFocusPhase(movementRequired ? 'approach' : 'engaged')

      if (!movementRequired) {
        wasTravelingRef.current = false
        interactionRef.current.landing = 0
      }

      if (anchor) {
        const actorCenter = {
          x: destination.x + BASIL_ACTOR_SIZE.width / 2,
          y: destination.y + BASIL_ACTOR_SIZE.height / 2
        }

        const contactPoint = route.contactPoint ?? {
          x: anchor.rect.x + anchor.rect.width / 2,
          y: anchor.rect.y + anchor.rect.height / 2
        }

        const affordance = deriveBasilObjectAffordance(eventTarget, anchor.rect, contactPoint, actorCenter)

        setFocusAffordance(affordance)
        setFocusDirection(affordance.direction)
      } else {
        setFocusAffordance(null)
      }

      if (recordAttention) {
        const result = recordBasilAttention(attentionRef.current, eventTarget, destination, motionRef.current.position)

        attentionRef.current = result.memory
        const handoffPayload = createBasilHandoffPayload(result.transition.previousTarget, eventTarget)

        Object.assign(interactionRef.current, {
          familiarity: result.transition.familiarity,
          handoff: 1,
          handoffSource: handoffPayload?.source ?? null,
          handoffTarget: handoffPayload?.target ?? null,
          novelty: result.transition.novelty,
          travelX: result.transition.direction.x,
          travelY: result.transition.direction.y
        })
      }

      if (react) {
        interactionRef.current.reaction = Math.max(
          interactionRef.current.reaction,
          0.48 + interactionRef.current.novelty * 0.3
        )
      }
    }

    const reconcileActiveAnchor = () => {
      if (!dragRef.current && !previewActiveRef.current) {
        moveToEventTarget(false, true, false)
      }
    }

    reconcileActiveAnchorRef.current = reconcileActiveAnchor
    moveToEventTarget(true)
    raf = requestAnimationFrame(() => moveToEventTarget(false, false, false))

    return () => {
      cancelAnimationFrame(raf)

      if (reconcileActiveAnchorRef.current === reconcileActiveAnchor) {
        reconcileActiveAnchorRef.current = null
      }
    }
  }, [queueTravel, snapshot])

  useEffect(() => {
    const unsubscribe = adapter.subscribeLayoutChanges?.(() => {
      reconcileActiveAnchorRef.current?.()
    })

    return () => unsubscribe?.()
  }, [adapter])

  useEffect(() => {
    const clearHoverIntent = (restorePreview: boolean) => {
      if (hoverIntentRef.current) {
        window.clearTimeout(hoverIntentRef.current.timer)
        hoverIntentRef.current = null
      }

      if (restorePreview && previewActiveRef.current) {
        previewActiveRef.current = false
        setFocusAffordance(null)
        setFocusPhase('engaged')
        setFocusTarget(sceneTargetForSnapshot(snapshotRef.current))
      }
    }

    const clearObjectDragRelease = () => {
      if (objectDragReleaseTimerRef.current !== null) {
        window.clearTimeout(objectDragReleaseTimerRef.current)
        objectDragReleaseTimerRef.current = null
      }
    }

    const applyWorkspaceCoordination = (point: BasilPoint) => {
      const anchor = activeAnchorRef.current
      const now = performance.now()

      if (
        !anchor ||
        focusPhaseRef.current !== 'engaged' ||
        previewActiveRef.current ||
        dragRef.current ||
        objectDragRef.current?.active ||
        now - lastWorkspaceYieldAtRef.current < 520
      ) {
        return false
      }

      const viewport = viewportSize()

      const pose = deriveBasilWorkspaceCoordination({
        actor: {
          ...motionRef.current.position,
          height: BASIL_ACTOR_SIZE.height,
          width: BASIL_ACTOR_SIZE.width
        },
        frame: {
          ...motionRef.current.position,
          height: BASIL_ACTOR_SIZE.height,
          width: BASIL_ACTOR_SIZE.width
        },
        gap: 20,
        phase: focusPhaseRef.current,
        pointer: point,
        target: anchor.rect,
        targetType: anchor.target,
        workArea: { height: viewport.height, width: viewport.width, x: 0, y: 0 }
      })

      if (!pose.active) {
        return false
      }

      lastWorkspaceYieldAtRef.current = now
      workspaceCoordinationRef.current = pose
      setWorkspaceCoordination(pose)
      setFocusDirection({ x: pose.gazeX, y: pose.gazeY })
      setFocusPhase('approach')
      queueTravel(pose.destination, adapterRef.current.snapshotAnchors(), anchor, true)

      const actorCenter = {
        x: pose.destination.x + BASIL_ACTOR_SIZE.width / 2,
        y: pose.destination.y + BASIL_ACTOR_SIZE.height / 2
      }

      const affordance = deriveBasilObjectAffordance(anchor.target, anchor.rect, point, actorCenter)

      setFocusAffordance(affordance)
      Object.assign(interactionRef.current, {
        reaction: Math.max(interactionRef.current.reaction, pose.acknowledgment),
        travelX: pose.travel.x,
        travelY: pose.travel.y
      })

      return true
    }

    const applyObjectDrag = (event: PointerEvent) => {
      const drag = objectDragRef.current

      if (!drag || drag.pointerId !== event.pointerId) {
        return
      }

      const point = { x: event.clientX, y: event.clientY }
      const distance = Math.hypot(point.x - drag.start.x, point.y - drag.start.y)

      if (!drag.active && distance < 10) {
        return
      }

      const now = performance.now()
      const elapsed = Math.max(1, now - drag.lastAt)
      const dx = point.x - drag.lastPoint.x
      const dy = point.y - drag.lastPoint.y
      const step = Math.hypot(dx, dy)
      const speed = Math.min(1, step / elapsed / 1.1)

      const velocity = step > 0.01 ? { x: (dx / step) * speed, y: (dy / step) * speed } : { x: 0, y: 0 }

      const phase = drag.active ? 'carry' : 'acquire'

      const pose = deriveBasilDragCollaboration({
        actor: {
          ...motionRef.current.position,
          height: BASIL_ACTOR_SIZE.height,
          width: BASIL_ACTOR_SIZE.width
        },
        distance,
        phase,
        pointer: point,
        target: drag.anchor.target,
        velocity,
        workArea: { height: viewportSize().height, width: viewportSize().width, x: 0, y: 0 }
      })

      if (!pose.active) {
        return
      }

      drag.active = true
      drag.lastAt = now
      drag.lastPoint = point
      clearObjectDragRelease()
      clearHoverIntent(false)
      previewActiveRef.current = false
      waypointQueueRef.current = []
      finalTargetRef.current = pose.destination
      targetRef.current = pose.destination
      setDragCollaboration(pose)
      workspaceCoordinationRef.current = null
      setWorkspaceCoordination(null)
      setFocusTarget(drag.anchor.target)
      setFocusPhase('engaged')

      const actorCenter = {
        x: pose.destination.x + BASIL_ACTOR_SIZE.width / 2,
        y: pose.destination.y + BASIL_ACTOR_SIZE.height / 2
      }

      const affordance = deriveBasilObjectAffordance(drag.anchor.target, drag.anchor.rect, point, actorCenter)

      setFocusAffordance(affordance)
      setFocusDirection({ x: pose.gazeX, y: pose.gazeY })
      Object.assign(interactionRef.current, {
        active: true,
        press: pose.grip,
        reaction: Math.max(interactionRef.current.reaction, pose.strength),
        travel: pose.strength * 0.62,
        travelX: pose.velocity.x,
        travelY: pose.velocity.y
      })
    }

    const onWindowPointerDown = (event: PointerEvent) => {
      if (event.button !== 0 || !(event.target instanceof Element) || actorRef.current?.contains(event.target)) {
        return
      }

      const anchor = adapterRef.current.anchorFromElement(event.target)

      if (!anchor || !DOM_DRAG_TARGETS.has(anchor.target)) {
        return
      }

      clearObjectDragRelease()
      objectDragRef.current = {
        active: false,
        anchor,
        lastAt: performance.now(),
        lastPoint: { x: event.clientX, y: event.clientY },
        pointerId: event.pointerId,
        start: { x: event.clientX, y: event.clientY }
      }
    }

    const onWindowPointerMove = (event: PointerEvent) => {
      const point = { x: event.clientX, y: event.clientY }
      const returningFromDeparture = interactionRef.current.pointerDeparture > 0.05

      if (returningFromDeparture) {
        interactionRef.current.pointerReturn = 1
        interactionRef.current.pointerReturnX = interactionRef.current.pointerDepartureX
        interactionRef.current.pointerReturnY = interactionRef.current.pointerDepartureY
      }

      interactionRef.current.pointerDeparture = 0
      interactionRef.current.pointerDepartureX = 0
      interactionRef.current.pointerDepartureY = 0
      lastPointerRef.current = point
      pointerGestureEventQueueRef.current = [
        ...pointerGestureEventQueueRef.current.slice(-23),
        { at: performance.now(), point }
      ]
      applyObjectDrag(event)

      if (objectDragRef.current?.active) {
        clearHoverIntent(false)

        return
      }

      applyWorkspaceCoordination(lastPointerRef.current)

      const element = event.target

      if (!(element instanceof Element) || actorRef.current?.contains(element)) {
        activatedAnchorKeyRef.current = null
        clearHoverIntent(true)

        return
      }

      const anchor = adapterRef.current.anchorFromElement(element)

      if (!anchor || !DOM_PREVIEW_TARGETS.has(anchor.target)) {
        activatedAnchorKeyRef.current = null
        clearHoverIntent(true)

        return
      }

      const key = anchorKey(anchor)

      if (activatedAnchorKeyRef.current === key) {
        clearHoverIntent(false)

        return
      }

      activatedAnchorKeyRef.current = null

      const current = hoverIntentRef.current

      if (
        current &&
        current.key === key &&
        Math.hypot(point.x - current.origin.x, point.y - current.origin.y) <= DOM_PREVIEW_RADIUS
      ) {
        return
      }

      clearHoverIntent(true)

      const timer = window.setTimeout(() => {
        const actorCenter = {
          x: motionRef.current.position.x + BASIL_ACTOR_SIZE.width / 2,
          y: motionRef.current.position.y + BASIL_ACTOR_SIZE.height / 2
        }

        const affordance = deriveBasilObjectAffordance(anchor.target, anchor.rect, point, actorCenter)

        hoverIntentRef.current = null
        previewActiveRef.current = true
        setFocusAffordance(affordance)
        setFocusDirection(affordance.direction)
        setFocusPhase('preview')
        setFocusTarget(anchor.target)
      }, DOM_PREVIEW_DELAY_MS)

      hoverIntentRef.current = { key, origin: point, timer }
    }

    const onWindowBlur = () => {
      interactionRef.current.active = false
      interactionRef.current.actorHold = 0
      interactionRef.current.actorRelease = 0
      interactionRef.current.hover = 0
      interactionRef.current.pointerDeparture = 0
      interactionRef.current.pointerDepartureX = 0
      interactionRef.current.pointerDepartureY = 0
      interactionRef.current.pointerReturn = 0
      interactionRef.current.pointerReturnX = 0
      interactionRef.current.pointerReturnY = 0
      interactionRef.current.press = 0
      lastPointerRef.current = null
      activatedAnchorKeyRef.current = null
      clearHoverIntent(true)
      pointerGestureRef.current = createBasilPointerGestureTracker()
      pointerGestureEventQueueRef.current = []
      pointerKineticsRef.current = createBasilPointerKineticsTracker()
      dragRef.current = null
      actorDragSuppressClickRef.current = false
      objectDragRef.current = null
      objectDragSuppressClickRef.current = false
      clearObjectDragRelease()
      setDragCollaboration(null)
      workspaceCoordinationRef.current = null
      setWorkspaceCoordination(null)
    }

    const onWindowPointerOut = (event: PointerEvent) => {
      if (event.relatedTarget) {
        return
      }

      const directionX = interactionRef.current.eyeX
      const directionY = interactionRef.current.eyeY
      const magnitude = Math.hypot(directionX, directionY)

      onWindowBlur()

      if (magnitude > 0.05) {
        interactionRef.current.pointerDeparture = 1
        interactionRef.current.pointerDepartureX = directionX / magnitude
        interactionRef.current.pointerDepartureY = directionY / magnitude
      }
    }

    const onWindowClick = (event: MouseEvent) => {
      if (objectDragSuppressClickRef.current) {
        return
      }

      const target = event.target

      if (!(target instanceof Element) || actorRef.current?.contains(target)) {
        return
      }

      const anchor = adapterRef.current.anchorFromElement(target)

      if (anchor) {
        clearHoverIntent(false)
        previewActiveRef.current = false
        activatedAnchorKeyRef.current = anchorKey(anchor)
        activeAnchorRef.current = anchor
        setFocusTarget(anchor.target)
        const destination = pointNearAnchor(anchor, BASIL_ACTOR_SIZE, viewportSize())

        const movementRequired =
          Math.hypot(destination.x - motionRef.current.position.x, destination.y - motionRef.current.position.y) > 2 ||
          Math.hypot(motionRef.current.velocity.x, motionRef.current.velocity.y) > 12

        setFocusPhase(movementRequired ? 'approach' : 'engaged')

        if (!movementRequired) {
          wasTravelingRef.current = false
          interactionRef.current.landing = 0
        }

        const result = recordBasilAttention(
          attentionRef.current,
          anchor.target,
          destination,
          motionRef.current.position
        )

        attentionRef.current = result.memory
        const handoffPayload = createBasilHandoffPayload(result.transition.previousTarget, anchor.target)

        queueTravel(destination, adapterRef.current.snapshotAnchors(), anchor)

        const actorCenter = {
          x: destination.x + BASIL_ACTOR_SIZE.width / 2,
          y: destination.y + BASIL_ACTOR_SIZE.height / 2
        }

        const affordance = deriveBasilObjectAffordance(
          anchor.target,
          anchor.rect,
          { x: event.clientX, y: event.clientY },
          actorCenter
        )

        setFocusAffordance(affordance)
        setFocusDirection(affordance.direction)
        Object.assign(interactionRef.current, {
          familiarity: result.transition.familiarity,
          handoff: 1,
          handoffSource: handoffPayload?.source ?? null,
          handoffTarget: handoffPayload?.target ?? null,
          novelty: result.transition.novelty,
          reaction: 0.55 + result.transition.novelty * 0.3,
          travelX: result.transition.direction.x,
          travelY: result.transition.direction.y
        })
      } else {
        clearHoverIntent(true)
      }
    }

    const onWindowPointerUp = (event: PointerEvent) => {
      const drag = objectDragRef.current

      if (!drag || drag.pointerId !== event.pointerId) {
        return
      }

      objectDragRef.current = null

      if (!drag.active) {
        return
      }

      const point = { x: event.clientX, y: event.clientY }
      const distance = Math.hypot(point.x - drag.start.x, point.y - drag.start.y)

      const pose = deriveBasilDragCollaboration({
        actor: {
          ...motionRef.current.position,
          height: BASIL_ACTOR_SIZE.height,
          width: BASIL_ACTOR_SIZE.width
        },
        distance,
        phase: 'release',
        pointer: point,
        target: drag.anchor.target,
        velocity: { x: 0, y: 0 },
        workArea: { height: viewportSize().height, width: viewportSize().width, x: 0, y: 0 }
      })

      objectDragSuppressClickRef.current = true
      setDragCollaboration(pose)
      setFocusDirection({ x: pose.gazeX, y: pose.gazeY })
      interactionRef.current.press = 0
      interactionRef.current.travel = 0
      interactionRef.current.landing = 0.72
      interactionRef.current.reaction = 1
      persistPosition(targetRef.current)
      clearObjectDragRelease()
      objectDragReleaseTimerRef.current = window.setTimeout(() => {
        objectDragReleaseTimerRef.current = null
        objectDragSuppressClickRef.current = false
        setDragCollaboration(null)
      }, 760)
    }

    const onResize = () => {
      const viewport = viewportSize()
      targetRef.current = clampBasilPoint(targetRef.current, BASIL_ACTOR_SIZE, viewport)
      finalTargetRef.current = clampBasilPoint(finalTargetRef.current, BASIL_ACTOR_SIZE, viewport)
      waypointQueueRef.current = waypointQueueRef.current.map(point =>
        clampBasilPoint(point, BASIL_ACTOR_SIZE, viewport)
      )
      motionRef.current = {
        ...motionRef.current,
        position: clampBasilPoint(motionRef.current.position, BASIL_ACTOR_SIZE, viewport)
      }
    }

    window.addEventListener('blur', onWindowBlur)
    window.addEventListener('click', onWindowClick, true)
    window.addEventListener('pointerdown', onWindowPointerDown, true)
    window.addEventListener('pointermove', onWindowPointerMove, { passive: true })
    window.addEventListener('pointerout', onWindowPointerOut)
    window.addEventListener('pointerup', onWindowPointerUp, true)
    window.addEventListener('pointercancel', onWindowPointerUp, true)
    window.addEventListener('resize', onResize)

    return () => {
      clearHoverIntent(false)
      clearObjectDragRelease()
      window.removeEventListener('blur', onWindowBlur)
      window.removeEventListener('click', onWindowClick, true)
      window.removeEventListener('pointerdown', onWindowPointerDown, true)
      window.removeEventListener('pointermove', onWindowPointerMove)
      window.removeEventListener('pointerout', onWindowPointerOut)
      window.removeEventListener('pointerup', onWindowPointerUp, true)
      window.removeEventListener('pointercancel', onWindowPointerUp, true)
      window.removeEventListener('resize', onResize)
    }
  }, [queueTravel])

  const onPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()

    actorDragSuppressClickRef.current = false
    dragRef.current = {
      dx: event.clientX - rect.left,
      dy: event.clientY - rect.top,
      moved: false,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY
    }
    interactionRef.current.actorHold = 1
    interactionRef.current.actorRelease = 0
    interactionRef.current.hover = 1
    interactionRef.current.press = 1
    setFocusPhase('engaged')
    waypointQueueRef.current = []
    finalTargetRef.current = motionRef.current.position
    targetRef.current = motionRef.current.position
    event.currentTarget.setPointerCapture(event.pointerId)
    event.currentTarget.style.cursor = 'grabbing'
    event.stopPropagation()
  }

  const onPointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current

    if (!drag || drag.pointerId !== event.pointerId) {
      return
    }

    drag.moved ||= Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > 3

    const next = clampBasilPoint(
      { x: event.clientX - drag.dx, y: event.clientY - drag.dy },
      BASIL_ACTOR_SIZE,
      viewportSize()
    )

    waypointQueueRef.current = []
    finalTargetRef.current = next
    targetRef.current = next
  }

  const onPointerUp = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current

    if (drag?.pointerId === event.pointerId) {
      persistPosition(targetRef.current)
      dragRef.current = null

      if (drag.moved) {
        actorDragSuppressClickRef.current = true
        window.setTimeout(() => {
          actorDragSuppressClickRef.current = false
        }, 0)
      }
    }

    interactionRef.current.actorHold = 0
    interactionRef.current.actorRelease = 1
    interactionRef.current.press = 0
    interactionRef.current.hover = event.currentTarget.matches(':hover') ? 1 : 0
    interactionRef.current.reaction = 1
    event.currentTarget.releasePointerCapture?.(event.pointerId)
    event.currentTarget.style.cursor = 'grab'
    event.stopPropagation()
  }

  return {
    actorRef,
    dragCollaboration,
    focusAffordance,
    focusDirection,
    focusPhase,
    focusTarget,
    interactionRef,
    onClick: () => {
      if (actorDragSuppressClickRef.current) {
        actorDragSuppressClickRef.current = false

        return
      }

      interactionRef.current.affection = 1
      interactionRef.current.reaction = 1
    },
    onDoubleClick: () => {
      interactionRef.current.affection = 0
      interactionRef.current.pointerBoop = 1
      interactionRef.current.reaction = 1
    },
    onPointerCancel: onPointerUp,
    onPointerDown,
    onPointerEnter: () => {
      interactionRef.current.hover = 1
    },
    onPointerLeave: () => {
      if (!dragRef.current) {
        interactionRef.current.hover = 0
      }
    },
    onPointerMove,
    onPointerUp,
    onWheel: event => {
      interactionRef.current.affection = 0
      interactionRef.current.pointerTickle = Math.min(1, interactionRef.current.pointerTickle + 0.62)
      interactionRef.current.pointerTickleDirection = Math.sign(event.deltaY || event.deltaX || 1)
      interactionRef.current.reaction = 1
      event.stopPropagation()
    },
    position,
    workspaceCoordination
  }
}
