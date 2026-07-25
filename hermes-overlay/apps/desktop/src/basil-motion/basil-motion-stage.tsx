import { useStore } from '@nanostores/react'
import { useEffect, useMemo, useState } from 'react'

import {
  hermesBasilAnchorFromElement,
  snapshotHermesBasilAnchors,
  subscribeHermesBasilAnchorLayout
} from './adapters/hermes-scene'
import { BasilAmbientWakeIndicator } from './ambient-wake-indicator'
import { BasilDevPanel } from './basil-dev-panel'
import { BasilOrb } from './basil-orb'
import { $basilOverlayActive, popOutBasil } from './basil-overlay'
import { BASIL_STATE_TARGETS } from './engine'
import { applyBasilPersonalityToFrame } from './personality-engine'
import { deriveBasilPointOfInterest } from './point-of-interest-engine'
import { $basilPresenceAudio } from './presence-audio'
import { BasilPresenceCue } from './presence-cue'
import { applyBasilSceneChoreography } from './scene-choreography'
import {
  $basilParameterOverrides,
  $basilPersonalityMode,
  $basilPersonalityPreview,
  $basilSceneOverride,
  $basilSnapshot
} from './store'
import { useBasilFrame } from './use-basil-frame'
import { useBasilPersonality } from './use-basil-personality'
import { useBasilPresence } from './use-basil-presence'
import { BASIL_ACTOR_SIZE, useBasilSpatial } from './use-basil-spatial'

const HERMES_SPATIAL_ADAPTER = {
  anchorFromElement: hermesBasilAnchorFromElement,
  snapshotAnchors: snapshotHermesBasilAnchors,
  subscribeLayoutChanges: subscribeHermesBasilAnchorLayout
}

interface BasilMotionStageProps {
  devPanel?: boolean
}

export function BasilMotionStage({ devPanel = import.meta.env.MODE !== 'production' }: BasilMotionStageProps) {
  const snapshot = useStore($basilSnapshot)
  const overrides = useStore($basilParameterOverrides)
  const overlayActive = useStore($basilOverlayActive)
  const personalityMode = useStore($basilPersonalityMode)
  const personalityPreview = useStore($basilPersonalityPreview)
  const sceneOverride = useStore($basilSceneOverride)
  const presenceAudio = useStore($basilPresenceAudio)
  const presence = useBasilPresence()
  const motionPaused = presence.phase === 'hidden'
  const spatial = useBasilSpatial(snapshot, HERMES_SPATIAL_ADAPTER, motionPaused)
  const focusTarget = sceneOverride ?? spatial.focusTarget
  const taskEvent = snapshot.lastEvent?.scene?.target === focusTarget ? snapshot.lastEvent : undefined

  const [workspaceAnchors, setWorkspaceAnchors] = useState(() => HERMES_SPATIAL_ADAPTER.snapshotAnchors())

  useEffect(
    () =>
      HERMES_SPATIAL_ADAPTER.subscribeLayoutChanges(() =>
        setWorkspaceAnchors(HERMES_SPATIAL_ADAPTER.snapshotAnchors())
      ),
    []
  )

  const pointOfInterest = useMemo(
    () =>
      deriveBasilPointOfInterest({
        actor: { ...spatial.position, ...BASIL_ACTOR_SIZE },
        candidates: workspaceAnchors,
        preferredTarget: focusTarget,
        viewport: {
          height: typeof window === 'undefined' ? 900 : window.innerHeight,
          width: typeof window === 'undefined' ? 1440 : window.innerWidth
        }
      }),
    [focusTarget, spatial.position, workspaceAnchors]
  )

  const personality = useBasilPersonality({
    dragCollaboration: spatial.dragCollaboration,
    focusPhase: spatial.focusPhase,
    focusSide: spatial.focusDirection.x < 0 ? -1 : 1,
    focusTarget,
    mode: personalityMode,
    paused: motionPaused,
    preview: personalityPreview,
    snapshot,
    workspaceObjectCount: workspaceAnchors.length
  })

  const stableOverrides = useMemo(
    () =>
      applyBasilSceneChoreography(
        { ...BASIL_STATE_TARGETS[snapshot.state], ...overrides },
        focusTarget,
        'engaged',
        spatial.focusDirection.x
      ),
    [focusTarget, overrides, snapshot.state, spatial.focusDirection.x]
  )

  const frame = useBasilFrame(
    snapshot.state,
    stableOverrides,
    spatial.interactionRef,
    snapshot.interaction,
    motionPaused
  )

  const renderedFrame = applyBasilPersonalityToFrame(frame, personality.pose)
  const eventLabel = snapshot.lastEvent?.label || snapshot.lastEvent?.kind || 'ready'

  return (
    <>
      <div
        className="pointer-events-none fixed inset-0 z-60"
        data-basil-layer=""
        data-basil-personality-last-signal={personality.lastSignal ?? ''}
        data-basil-personality-signal-count={personality.signalCount}
        data-basil-presence={presence.phase}
        data-basil-presence-audio-count={presenceAudio.playCount}
        data-basil-presence-audio-cue={presenceAudio.lastCue ?? ''}
        data-basil-presence-audio-status={presenceAudio.status}
      >
        {!overlayActive && (
          <button
            aria-hidden={presence.phase === 'hidden'}
            aria-label={`Basil is ${snapshot.state}`}
            className="absolute grid cursor-grab place-items-center border-0 bg-transparent p-0 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
            data-basil-actor=""
            data-basil-presence={presence.phase}
            data-basil-presence-progress={presence.progress.toFixed(3)}
            onClick={spatial.onClick}
            onDoubleClick={spatial.onDoubleClick}
            onPointerCancel={spatial.onPointerCancel}
            onPointerDown={event => {
              if (event.shiftKey) {
                const rect = event.currentTarget.getBoundingClientRect()
                popOutBasil({ height: rect.height, width: rect.width, x: rect.left, y: rect.top })
                event.preventDefault()
                event.stopPropagation()

                return
              }

              spatial.onPointerDown(event)
            }}
            onPointerEnter={() => {
              spatial.onPointerEnter()
              personality.onActorPointerEnter()
            }}
            onPointerLeave={spatial.onPointerLeave}
            onPointerMove={spatial.onPointerMove}
            onPointerUp={spatial.onPointerUp}
            onWheel={spatial.onWheel}
            ref={spatial.actorRef}
            style={{
              filter:
                presence.glow > 0.01
                  ? `drop-shadow(0 0 ${Math.round(4 + presence.glow * 8)}px color-mix(in srgb, currentColor 30%, transparent))`
                  : undefined,
              height: BASIL_ACTOR_SIZE.height,
              left: spatial.position.x,
              opacity: presence.opacity,
              pointerEvents: presence.phase === 'visible' ? 'auto' : 'none',
              touchAction: 'none',
              top: spatial.position.y,
              transform: `translateY(${presence.translateY}px) rotate(${presence.rotation}deg) scale(${presence.scaleX}, ${presence.scaleY})`,
              transformOrigin: '50% 78%',
              width: BASIL_ACTOR_SIZE.width
            }}
            tabIndex={presence.phase === 'visible' ? 0 : -1}
            title={`Basil: ${snapshot.state}`}
            type="button"
          >
            <BasilPresenceCue pose={presence} size={BASIL_ACTOR_SIZE.width} />
            <BasilOrb
              dragCollaboration={spatial.dragCollaboration}
              focusAffordance={spatial.focusAffordance}
              focusDirection={spatial.focusDirection}
              focusPhase={spatial.focusPhase}
              focusTarget={focusTarget}
              frame={renderedFrame}
              journey={snapshot.journey}
              personality={personality.pose}
              pointOfInterest={pointOfInterest}
              size={BASIL_ACTOR_SIZE.width}
              taskKind={taskEvent?.kind}
              taskPhase={taskEvent?.scene?.taskPhase}
              workspaceCoordination={spatial.workspaceCoordination}
            />
          </button>
        )}
        {!overlayActive && <BasilAmbientWakeIndicator x={spatial.position.x} y={spatial.position.y} />}
      </div>

      {devPanel && (
        <aside className="pointer-events-auto fixed bottom-4 right-4 z-70 w-64 rounded border border-(--ui-stroke-secondary) bg-(--ui-bg-elevated) p-3 text-foreground shadow-lg">
          <div className="flex items-baseline justify-between gap-3">
            <div className="font-mono text-[11px] uppercase text-muted-foreground">Basil Motion</div>
            <div className="font-mono text-[10px] text-muted-foreground">interactive</div>
          </div>
          <div className="mt-1 truncate text-sm font-medium">{snapshot.state}</div>
          <div className="mt-1 truncate text-xs text-muted-foreground">{eventLabel}</div>
          <BasilDevPanel />
        </aside>
      )}
    </>
  )
}
