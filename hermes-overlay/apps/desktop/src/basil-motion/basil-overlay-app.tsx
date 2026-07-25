import { useStore } from '@nanostores/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { applyBasilAmbientWakeState } from './ambient-wake'
import { BasilAmbientWakeIndicator } from './ambient-wake-indicator'
import { createBasilAttentionMemory, recordBasilAttention } from './attention-engine'
import { BasilOrb } from './basil-orb'
import type { BasilDragCollaborationPose } from './drag-collaboration-engine'
import { BASIL_STATE_TARGETS } from './engine'
import type { BasilExternalActivityInput } from './external-activity-engine'
import { createBasilHandoffPayload } from './handoff-engine'
import { type BasilObjectAffordance, deriveBasilObjectAffordance } from './object-affordance'
import { applyBasilPersonalityToFrame } from './personality-engine'
import { createBasilPointerGestureTracker, sampleBasilPointerGesture } from './pointer-gestures'
import { createBasilPointerKineticsTracker, sampleBasilPointerKinetics } from './pointer-kinetics'
import { planBasilPointerNudge } from './pointer-nudge-engine'
import { applyBasilPresenceSnapshot } from './presence'
import { BasilPresenceCue } from './presence-cue'
import { applyBasilSceneChoreography, type BasilScenePhase } from './scene-choreography'
import { type BasilPoint, pointerDirection, pointInsideRect, sceneTargetForSnapshot } from './spatial-engine'
import { $basilParameterOverrides, $basilPersonalityMode, $basilSceneOverride, $basilSnapshot } from './store'
import type { BasilInteractionInput, BasilSceneTarget } from './types'
import { useBasilFrame } from './use-basil-frame'
import { useBasilPersonality } from './use-basil-personality'
import { useBasilPresence } from './use-basil-presence'
import {
  type BasilWorkspaceCoordinationPose,
  type BasilWorkspaceRect,
  deriveBasilWorkspaceCoordination
} from './workspace-coordination-engine'

const ACTOR_SIZE = 120

interface DragState {
  height: number
  moved: boolean
  offsetX: number
  offsetY: number
  startX: number
  startY: number
  width: number
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

export function BasilOverlayApp() {
  const snapshot = useStore($basilSnapshot)
  const overrides = useStore($basilParameterOverrides)
  const personalityMode = useStore($basilPersonalityMode)
  const sceneOverride = useStore($basilSceneOverride)
  const presence = useBasilPresence()
  const interactionRef = useRef<BasilInteractionInput>({ ...EMPTY_INTERACTION })
  const attentionRef = useRef(createBasilAttentionMemory())
  const pointerGestureRef = useRef(createBasilPointerGestureTracker())
  const pointerKineticsRef = useRef(createBasilPointerKineticsTracker())
  const ignoreMouseRef = useRef<boolean | null>(null)
  const actorRef = useRef<HTMLButtonElement | null>(null)
  const dragRef = useRef<DragState | null>(null)
  const nudgePendingRef = useRef(false)
  const nudgeRequestRef = useRef(0)
  const externalActivityTimerRef = useRef<number | null>(null)
  const externalTravelRef = useRef(false)
  const externalPhaseRef = useRef<BasilScenePhase>('engaged')
  const externalTargetRef = useRef<BasilSceneTarget | null>(null)
  const externalBoundsRef = useRef<BasilWorkspaceRect | null>(null)
  const dragCollaborationRef = useRef<BasilDragCollaborationPose | null>(null)
  const workspaceCoordinationRef = useRef<BasilWorkspaceCoordinationPose | null>(null)
  const lastWorkspaceYieldAtRef = useRef(0)
  const snapshotKeyRef = useRef('')
  const snapshotRef = useRef(snapshot)
  const presencePhaseRef = useRef(presence.phase)

  const [externalActivationSource, setExternalActivationSource] = useState<
    'agent-event' | 'collection' | 'content' | 'control' | 'invocation' | 'keyboard' | 'pointer' | 'selection' | null
  >(null)

  const [dragCollaboration, setDragCollaboration] = useState<BasilDragCollaborationPose | null>(null)
  const [externalActivity, setExternalActivity] = useState<BasilExternalActivityInput | null>(null)

  const [externalMovementReason, setExternalMovementReason] = useState<
    'activity' | 'assist' | 'follow' | 'visit' | null
  >(null)

  const [externalTarget, setExternalTarget] = useState<BasilSceneTarget | null>(null)
  const [externalPhase, setExternalPhase] = useState<BasilScenePhase>('engaged')
  const [focusAffordance, setFocusAffordance] = useState<BasilObjectAffordance | null>(null)
  const [focusDirection, setFocusDirection] = useState({ x: 1, y: 0 })
  const [surfaceProgress, setSurfaceProgress] = useState<number | null>(null)
  const [surfaceScrollDirection, setSurfaceScrollDirection] = useState(0)

  const [workspaceCoordination, setWorkspaceCoordination] = useState<BasilWorkspaceCoordinationPose | null>(null)

  const focusTarget = externalTarget ?? sceneOverride ?? sceneTargetForSnapshot(snapshot)
  const focusTargetRef = useRef(focusTarget)

  externalPhaseRef.current = externalPhase
  externalTargetRef.current = externalTarget
  focusTargetRef.current = focusTarget
  snapshotRef.current = snapshot
  presencePhaseRef.current = presence.phase

  const taskEvent =
    (!externalTarget || externalActivationSource === 'agent-event') && snapshot.lastEvent?.scene?.target === focusTarget
      ? snapshot.lastEvent
      : undefined

  const stableOverrides = useMemo(
    () =>
      applyBasilSceneChoreography(
        { ...BASIL_STATE_TARGETS[snapshot.state], ...overrides },
        focusTarget,
        externalTarget ? externalPhase : 'engaged',
        focusDirection.x
      ),
    [externalPhase, externalTarget, focusDirection.x, focusTarget, overrides, snapshot.state]
  )

  const frame = useBasilFrame(
    snapshot.state,
    stableOverrides,
    interactionRef,
    snapshot.interaction,
    presence.phase === 'hidden'
  )

  const personalityHostSignal = useMemo(
    () =>
      externalMovementReason === 'follow'
        ? {
            key: `${externalTarget}:${externalPhase}:${externalActivity?.kind ?? ''}:${surfaceProgress ?? ''}`,
            kind: 'surface_move' as const,
            side: focusDirection.x < 0 ? (-1 as const) : (1 as const)
          }
        : surfaceScrollDirection !== 0
          ? {
              key: `${externalTarget}:${surfaceProgress ?? ''}:${surfaceScrollDirection}`,
              kind: 'scroll' as const,
              side: focusDirection.x < 0 ? (-1 as const) : (1 as const)
            }
          : null,
    [
      externalActivity?.kind,
      externalMovementReason,
      externalPhase,
      externalTarget,
      focusDirection.x,
      surfaceProgress,
      surfaceScrollDirection
    ]
  )

  const personality = useBasilPersonality({
    dragCollaboration,
    focusPhase: externalTarget ? externalPhase : 'engaged',
    focusSide: focusDirection.x < 0 ? -1 : 1,
    focusTarget,
    hostSignal: personalityHostSignal,
    mode: personalityMode,
    paused: presence.phase === 'hidden',
    snapshot,
    workspaceObjectCount: externalTarget ? 1 : 0
  })

  const renderedFrame = applyBasilPersonalityToFrame(frame, personality.pose)

  const setMousePassthrough = (ignore: boolean) => {
    const shouldIgnore =
      dragCollaborationRef.current?.active || workspaceCoordinationRef.current?.active ? true : ignore

    if (ignoreMouseRef.current === shouldIgnore) {
      return
    }

    ignoreMouseRef.current = shouldIgnore
    window.hermesDesktop?.basilOverlay?.setIgnoreMouse(shouldIgnore)
  }

  const pointerInsideAmbientIndicator = (point: BasilPoint, screenSpace = false) => {
    const indicator = document.querySelector<HTMLElement>('[data-basil-ambient-wake-indicator]')

    if (!indicator) {
      return false
    }

    const rect = indicator.getBoundingClientRect()

    return pointInsideRect(point, {
      height: rect.height,
      width: rect.width,
      x: rect.left + (screenSpace ? window.screenX : 0),
      y: rect.top + (screenSpace ? window.screenY : 0)
    })
  }

  const cancelOverlayNudge = useCallback(() => {
    if (nudgePendingRef.current) {
      nudgePendingRef.current = false
      nudgeRequestRef.current += 1
      interactionRef.current.travel = 0
      window.hermesDesktop?.basilOverlay?.cancelNudge()
    }
  }, [])

  const clearExternalActivity = useCallback(() => {
    if (externalActivityTimerRef.current !== null) {
      window.clearTimeout(externalActivityTimerRef.current)
      externalActivityTimerRef.current = null
    }

    setExternalActivity(null)
  }, [])

  const startOverlayNudge = useCallback(
    (destination: BasilPoint, direction: BasilPoint, reason?: 'assist') => {
      const api = window.hermesDesktop?.basilOverlay

      if (!api?.nudge) {
        return
      }

      cancelOverlayNudge()
      const requestId = nudgeRequestRef.current + 1

      nudgeRequestRef.current = requestId
      nudgePendingRef.current = true

      Object.assign(interactionRef.current, {
        handoff: 0,
        handoffSource: null,
        handoffTarget: null,
        landing: 0,
        novelty: 0,
        reaction: 1,
        travelX: direction.x,
        travelY: direction.y
      })

      const request = reason ? { destination, reason } : { destination }

      void api
        .nudge(request)
        .then(result => {
          if (nudgeRequestRef.current !== requestId) {
            return
          }

          nudgePendingRef.current = false

          if (result.ok) {
            Object.assign(interactionRef.current, {
              landing: 1,
              reaction: 1,
              travel: 0
            })
          } else {
            interactionRef.current.travel = 0
          }
        })
        .catch(() => {
          if (nudgeRequestRef.current === requestId) {
            nudgePendingRef.current = false
            interactionRef.current.landing = 0
            interactionRef.current.travel = 0
          }
        })
    },
    [cancelOverlayNudge]
  )

  useEffect(() => {
    const api = window.hermesDesktop?.basilOverlay

    const unsubscribeState = api?.onState(payload => {
      const snapshotKey = JSON.stringify([
        payload.snapshot.state,
        payload.snapshot.lastEvent?.id,
        payload.snapshot.lastEvent?.kind,
        payload.snapshot.lastEvent?.label,
        payload.snapshot.lastEvent?.scene?.target,
        payload.snapshot.interaction?.nonce
      ])

      if (snapshotKeyRef.current && snapshotKeyRef.current !== snapshotKey) {
        cancelOverlayNudge()
        clearExternalActivity()
        externalPhaseRef.current = 'engaged'
        externalTargetRef.current = null
        externalBoundsRef.current = null
        setExternalActivationSource(null)
        setExternalMovementReason(null)
        setExternalTarget(null)
        setExternalPhase('engaged')
        setFocusAffordance(null)
        setSurfaceProgress(null)
        setSurfaceScrollDirection(0)
        dragCollaborationRef.current = null
        setDragCollaboration(null)
        workspaceCoordinationRef.current = null
        setWorkspaceCoordination(null)
      }

      snapshotKeyRef.current = snapshotKey
      $basilSnapshot.set(payload.snapshot)
      $basilParameterOverrides.set(payload.overrides ?? {})
      $basilSceneOverride.set(payload.sceneOverride ?? null)

      if (payload.presence) {
        applyBasilPresenceSnapshot(payload.presence)
      }

      if (payload.ambientWake && typeof payload.ambientWakeEnabled === 'boolean') {
        applyBasilAmbientWakeState(payload.ambientWakeEnabled, payload.ambientWake)
      }
    })

    const unsubscribeExternalTarget = api?.onExternalTarget(payload => {
      const resetExternalTarget = () => {
        externalPhaseRef.current = 'engaged'
        externalTargetRef.current = null
        externalBoundsRef.current = null
        setExternalActivationSource(null)
        setExternalMovementReason(null)
        setExternalTarget(null)
        setExternalPhase('engaged')
        setFocusAffordance(null)
        setSurfaceProgress(null)
        setSurfaceScrollDirection(0)
        dragCollaborationRef.current = null
        setDragCollaboration(null)
        workspaceCoordinationRef.current = null
        setWorkspaceCoordination(null)
        externalTravelRef.current = false
        interactionRef.current.landing = 0
        interactionRef.current.press = 0
      }

      if (payload.phase === 'dismissed') {
        cancelOverlayNudge()
        clearExternalActivity()

        if (payload.intent === 'dismiss') {
          externalPhaseRef.current = 'engaged'
          externalTargetRef.current = payload.target
          externalBoundsRef.current = payload.bounds
          setExternalActivationSource(payload.activationSource ?? 'pointer')
          setExternalMovementReason('activity')
          setExternalTarget(payload.target)
          setExternalPhase('engaged')
          setExternalActivity({
            intensity: payload.activityIntensity ?? 1,
            kind: 'departing',
            motionPhase: 0,
            target: payload.target
          })
          externalActivityTimerRef.current = window.setTimeout(() => {
            externalActivityTimerRef.current = null
            setExternalActivity(null)
            resetExternalTarget()
          }, 760)

          return
        }

        resetExternalTarget()

        return
      }

      if (payload.phase === 'preview' && nudgePendingRef.current) {
        return
      }

      cancelOverlayNudge()

      if (
        payload.intent === 'adjustment' ||
        payload.intent === 'input' ||
        payload.intent === 'invocation' ||
        payload.intent === 'move' ||
        payload.intent === 'resize' ||
        payload.intent === 'selection' ||
        payload.intent === 'structure'
      ) {
        clearExternalActivity()
        setExternalActivity({
          intensity: payload.activityIntensity ?? 0.25,
          kind:
            payload.intent === 'selection'
              ? 'selecting'
              : payload.intent === 'adjustment'
                ? 'adjusting'
                : payload.intent === 'invocation'
                  ? 'invoking'
                  : payload.intent === 'move'
                    ? 'surfing'
                    : payload.intent === 'resize'
                      ? 'resizing'
                      : payload.intent === 'structure'
                        ? 'organizing'
                        : 'typing',
          motionPhase: 0,
          target: payload.target,
          variant: payload.activityVariant,
          ...(payload.intent === 'move'
            ? {
                directionX: payload.routeDirection?.x ?? 0,
                directionY: payload.routeDirection?.y ?? 0
              }
            : {})
        })
        externalActivityTimerRef.current = window.setTimeout(
          () => {
            externalActivityTimerRef.current = null
            setExternalActivity(null)
          },
          payload.intent === 'selection'
            ? 900
            : payload.intent === 'structure'
              ? 840
              : payload.intent === 'invocation'
                ? 720
                : payload.intent === 'move'
                  ? 780
                  : payload.intent === 'resize'
                    ? 920
                    : payload.intent === 'adjustment'
                      ? 760
                      : 520
        )
      } else {
        clearExternalActivity()
      }

      const nextPhase =
        payload.phase === 'travel' || payload.phase === 'follow'
          ? 'approach'
          : payload.phase === 'preview'
            ? 'preview'
            : payload.phase === 'traverse'
              ? 'traverse'
              : 'engaged'

      externalPhaseRef.current = nextPhase
      externalTargetRef.current = payload.target
      externalBoundsRef.current = payload.bounds
      setExternalActivationSource(payload.activationSource ?? 'pointer')
      setExternalMovementReason(payload.movementReason ?? 'visit')
      setExternalTarget(payload.target)
      setExternalPhase(nextPhase)
      setSurfaceProgress(payload.scrollY ?? payload.scrollX ?? null)
      setSurfaceScrollDirection(payload.scrollDeltaY ?? payload.scrollDeltaX ?? 0)
      dragCollaborationRef.current = payload.collaboration ?? null
      setDragCollaboration(payload.collaboration ?? null)
      workspaceCoordinationRef.current = null
      setWorkspaceCoordination(null)
      setMousePassthrough(true)
      externalTravelRef.current =
        payload.phase === 'travel' ||
        payload.phase === 'follow' ||
        payload.phase === 'traverse' ||
        payload.phase === 'dragging'
      interactionRef.current.travel =
        payload.phase === 'travel'
          ? 0.9
          : payload.phase === 'follow'
            ? 0.72
            : payload.phase === 'traverse'
              ? 0.48
              : payload.phase === 'dragging'
                ? Math.max(0.42, (payload.collaboration?.strength ?? 0) * 0.68)
                : 0
      interactionRef.current.press = payload.collaboration?.grip ?? 0

      if (payload.routeDirection) {
        interactionRef.current.travelX = payload.routeDirection.x
        interactionRef.current.travelY = payload.routeDirection.y
      }

      if (payload.phase === 'travel' || payload.phase === 'follow' || payload.phase === 'traverse') {
        interactionRef.current.landing = 0
      } else if (payload.phase === 'landed') {
        interactionRef.current.landing = 1
      }

      const targetCenter = {
        x: payload.bounds.x + payload.bounds.width / 2,
        y: payload.bounds.y + payload.bounds.height / 2
      }

      const overlayCenter = {
        x: window.screenX + window.outerWidth / 2,
        y: window.screenY + window.outerHeight / 2
      }

      const affordance = deriveBasilObjectAffordance(payload.target, payload.bounds, payload.point, overlayCenter)

      setFocusAffordance(affordance)
      setFocusDirection(affordance.direction)

      if (payload.phase === 'travel' && (payload.routeStep ?? 0) === 0) {
        const result = recordBasilAttention(attentionRef.current, payload.target, targetCenter, overlayCenter)
        const handoffPayload = createBasilHandoffPayload(result.transition.previousTarget, payload.target)

        attentionRef.current = result.memory
        Object.assign(interactionRef.current, {
          familiarity: result.transition.familiarity,
          handoff: 1,
          handoffSource: handoffPayload?.source ?? null,
          handoffTarget: handoffPayload?.target ?? null,
          novelty: result.transition.novelty,
          reaction: 0.28 + result.transition.novelty * 0.18,
          travelX: result.transition.direction.x,
          travelY: result.transition.direction.y
        })

        if (payload.routeDirection) {
          interactionRef.current.travelX = payload.routeDirection.x
          interactionRef.current.travelY = payload.routeDirection.y
        }
      } else if (
        payload.intent === 'adjustment' ||
        payload.intent === 'input' ||
        payload.intent === 'selection' ||
        payload.intent === 'structure'
      ) {
        interactionRef.current.reaction = Math.max(
          (payload.intent === 'selection'
            ? 0.52
            : payload.intent === 'structure'
              ? 0.5
              : payload.intent === 'adjustment'
                ? 0.48
                : 0.42) +
            (payload.activityIntensity ?? 0.25) * 0.34,
          interactionRef.current.reaction
        )
      } else if (payload.movementReason === 'follow') {
        interactionRef.current.reaction = Math.max(0.24, interactionRef.current.reaction)
      } else if (payload.phase === 'travel') {
        interactionRef.current.reaction = Math.max(0.28, interactionRef.current.reaction)
      } else if (payload.phase === 'preview') {
        interactionRef.current.reaction = Math.max(0.18, interactionRef.current.reaction)
      } else if (payload.phase === 'traverse') {
        interactionRef.current.reaction = Math.max(0.36, interactionRef.current.reaction)
      } else if (payload.phase === 'dragging') {
        interactionRef.current.reaction = Math.max(
          payload.collaboration?.strength ?? 0.48,
          interactionRef.current.reaction
        )
      } else if (payload.phase === 'dropped') {
        interactionRef.current.reaction = Math.max(0.82, interactionRef.current.reaction)
        interactionRef.current.landing = 0.72
      } else {
        interactionRef.current.reaction = 0.65 + interactionRef.current.novelty * 0.35
        interactionRef.current.handoff = Math.max(0.55, interactionRef.current.handoff)
      }
    })

    api?.control({ type: 'ready' })

    return () => {
      unsubscribeState?.()
      unsubscribeExternalTarget?.()
      cancelOverlayNudge()
      clearExternalActivity()
    }
  }, [cancelOverlayNudge, clearExternalActivity])

  useEffect(() => {
    setMousePassthrough(true)

    const onMouseMove = (event: MouseEvent) => {
      if (presencePhaseRef.current !== 'visible') {
        setMousePassthrough(!pointerInsideAmbientIndicator({ x: event.clientX, y: event.clientY }))

        return
      }

      const actor = actorRef.current

      if (!actor) {
        return
      }

      const rect = actor.getBoundingClientRect()

      const inside = pointInsideRect(
        { x: event.clientX, y: event.clientY },
        { height: rect.height, width: rect.width, x: rect.left, y: rect.top }
      )

      Object.assign(
        interactionRef.current,
        pointerDirection(
          { x: event.clientX, y: event.clientY },
          { x: rect.left, y: rect.top },
          { height: rect.height, width: rect.width },
          { height: window.innerHeight, width: window.innerWidth }
        ),
        { active: true, hover: inside ? 1 : 0 }
      )
      const indicatorInside = pointerInsideAmbientIndicator({ x: event.clientX, y: event.clientY })

      setMousePassthrough(!inside && !indicatorInside && !dragRef.current)
    }

    window.addEventListener('mousemove', onMouseMove)

    return () => window.removeEventListener('mousemove', onMouseMove)
  }, [])

  useEffect(() => {
    const api = window.hermesDesktop?.basilOverlay

    if (!api?.getCursorPoint) {
      return
    }

    let cancelled = false
    let pending = false
    let cursorTimer: number | null = null

    const sampleDesktopCursor = async () => {
      if (pending) {
        return
      }

      pending = true

      try {
        const point = await api.getCursorPoint()
        const actor = actorRef.current

        if (!cancelled && actor) {
          const rect = actor.getBoundingClientRect()
          const actorPosition = { x: window.screenX + rect.left, y: window.screenY + rect.top }

          const inside = pointInsideRect(point, {
            height: rect.height,
            width: rect.width,
            x: actorPosition.x,
            y: actorPosition.y
          })

          const kinetics = sampleBasilPointerKinetics(
            pointerKineticsRef.current,
            point,
            { x: actorPosition.x + rect.width / 2, y: actorPosition.y + rect.height / 2 },
            performance.now()
          )

          const previousGesture = pointerGestureRef.current

          const gesture = sampleBasilPointerGesture(
            previousGesture,
            point,
            { x: actorPosition.x + rect.width / 2, y: actorPosition.y + rect.height / 2 },
            performance.now()
          )

          const swipeTriggered = gesture.tracker.lastSwipeAt > previousGesture.lastSwipeAt

          pointerKineticsRef.current = kinetics.tracker
          pointerGestureRef.current = gesture.tracker

          const passivePreview = Boolean(externalTargetRef.current) && externalPhaseRef.current === 'preview'
          let workspaceYielded = false
          const activeTarget = externalTargetRef.current
          const activeBounds = externalBoundsRef.current
          const now = performance.now()

          if (
            activeTarget &&
            activeBounds &&
            externalPhaseRef.current === 'engaged' &&
            !dragRef.current &&
            !dragCollaborationRef.current?.active &&
            !nudgePendingRef.current &&
            now - lastWorkspaceYieldAtRef.current >= 520
          ) {
            const desktopScreen = window.screen as Screen & {
              availLeft?: number
              availTop?: number
            }

            const workArea = {
              height: desktopScreen.availHeight || desktopScreen.height || 1080,
              width: desktopScreen.availWidth || desktopScreen.width || 1920,
              x: Number.isFinite(desktopScreen.availLeft) ? desktopScreen.availLeft! : 0,
              y: Number.isFinite(desktopScreen.availTop) ? desktopScreen.availTop! : 0
            }

            const pose = deriveBasilWorkspaceCoordination({
              actor: {
                height: rect.height,
                width: rect.width,
                x: actorPosition.x,
                y: actorPosition.y
              },
              frame: {
                height: Math.max(80, window.outerHeight || 196),
                width: Math.max(80, window.outerWidth || 196),
                x: window.screenX,
                y: window.screenY
              },
              gap: 20,
              phase: externalPhaseRef.current,
              pointer: point,
              target: activeBounds,
              targetType: activeTarget,
              workArea
            })

            if (pose.active) {
              lastWorkspaceYieldAtRef.current = now
              workspaceCoordinationRef.current = pose
              setWorkspaceCoordination(pose)
              setExternalMovementReason('assist')
              setFocusDirection({ x: pose.gazeX, y: pose.gazeY })
              setMousePassthrough(true)
              interactionRef.current.reaction = Math.max(interactionRef.current.reaction, pose.acknowledgment)
              startOverlayNudge({ x: pose.destination.x, y: pose.destination.y }, pose.travel, 'assist')
              workspaceYielded = true
            } else if (workspaceCoordinationRef.current) {
              workspaceCoordinationRef.current = null
              setWorkspaceCoordination(null)
            }
          }

          if (
            swipeTriggered &&
            !workspaceYielded &&
            !dragRef.current &&
            (!externalTargetRef.current || passivePreview)
          ) {
            const desktopScreen = window.screen as Screen & {
              availLeft?: number
              availTop?: number
            }

            const workAreaOrigin = {
              x: Number.isFinite(desktopScreen.availLeft) ? desktopScreen.availLeft! : 0,
              y: Number.isFinite(desktopScreen.availTop) ? desktopScreen.availTop! : 0
            }

            const overlaySize = {
              height: Math.max(80, window.outerHeight || 196),
              width: Math.max(80, window.outerWidth || 196)
            }

            const nudge = planBasilPointerNudge({
              actor: overlaySize,
              phase: 'engaged',
              position: {
                x: window.screenX - workAreaOrigin.x,
                y: window.screenY - workAreaOrigin.y
              },
              state: snapshotRef.current.state,
              strength: gesture.gesture.swipe,
              swipe: { x: gesture.gesture.swipeX, y: gesture.gesture.swipeY },
              target: focusTargetRef.current,
              viewport: {
                height: desktopScreen.availHeight || desktopScreen.height || 1080,
                width: desktopScreen.availWidth || desktopScreen.width || 1920
              }
            })

            if (nudge.accepted) {
              if (passivePreview) {
                externalPhaseRef.current = 'engaged'
                externalTargetRef.current = null
                externalTravelRef.current = false
                setExternalTarget(null)
                setExternalPhase('engaged')
                setFocusAffordance(null)
              }

              startOverlayNudge(
                {
                  x: nudge.destination.x + workAreaOrigin.x,
                  y: nudge.destination.y + workAreaOrigin.y
                },
                nudge.direction
              )
            }
          }

          const indicatorInside = pointerInsideAmbientIndicator(point, true)

          setMousePassthrough(!inside && !indicatorInside && !dragRef.current)
          Object.assign(
            interactionRef.current,
            pointerDirection(
              point,
              actorPosition,
              { height: rect.height, width: rect.width },
              { height: window.screen.height || 1080, width: window.screen.width || 1920 }
            ),
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
          interactionRef.current.travel =
            externalTravelRef.current || nudgePendingRef.current
              ? Math.max(0.72, interactionRef.current.travel)
              : interactionRef.current.travel * 0.72
          interactionRef.current.actorRelease *= 0.86
          interactionRef.current.pointerDeparture *= 0.88
          interactionRef.current.pointerBoop *= 0.84
          interactionRef.current.pointerTickle *= 0.86
          interactionRef.current.pointerReturn *= 0.86
          interactionRef.current.reaction *= 0.82
          interactionRef.current.handoff *= 0.965
          interactionRef.current.affection *= 0.957
          interactionRef.current.landing *= 0.86
        }
      } catch {
        // Cursor awareness is cosmetic; keep the overlay alive if IPC is lost.
      } finally {
        pending = false
      }
    }

    const pollDesktopCursor = async () => {
      await sampleDesktopCursor()

      if (!cancelled) {
        cursorTimer = window.setTimeout(pollDesktopCursor, presencePhaseRef.current === 'hidden' ? 160 : 50)
      }
    }

    void pollDesktopCursor()

    return () => {
      cancelled = true

      if (cursorTimer !== null) {
        window.clearTimeout(cursorTimer)
      }

      cancelOverlayNudge()
    }
  }, [cancelOverlayNudge, startOverlayNudge])

  const onPointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0 || dragCollaborationRef.current?.active || workspaceCoordinationRef.current?.active) {
      return
    }

    event.currentTarget.setPointerCapture(event.pointerId)
    cancelOverlayNudge()
    interactionRef.current.actorHold = 1
    interactionRef.current.actorRelease = 0
    interactionRef.current.press = 1
    dragRef.current = {
      height: window.outerHeight,
      moved: false,
      offsetX: event.screenX - window.screenX,
      offsetY: event.screenY - window.screenY,
      startX: event.screenX,
      startY: event.screenY,
      width: window.outerWidth
    }
  }

  const onPointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current

    if (!drag) {
      return
    }

    drag.moved ||= Math.hypot(event.screenX - drag.startX, event.screenY - drag.startY) > 3
    window.hermesDesktop?.basilOverlay?.setBounds({
      height: drag.height,
      width: drag.width,
      x: event.screenX - drag.offsetX,
      y: event.screenY - drag.offsetY
    })
  }

  const onPointerUp = (event: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current
    dragRef.current = null
    interactionRef.current.actorHold = 0
    interactionRef.current.actorRelease = 1
    interactionRef.current.press = 0
    interactionRef.current.reaction = 1
    event.currentTarget.releasePointerCapture?.(event.pointerId)

    if (!drag) {
      return
    }

    if (drag.moved) {
      window.hermesDesktop?.basilOverlay?.control({
        bounds: {
          height: drag.height,
          width: drag.width,
          x: event.screenX - drag.offsetX,
          y: event.screenY - drag.offsetY
        },
        type: 'bounds'
      })
    } else if (event.shiftKey) {
      window.hermesDesktop?.basilOverlay?.control({ type: 'pop-in' })
    } else {
      interactionRef.current.affection = 1
    }
  }

  return (
    <main
      className="grid h-screen w-screen place-items-center bg-transparent"
      data-basil-collaboration-phase={dragCollaboration?.phase ?? 'idle'}
      data-basil-external-activation={externalTarget ? (externalActivationSource ?? 'pointer') : 'none'}
      data-basil-external-activity={externalActivity?.kind ?? 'none'}
      data-basil-external-movement={externalTarget ? (externalMovementReason ?? 'visit') : 'none'}
      data-basil-external-phase={externalTarget ? externalPhase : 'none'}
      data-basil-focus-target={focusTarget}
      data-basil-personality-last-signal={personality.lastSignal ?? ''}
      data-basil-personality-signal-count={personality.signalCount}
      data-basil-presence={presence.phase}
      data-basil-surface-progress={externalTarget ? (surfaceProgress ?? '') : ''}
      data-basil-surface-scroll-direction={externalTarget ? surfaceScrollDirection : 0}
      data-basil-workspace-coordination={workspaceCoordination?.active ? 'yield' : 'none'}
    >
      <button
        aria-hidden={presence.phase === 'hidden'}
        aria-label={`Basil desktop overlay is ${snapshot.state}`}
        className="relative grid cursor-grab place-items-center border-0 bg-transparent p-0 text-foreground"
        data-basil-overlay-actor=""
        data-basil-presence={presence.phase}
        data-basil-presence-progress={presence.progress.toFixed(3)}
        onDoubleClick={() => {
          interactionRef.current.affection = 0
          interactionRef.current.pointerBoop = 1
          interactionRef.current.reaction = 1
          window.hermesDesktop?.basilOverlay?.control({ type: 'toggle-app' })
        }}
        onPointerCancel={onPointerUp}
        onPointerDown={onPointerDown}
        onPointerEnter={personality.onActorPointerEnter}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onWheel={event => {
          interactionRef.current.affection = 0
          interactionRef.current.pointerTickle = Math.min(1, interactionRef.current.pointerTickle + 0.62)
          interactionRef.current.pointerTickleDirection = Math.sign(event.deltaY || event.deltaX || 1)
          interactionRef.current.reaction = 1
          event.stopPropagation()
        }}
        ref={actorRef}
        style={{
          filter:
            presence.glow > 0.01
              ? `drop-shadow(0 0 ${Math.round(4 + presence.glow * 8)}px color-mix(in srgb, currentColor 30%, transparent))`
              : undefined,
          height: ACTOR_SIZE,
          opacity: presence.opacity,
          pointerEvents: presence.phase === 'visible' ? 'auto' : 'none',
          touchAction: 'none',
          transform: `translateY(${presence.translateY}px) rotate(${presence.rotation}deg) scale(${presence.scaleX}, ${presence.scaleY})`,
          transformOrigin: '50% 78%',
          width: ACTOR_SIZE
        }}
        tabIndex={presence.phase === 'visible' ? 0 : -1}
        type="button"
      >
        <BasilPresenceCue pose={presence} size={ACTOR_SIZE} />
        <BasilOrb
          dragCollaboration={dragCollaboration}
          externalActivity={externalActivity}
          focusAffordance={focusAffordance}
          focusDirection={focusDirection}
          focusIntensity={externalTarget && externalPhase === 'preview' ? 0.56 : 1}
          focusPhase={externalTarget ? externalPhase : 'engaged'}
          focusTarget={focusTarget}
          frame={renderedFrame}
          journey={snapshot.journey}
          personality={personality.pose}
          size={ACTOR_SIZE}
          taskKind={taskEvent?.kind}
          taskPhase={taskEvent?.scene?.taskPhase}
          workspaceCoordination={workspaceCoordination}
        />
      </button>
      <BasilAmbientWakeIndicator
        onDisable={() => window.hermesDesktop?.basilOverlay?.control({ type: 'ambient-wake-disable' })}
        x={(window.innerWidth - ACTOR_SIZE) / 2}
        y={(window.innerHeight - ACTOR_SIZE) / 2}
      />
    </main>
  )
}
