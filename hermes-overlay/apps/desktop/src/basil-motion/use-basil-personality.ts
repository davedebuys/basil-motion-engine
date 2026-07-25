import { useCallback, useEffect, useRef, useState } from 'react'

import type { BasilDragCollaborationPose } from './drag-collaboration-engine'
import { type BasilPersonalityPose, sampleBasilPersonality } from './personality-engine'
import { BASIL_PERSONALITY_BY_ID, type BasilPersonalityId, type BasilPersonalitySignalKind } from './personality-pack'
import {
  type BasilPersonalityDirectorState,
  type BasilPersonalityMode,
  type BasilPersonalityPlayback,
  clearFinishedBasilPersonality,
  createBasilPersonalityDirectorState,
  requestBasilPersonality
} from './personality-scheduler'
import type { BasilScenePhase } from './scene-choreography'
import type { BasilSceneTarget, BasilStateSnapshot } from './types'

interface BasilPersonalityPreview {
  id: BasilPersonalityId
  nonce: number
  side: -1 | 1
}

interface UseBasilPersonalityInput {
  dragCollaboration?: BasilDragCollaborationPose | null
  focusPhase: BasilScenePhase
  focusSide?: -1 | 1
  focusTarget?: BasilSceneTarget
  hostSignal?: { key: string; kind: BasilPersonalitySignalKind; side?: -1 | 1 } | null
  mode: BasilPersonalityMode
  paused?: boolean
  preview?: BasilPersonalityPreview | null
  snapshot: BasilStateSnapshot
  workspaceObjectCount: number
}

export interface BasilPersonalityResult {
  lastSignal: BasilPersonalitySignalKind | null
  onActorPointerEnter: () => void
  pose: BasilPersonalityPose | null
  signalCount: number
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
}

function sideFromPointer(event: PointerEvent): -1 | 1 {
  return event.clientX < window.innerWidth / 2 ? -1 : 1
}

export function useBasilPersonality({
  dragCollaboration,
  focusPhase,
  focusSide = 1,
  focusTarget,
  hostSignal,
  mode,
  paused = false,
  preview,
  snapshot,
  workspaceObjectCount
}: UseBasilPersonalityInput): BasilPersonalityResult {
  const directorRef = useRef<BasilPersonalityDirectorState>(createBasilPersonalityDirectorState())
  const playbackRef = useRef<BasilPersonalityPlayback | null>(null)
  const previewNonceRef = useRef<number | null>(null)
  const hiddenAtRef = useRef<number | null>(null)
  const keyCountRef = useRef(0)
  const lastPointerAtRef = useRef(typeof performance === 'undefined' ? 0 : performance.now())
  const scrollAtRef = useRef(Number.NEGATIVE_INFINITY)
  const stateRef = useRef(snapshot.state)
  const pausedRef = useRef(paused)
  const [lastSignal, setLastSignal] = useState<BasilPersonalitySignalKind | null>(null)
  const [pose, setPose] = useState<BasilPersonalityPose | null>(null)
  const [signalCount, setSignalCount] = useState(0)

  stateRef.current = snapshot.state
  pausedRef.current = paused

  const signal = useCallback(
    (kind: BasilPersonalitySignalKind, side?: -1 | 1, force = false) => {
      if (pausedRef.current) {
        return
      }

      const at = performance.now()

      const result = requestBasilPersonality(
        directorRef.current,
        { at, force, kind, side, state: stateRef.current },
        mode
      )

      directorRef.current = result.state
      playbackRef.current = result.playback
      setLastSignal(kind)
      setSignalCount(result.state.signalCount)
    },
    [mode]
  )

  useEffect(() => {
    if (paused) {
      playbackRef.current = null
      directorRef.current = { ...directorRef.current, active: null }
      setPose(null)

      return
    }

    if (!preview || preview.nonce === previewNonceRef.current) {
      return
    }

    const definition = BASIL_PERSONALITY_BY_ID.get(preview.id)

    if (!definition) {
      return
    }

    previewNonceRef.current = preview.nonce
    const playback = { definition, side: preview.side, startedAt: performance.now() }

    playbackRef.current = playback
    directorRef.current = {
      ...directorRef.current,
      active: playback,
      lastStartedAt: playback.startedAt
    }
  }, [paused, preview])

  useEffect(() => {
    const event = snapshot.lastEvent

    if (!event || event.source === 'dev-control') {
      return
    }

    if (snapshot.state === 'error') {
      signal('error')
    } else if (snapshot.state === 'awaiting_permission') {
      signal('permission')
    } else if (snapshot.state === 'success') {
      signal('success')
    } else if (snapshot.state === 'searching' || snapshot.state === 'reading') {
      signal('research')
    } else if (snapshot.state === 'thinking' || snapshot.state === 'using_tool') {
      signal('loading')
    }
  }, [signal, snapshot.lastEvent, snapshot.state])

  useEffect(() => {
    if (dragCollaboration?.active && dragCollaboration.phase !== 'idle') {
      signal('drag', dragCollaboration.gazeX < 0 ? -1 : 1)
    }
  }, [dragCollaboration, signal])

  useEffect(() => {
    if (focusPhase !== 'engaged') {
      return
    }

    if (focusTarget === 'folder') {
      signal('folder_active', focusSide)
    } else if (focusTarget === 'web') {
      signal('tab_change', focusSide)
    } else if (focusTarget && focusTarget !== 'rest' && focusTarget !== 'conversation') {
      signal('window_edge', focusSide)
    }
  }, [focusPhase, focusSide, focusTarget, signal])

  useEffect(() => {
    if (workspaceObjectCount >= 8) {
      signal('workspace_busy')
    }
  }, [signal, workspaceObjectCount])

  useEffect(() => {
    if (hostSignal) {
      signal(hostSignal.kind, hostSignal.side)
    }
  }, [hostSignal, signal])

  useEffect(() => {
    if (paused) {
      return
    }

    const onCopy = () => signal('copy')
    const onPaste = () => signal('paste')

    const onScroll = () => {
      const now = performance.now()

      if (now - scrollAtRef.current >= 900) {
        scrollAtRef.current = now
        signal('scroll')
      }
    }

    const onResize = () => signal('surface_move')

    const onPointerMove = (event: PointerEvent) => {
      const now = performance.now()
      const quietFor = now - lastPointerAtRef.current

      lastPointerAtRef.current = now

      if (quietFor > 15_000) {
        signal('pointer_chase', sideFromPointer(event))
      }
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.altKey || event.metaKey || event.key.length !== 1) {
        return
      }

      keyCountRef.current += 1

      if (keyCountRef.current % 12 === 0) {
        signal('typing')
      }

      if (keyCountRef.current % 80 === 0) {
        signal('focus_session')
      }

      const hour = new Date().getHours()

      if (keyCountRef.current % 40 === 0 && (hour >= 22 || hour <= 5)) {
        signal('late_activity')
      }
    }

    const onVisibilityChange = () => {
      if (document.hidden) {
        hiddenAtRef.current = performance.now()

        return
      }

      if (hiddenAtRef.current !== null && performance.now() - hiddenAtRef.current > 15_000) {
        signal('user_return')
      }

      hiddenAtRef.current = null
    }

    window.addEventListener('copy', onCopy)
    window.addEventListener('keydown', onKeyDown, true)
    window.addEventListener('paste', onPaste)
    window.addEventListener('pointermove', onPointerMove, { passive: true })
    window.addEventListener('resize', onResize)
    window.addEventListener('scroll', onScroll, { capture: true, passive: true })
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      window.removeEventListener('copy', onCopy)
      window.removeEventListener('keydown', onKeyDown, true)
      window.removeEventListener('paste', onPaste)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('scroll', onScroll, true)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [paused, signal])

  useEffect(() => {
    const active = playbackRef.current

    if (active && !active.definition.allowedStates.includes(snapshot.state)) {
      playbackRef.current = null
      directorRef.current = { ...directorRef.current, active: null }
      setPose(null)
    }
  }, [snapshot.state])

  useEffect(() => {
    if (paused) {
      setPose(null)

      return
    }

    let animationFrame = 0
    let cancelled = false

    const tick = (now: number) => {
      directorRef.current = clearFinishedBasilPersonality(directorRef.current, now)
      const playback = directorRef.current.active

      playbackRef.current = playback
      setPose(
        playback
          ? sampleBasilPersonality(playback.definition, now - playback.startedAt, playback.side, prefersReducedMotion())
          : null
      )

      if (!cancelled) {
        animationFrame = window.requestAnimationFrame(tick)
      }
    }

    animationFrame = window.requestAnimationFrame(tick)

    return () => {
      cancelled = true
      window.cancelAnimationFrame(animationFrame)
    }
  }, [paused])

  const onActorPointerEnter = useCallback(() => {
    const active = playbackRef.current?.definition.id

    if (active === 'window-peekaboo' || active === 'folder-fort' || active === 'welcome-back-ambush') {
      signal('actor_discovered', playbackRef.current?.side, true)
    }
  }, [signal])

  return { lastSignal, onActorPointerEnter, pose, signalCount }
}
