import { useEffect, useMemo, useRef, useState } from 'react'
import type { MutableRefObject } from 'react'

import { BASIL_STATE_TARGETS, interpolateBasilParameters } from './engine'
import { BASIL_INTERACTION_BY_ID, sampleBasilInteraction } from './interaction-pack'
import { applyBasilInteraction } from './spatial-engine'
import type {
  BasilInteractionInput,
  BasilInteractionPlayback,
  BasilMotionFrame,
  BasilParameters,
  BasilState
} from './types'

const TAU = Math.PI * 2

function proceduralBlink(state: BasilState, now: number, explicitBlink: number): number {
  if (state === 'sleeping') {
    return 1
  }

  if (explicitBlink > 0.35) {
    return explicitBlink
  }

  const phase = (now % 3900) / 3900
  const blink = phase > 0.965 ? Math.sin(((phase - 0.965) / 0.035) * Math.PI) : 0

  return Math.max(explicitBlink, blink)
}

function proceduralFloat(state: BasilState, now: number, amount: number): number {
  if (state === 'sleeping') {
    return Math.sin(now / 1500) * amount * 1.5
  }

  return Math.sin(now / (900 - amount * 300)) * amount
}

export function useBasilFrame(
  state: BasilState,
  overrides: Partial<BasilParameters> = {},
  interactionRef?: MutableRefObject<BasilInteractionInput>,
  playback?: BasilInteractionPlayback,
  paused = false
): BasilMotionFrame {
  const target = useMemo(() => ({ ...BASIL_STATE_TARGETS[state], ...overrides }), [overrides, state])
  const paramsRef = useRef<BasilParameters>(target)
  const lastRef = useRef(0)
  const playbackNonceRef = useRef<number | null>(null)
  const playbackStartedRef = useRef(0)
  const travelRef = useRef(0)
  const [frame, setFrame] = useState<BasilMotionFrame>({ ...target, state })

  useEffect(() => {
    if (paused) {
      lastRef.current = 0

      return
    }

    let raf = 0
    let cancelled = false

    const tick = (now: number) => {
      const last = lastRef.current || now
      const dt = now - last
      lastRef.current = now
      const definition = playback ? BASIL_INTERACTION_BY_ID.get(playback.id) : undefined

      if (playback && playbackNonceRef.current !== playback.nonce) {
        playbackNonceRef.current = playback.nonce
        playbackStartedRef.current = now - (definition?.durationMs ?? 0) * (playback.startProgress ?? 0)
      } else if (!playback) {
        playbackNonceRef.current = null
      }

      const choreography = definition ? sampleBasilInteraction(definition, now - playbackStartedRef.current) : undefined
      const choreographedTarget = choreography ? { ...target, ...choreography.parameters } : target

      const interactiveTarget = interactionRef
        ? applyBasilInteraction(choreographedTarget, interactionRef.current)
        : choreographedTarget

      const next = interpolateBasilParameters(paramsRef.current, interactiveTarget, dt)
      paramsRef.current = next

      const liveBlink = proceduralBlink(state, now, next.blink)
      const liveFloat = proceduralFloat(state, now, next.float)
      const liveRotation = next.rotation + Math.sin(now / 1300) * next.energy * 0.04
      const interaction = interactionRef?.current
      const travel = interaction?.travel ?? 0
      const travelAcceleration = dt > 0 ? Math.max(-1, Math.min(1, ((travel - travelRef.current) / dt) * 24)) : 0

      travelRef.current = travel

      setFrame({
        ...next,
        actorHold: interaction?.actorHold ?? 0,
        actorRelease: interaction?.actorRelease ?? 0,
        affection: interaction?.affection ?? 0,
        blink: liveBlink,
        familiarity: interaction?.familiarity ?? 0,
        float: liveFloat,
        handoff: interaction?.handoff ?? 0,
        handoffSource: interaction?.handoffSource ?? null,
        handoffTarget: interaction?.handoffTarget ?? null,
        interactionAccessory: choreography?.accessory,
        interactionBeat: choreography?.beat,
        interactionId: definition?.id,
        interactionProgress: choreography?.progress,
        interactionRotation: choreography?.rotation,
        interactionScaleX: choreography?.scaleX,
        interactionScaleY: choreography?.scaleY,
        interactionSide: choreography?.side,
        interactionX: choreography?.x,
        interactionY: choreography?.y,
        landing: interaction?.landing ?? 0,
        motionPhase: choreography?.progress ?? (now % 2400) / 2400,
        novelty: interaction?.novelty ?? 0,
        pointerApproach: interaction?.pointerApproach ?? 0,
        pointerActive: interaction?.active ?? false,
        pointerDeparture: interaction?.pointerDeparture ?? 0,
        pointerDepartureX: interaction?.pointerDepartureX ?? 0,
        pointerDepartureY: interaction?.pointerDepartureY ?? 0,
        pointerBoop: interaction?.pointerBoop ?? 0,
        pointerTickle: interaction?.pointerTickle ?? 0,
        pointerTickleDirection: interaction?.pointerTickleDirection ?? 0,
        pointerReturn: interaction?.pointerReturn ?? 0,
        pointerReturnX: interaction?.pointerReturnX ?? 0,
        pointerReturnY: interaction?.pointerReturnY ?? 0,
        pointerDwell: interaction?.pointerDwell ?? 0,
        pointerOrbit: interaction?.pointerOrbit ?? 0,
        pointerOrbitDirection: interaction?.pointerOrbitDirection ?? 0,
        pointerPet: interaction?.pointerPet ?? 0,
        pointerPetDirection: interaction?.pointerPetDirection ?? 0,
        pointerProximity: interaction?.proximity ?? 0,
        pointerSpeed: interaction?.pointerSpeed ?? 0,
        pointerVelocityX: interaction?.pointerVelocityX ?? 0,
        pointerVelocityY: interaction?.pointerVelocityY ?? 0,
        pointerSwipe: interaction?.pointerSwipe ?? 0,
        pointerSwipeX: interaction?.pointerSwipeX ?? 0,
        pointerSwipeY: interaction?.pointerSwipeY ?? 0,
        pointerX: interaction?.eyeX ?? 0,
        pointerY: interaction?.eyeY ?? 0,
        rotation: liveRotation,
        state,
        travel,
        travelAcceleration,
        travelX: interaction?.travelX ?? 0,
        travelY: interaction?.travelY ?? 0
      })

      if (!cancelled) {
        raf = requestAnimationFrame(tick)
      }
    }

    raf = requestAnimationFrame(tick)

    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
    }
  }, [interactionRef, paused, playback, state, target])

  return frame
}
