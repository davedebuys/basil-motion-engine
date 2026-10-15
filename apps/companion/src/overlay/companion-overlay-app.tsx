import { useStore } from '@nanostores/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  dispatchCompanionEvent,
  errorEvent,
  listenEvent,
  successEvent,
  thinkingEvent
} from '../adapters/companion'
import { BasilOrb } from '../basil-motion/basil-orb'
import { BASIL_STATE_TARGETS } from '../basil-motion/engine'
import {
  createBasilPointerGestureTracker,
  sampleBasilPointerGesture
} from '../basil-motion/pointer-gestures'
import {
  createBasilPointerKineticsTracker,
  sampleBasilPointerKinetics
} from '../basil-motion/pointer-kinetics'
import { BasilPresenceCue } from '../basil-motion/presence-cue'
import { applyBasilPersonalityToFrame } from '../basil-motion/personality-engine'
import { applyBasilSceneChoreography } from '../basil-motion/scene-choreography'
import { pointInsideRect, pointerDirection } from '../basil-motion/spatial-engine'
import {
  $basilParameterOverrides,
  $basilPersonalityMode,
  $basilSceneOverride,
  $basilSnapshot
} from '../basil-motion/store'
import type { BasilInteractionInput } from '../basil-motion/types'
import { useBasilFrame } from '../basil-motion/use-basil-frame'
import { useBasilPersonality } from '../basil-motion/use-basil-personality'
import { useBasilPresence } from '../basil-motion/use-basil-presence'

const ACTOR_SIZE = 120
const POLL_MS = 50
const FOCUS_DIRECTION = { x: 1, y: 0 } as const

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

interface DragState {
  height: number
  moved: boolean
  offsetX: number
  offsetY: number
  startX: number
  startY: number
  width: number
}

/**
 * The floating Basil window.
 *
 * Renders the vendored procedural SVG actor, polls the real OS cursor for gaze
 * and gesture reaction, supports drag, and exposes the hover chat button that
 * opens the panel. Chat activity arrives from the main process and is folded
 * into Basil's state through the host-neutral companion adapter.
 */
export function CompanionOverlayApp() {
  const snapshot = useStore($basilSnapshot)
  const overrides = useStore($basilParameterOverrides)
  const personalityMode = useStore($basilPersonalityMode)
  const sceneOverride = useStore($basilSceneOverride)
  const presence = useBasilPresence()

  const interactionRef = useRef<BasilInteractionInput>({ ...EMPTY_INTERACTION })
  const kineticsRef = useRef(createBasilPointerKineticsTracker())
  const gestureRef = useRef(createBasilPointerGestureTracker())
  const actorRef = useRef<HTMLButtonElement | null>(null)
  const dragRef = useRef<DragState | null>(null)
  const draggingRef = useRef(false)
  const ignoreMouseRef = useRef<boolean | null>(null)

  const [hovered, setHovered] = useState(false)

  // Object attention is neutral here: there is no external surface in phase 1,
  // so pointer gaze (eyeX/eyeY) alone drives where Basil looks.
  const focusDirection = FOCUS_DIRECTION
  const focusTarget = sceneOverride ?? 'conversation'

  const setMousePassthrough = useCallback((ignore: boolean) => {
    if (draggingRef.current) {
      ignore = false
    }

    if (ignoreMouseRef.current === ignore) {
      return
    }

    ignoreMouseRef.current = ignore
    window.basilCompanion?.overlay.setIgnoreMouse(ignore)
  }, [])

  // Fold chat events from the main process into Basil's state machine.
  useEffect(() => {
    const api = window.basilCompanion

    if (!api) {
      return
    }

    return api.chat.onEvent(event => {
      if (event.type === 'user_message') {
        dispatchCompanionEvent(listenEvent)
      } else if (event.type === 'assistant_start') {
        dispatchCompanionEvent(thinkingEvent)
      } else if (event.type === 'assistant_success') {
        dispatchCompanionEvent(successEvent)
      } else if (event.type === 'assistant_error') {
        dispatchCompanionEvent(errorEvent)
      }
    })
  }, [])

  // Poll the real OS cursor so Basil tracks the pointer across other apps.
  useEffect(() => {
    const api = window.basilCompanion

    if (!api?.overlay.cursorPoint) {
      return
    }

    let cancelled = false
    let pending = false
    let timer: number | null = null

    const sample = async () => {
      if (pending) {
        return
      }

      pending = true

      try {
        const point = await api.overlay.cursorPoint()
        const actor = actorRef.current

        if (!cancelled && actor) {
          const rect = actor.getBoundingClientRect()
          const actorPosition = { x: window.screenX + rect.left, y: window.screenY + rect.top }
          const center = { x: actorPosition.x + rect.width / 2, y: actorPosition.y + rect.height / 2 }
          const inside = pointInsideRect(point, {
            height: rect.height,
            width: rect.width,
            x: actorPosition.x,
            y: actorPosition.y
          })

          const kinetics = sampleBasilPointerKinetics(kineticsRef.current, point, center, performance.now())
          const gesture = sampleBasilPointerGesture(gestureRef.current, point, center, performance.now())

          kineticsRef.current = kinetics.tracker
          gestureRef.current = gesture.tracker

          Object.assign(
            interactionRef.current,
            pointerDirection(point, actorPosition, { height: rect.height, width: rect.width }, {
              height: window.screen.height || 1080,
              width: window.screen.width || 1920
            }),
            {
              active: true,
              hover: inside ? 1 : 0,
              pointerApproach: kinetics.kinetics.approach,
              pointerDwell: kinetics.kinetics.dwell,
              pointerOrbit: gesture.gesture.orbit,
              pointerOrbitDirection: gesture.gesture.orbitDirection,
              pointerPet: gesture.gesture.pet,
              pointerPetDirection: gesture.gesture.petDirection,
              pointerSpeed: kinetics.kinetics.speed,
              pointerSwipe: gesture.gesture.swipe,
              pointerSwipeX: gesture.gesture.swipeX,
              pointerSwipeY: gesture.gesture.swipeY,
              pointerVelocityX: kinetics.kinetics.velocityX,
              pointerVelocityY: kinetics.kinetics.velocityY
            }
          )

          setHovered(inside)
          setMousePassthrough(!inside && !dragRef.current)

          // Decay transient impulses so idle Basil settles back to rest.
          interactionRef.current.landing *= 0.86
          interactionRef.current.affection *= 0.957
          interactionRef.current.reaction *= 0.82
          interactionRef.current.pointerBoop *= 0.84
          interactionRef.current.pointerTickle *= 0.86
          interactionRef.current.pointerPet *= 0.9
          interactionRef.current.pointerOrbit *= 0.9
          interactionRef.current.pointerSwipe *= 0.9
          interactionRef.current.pointerApproach *= 0.9
          interactionRef.current.pointerDwell *= 0.92
          interactionRef.current.travel *= 0.72
        }
      } catch {
        // Cursor awareness is cosmetic; keep the overlay alive if IPC is lost.
      } finally {
        pending = false
      }
    }

    const poll = async () => {
      await sample()

      if (!cancelled) {
        timer = window.setTimeout(poll, POLL_MS)
      }
    }

    void poll()

    return () => {
      cancelled = true

      if (timer !== null) {
        window.clearTimeout(timer)
      }
    }
  }, [setMousePassthrough])

  const stableOverrides = useMemo(
    () =>
      applyBasilSceneChoreography(
        { ...BASIL_STATE_TARGETS[snapshot.state], ...overrides },
        focusTarget,
        'engaged',
        focusDirection.x
      ),
    [focusDirection.x, focusTarget, overrides, snapshot.state]
  )

  const frame = useBasilFrame(snapshot.state, stableOverrides, interactionRef, snapshot.interaction, false)

  const personality = useBasilPersonality({
    focusPhase: 'engaged',
    focusTarget,
    mode: personalityMode,
    paused: false,
    snapshot,
    workspaceObjectCount: 0
  })

  const renderedFrame = applyBasilPersonalityToFrame(frame, personality.pose)

  // --- window drag -------------------------------------------------------
  const onPointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) {
      return
    }

    event.currentTarget.setPointerCapture(event.pointerId)

    draggingRef.current = true

    dragRef.current = {
      height: window.outerHeight,
      moved: false,
      offsetX: event.screenX - window.screenX,
      offsetY: event.screenY - window.screenY,
      startX: event.screenX,
      startY: event.screenY,
      width: window.outerWidth
    }

    setMousePassthrough(false)
  }

  const onPointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current

    if (!drag) {
      return
    }

    drag.moved ||= Math.hypot(event.screenX - drag.startX, event.screenY - drag.startY) > 3

    window.basilCompanion?.overlay.setBounds({
      height: drag.height,
      width: drag.width,
      x: event.screenX - drag.offsetX,
      y: event.screenY - drag.offsetY
    })
  }

  const onPointerUp = (event: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current

    dragRef.current = null
    draggingRef.current = false

    interactionRef.current.actorHold = 0
    interactionRef.current.actorRelease = 1
    interactionRef.current.press = 0

    event.currentTarget.releasePointerCapture?.(event.pointerId)

    if (drag?.moved) {
      void window.basilCompanion?.overlay.saveBounds({
        height: drag.height,
        width: drag.width,
        x: event.screenX - drag.offsetX,
        y: event.screenY - drag.offsetY
      })
    } else {
      // A stationary click is affection — same contract as the original.
      interactionRef.current.affection = 1
      interactionRef.current.reaction = 1
    }

    setMousePassthrough(true)
  }

  return (
    <main className="relative grid h-screen w-screen place-items-center bg-transparent">
      <button
        aria-label={`Basil is ${snapshot.state}`}
        className="relative grid cursor-grab place-items-center border-0 bg-transparent p-0 text-foreground"
        onDoubleClick={() => void window.basilCompanion?.panel.toggle()}
        onPointerCancel={onPointerUp}
        onPointerDown={onPointerDown}
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
          transform: `translateY(${presence.translateY}px) rotate(${presence.rotation}deg) scale(${presence.scaleX}, ${presence.scaleY})`,
          transformOrigin: '50% 78%',
          width: ACTOR_SIZE
        }}
        title={`Basil: ${snapshot.state}`}
        type="button"
      >
        <BasilPresenceCue pose={presence} size={ACTOR_SIZE} />
        <BasilOrb
          focusDirection={focusDirection}
          focusPhase="engaged"
          focusTarget={focusTarget}
          frame={renderedFrame}
          journey={snapshot.journey}
          personality={personality.pose}
          size={ACTOR_SIZE}
          taskKind={snapshot.lastEvent?.kind}
          taskPhase={snapshot.lastEvent?.scene?.taskPhase}
        />
      </button>

      {/* Primary affordance: opens the companion panel. */}
      <button
        aria-label="Open Basil's companion panel"
        className="absolute bottom-3 left-1/2 grid size-8 -translate-x-1/2 place-items-center rounded-full border border-(--ui-stroke-secondary) bg-(--ui-bg-elevated) text-foreground shadow-md transition-opacity duration-200 hover:bg-(--ui-bg-hover) focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => void window.basilCompanion?.panel.open()}
        onContextMenu={event => {
          event.preventDefault()
          void window.basilCompanion?.panel.toggle()
        }}
        style={{ opacity: hovered ? 1 : 0, pointerEvents: hovered ? 'auto' : 'none' }}
        title="Open companion panel"
        type="button"
      >
        <ChatGlyph />
      </button>

      <IdleHint visible={!hovered} />
    </main>
  )
}

function ChatGlyph() {
  return (
    <svg aria-hidden fill="none" height="16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} viewBox="0 0 24 24" width="16">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}

function IdleHint({ visible }: { visible: boolean }) {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-(--ui-bg-elevated)/80 px-2 py-0.5 text-[10px] text-muted-foreground transition-opacity duration-500"
      style={{ opacity: visible ? 0.55 : 0 }}
    >
      hover to chat
    </span>
  )
}
