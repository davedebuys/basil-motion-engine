import { atom } from 'nanostores'

import { persistBoolean, persistString, storedBoolean, storedString } from '@/lib/storage'

import {
  $basilAmbientWake,
  $basilAmbientWakeEnabled,
  type BasilAmbientWakeSnapshot,
  setBasilAmbientWakeEnabled
} from './ambient-wake'
import type { BasilDragCollaborationPose } from './drag-collaboration-engine'
import { $basilPresence, type BasilPresenceSnapshot } from './presence'
import { $basilParameterOverrides, $basilSceneOverride, $basilSnapshot } from './store'
import { shouldRetainBasilOverlay } from './summon-presentation-engine'
import type { BasilParameters, BasilSceneTarget, BasilStateSnapshot } from './types'

export interface BasilOverlayBounds {
  height: number
  width: number
  x: number
  y: number
}

export interface BasilOverlayOpenRequest {
  bounds: BasilOverlayBounds
  screen?: boolean
}

export interface BasilOverlayNudgeRequest {
  destination: { x: number; y: number }
  reason?: 'assist'
}

export interface BasilOverlayNudgeResult {
  bounds?: BasilOverlayBounds
  ok: boolean
}

export interface BasilOverlayStatePayload {
  ambientWake?: BasilAmbientWakeSnapshot
  ambientWakeEnabled?: boolean
  overrides: Partial<BasilParameters>
  presence?: BasilPresenceSnapshot
  sceneOverride?: BasilSceneTarget | null
  snapshot: BasilStateSnapshot
}

export interface BasilOverlayExternalTarget {
  activationSource?:
    | 'agent-event'
    | 'collection'
    | 'content'
    | 'control'
    | 'invocation'
    | 'keyboard'
    | 'pointer'
    | 'selection'
  activityIntensity?: number
  activityVariant?: 'add' | 'remove' | 'reorder'
  bounds: BasilOverlayBounds
  className: string
  collaboration?: BasilDragCollaborationPose
  controlType: string
  dragDistance?: number
  dragVelocity?: { x: number; y: number }
  isKeyboardFocusable: boolean
  intent:
    | 'activate'
    | 'adjustment'
    | 'dismiss'
    | 'drag_end'
    | 'drag_move'
    | 'drag_start'
    | 'focus'
    | 'input'
    | 'invocation'
    | 'move'
    | 'preview'
    | 'resize'
    | 'scroll'
    | 'selection'
    | 'structure'
  movementReason?: 'activity' | 'assist' | 'follow' | 'visit'
  phase: 'activity' | 'dismissed' | 'dragging' | 'dropped' | 'follow' | 'landed' | 'preview' | 'travel' | 'traverse'
  point: { x: number; y: number }
  processId: number
  routeDirection?: { x: number; y: number }
  routeStep?: number
  scrollDeltaX?: number
  scrollDeltaY?: number
  scrollX?: number
  scrollY?: number
  source: 'windows-uia'
  supportsInvoke: boolean
  target: BasilSceneTarget
}

export type BasilOverlayControl =
  | { type: 'ambient-wake-disable' }
  | { type: 'pop-in' }
  | { type: 'ready' }
  | { type: 'toggle-app' }
  | { bounds: BasilOverlayBounds; type: 'bounds' }

const ACTIVE_KEY = 'basil.motion.overlay-active.v1'
const BOUNDS_KEY = 'basil.motion.overlay-bounds.v1'
const BASIL_OVERLAY_SIZE = 196
const BASIL_OVERLAY_READY_TIMEOUT_MS = 2_000

export const $basilOverlayActive = atom(storedBoolean(ACTIVE_KEY, false))
$basilOverlayActive.subscribe(active => persistBoolean(ACTIVE_KEY, active))

let stateUnsubscribers: Array<() => void> = []
let controlUnsubscribe: (() => void) | null = null
let lifecycleUnsubscribers: Array<() => void> = []
let overlayRendererReady = false
let overlayReadyPromise: Promise<boolean> | null = null
let resolveOverlayReady: ((ready: boolean) => void) | null = null
let overlayReadyTimer: number | null = null

function savedBounds(): BasilOverlayBounds | null {
  try {
    const raw = storedString(BOUNDS_KEY)

    if (!raw) {
      return null
    }

    const parsed = JSON.parse(raw) as Partial<BasilOverlayBounds>

    if (
      typeof parsed.height === 'number' &&
      typeof parsed.width === 'number' &&
      typeof parsed.x === 'number' &&
      typeof parsed.y === 'number'
    ) {
      return { height: parsed.height, width: parsed.width, x: parsed.x, y: parsed.y }
    }
  } catch {
    // Invalid remembered geometry falls back to the in-window actor.
  }

  return null
}

function saveBounds(bounds: BasilOverlayBounds): void {
  persistString(BOUNDS_KEY, JSON.stringify(bounds))
}

function currentPayload(): BasilOverlayStatePayload {
  return {
    ambientWake: $basilAmbientWake.get(),
    ambientWakeEnabled: $basilAmbientWakeEnabled.get(),
    overrides: $basilParameterOverrides.get(),
    presence: $basilPresence.get(),
    sceneOverride: $basilSceneOverride.get(),
    snapshot: $basilSnapshot.get()
  }
}

function pushNow(): void {
  window.hermesDesktop?.basilOverlay?.pushState(currentPayload())
}

function finishOverlayReady(ready: boolean): void {
  if (overlayReadyTimer !== null) {
    window.clearTimeout(overlayReadyTimer)
    overlayReadyTimer = null
  }

  const resolve = resolveOverlayReady

  resolveOverlayReady = null
  overlayReadyPromise = null
  resolve?.(ready)
}

function waitForOverlayReady(): Promise<boolean> {
  if (overlayRendererReady) {
    return Promise.resolve(true)
  }

  if (overlayReadyPromise) {
    return overlayReadyPromise
  }

  overlayReadyPromise = new Promise(resolve => {
    resolveOverlayReady = resolve
    overlayReadyTimer = window.setTimeout(() => finishOverlayReady(false), BASIL_OVERLAY_READY_TIMEOUT_MS)
  })

  return overlayReadyPromise
}

function stopStateMirroring(): void {
  stateUnsubscribers.forEach(unsubscribe => unsubscribe())
  stateUnsubscribers = []
}

async function openOverlay(request: BasilOverlayOpenRequest): Promise<boolean> {
  const api = window.hermesDesktop?.basilOverlay

  if (!api) {
    return false
  }

  if (stateUnsubscribers.length) {
    return waitForOverlayReady()
  }

  $basilOverlayActive.set(true)
  overlayRendererReady = false
  const ready = waitForOverlayReady()

  stateUnsubscribers = [
    $basilSnapshot.subscribe(pushNow),
    $basilAmbientWake.subscribe(pushNow),
    $basilAmbientWakeEnabled.subscribe(pushNow),
    $basilParameterOverrides.subscribe(pushNow),
    $basilPresence.subscribe(pushNow),
    $basilSceneOverride.subscribe(pushNow)
  ]

  try {
    const response = await api.open(request)

    if (response.bounds) {
      saveBounds(response.bounds)
    }

    pushNow()

    return await ready
  } catch {
    finishOverlayReady(false)
    stopStateMirroring()
    overlayRendererReady = false
    $basilOverlayActive.set(false)

    return false
  }
}

export function popOutBasil(bounds: BasilOverlayBounds): Promise<boolean> {
  if ($basilOverlayActive.get() || stateUnsubscribers.length) {
    return waitForOverlayReady()
  }

  const remembered = savedBounds()

  if (remembered) {
    return openOverlay({ bounds: remembered, screen: true })
  }

  return openOverlay({
    bounds: {
      height: BASIL_OVERLAY_SIZE,
      width: BASIL_OVERLAY_SIZE,
      x: Math.round(bounds.x - (BASIL_OVERLAY_SIZE - bounds.width) / 2),
      y: Math.round(bounds.y - (BASIL_OVERLAY_SIZE - bounds.height) / 2)
    },
    screen: false
  })
}

export function restoreBasilOverlay(): void {
  if (!window.hermesDesktop?.basilOverlay || !$basilOverlayActive.get() || stateUnsubscribers.length) {
    return
  }

  if (
    !shouldRetainBasilOverlay({
      ambientWakeEnabled: $basilAmbientWakeEnabled.get(),
      presence: $basilPresence.get().phase
    })
  ) {
    $basilOverlayActive.set(false)

    return
  }

  const remembered = savedBounds()

  if (remembered) {
    void openOverlay({ bounds: remembered, screen: true })
  } else {
    $basilOverlayActive.set(false)
  }
}

export function popInBasil(): void {
  finishOverlayReady(false)
  overlayRendererReady = false
  stopStateMirroring()
  $basilOverlayActive.set(false)
  void window.hermesDesktop?.basilOverlay?.close()
}

export function initBasilOverlayBridge(): () => void {
  const api = window.hermesDesktop?.basilOverlay

  if (!api || controlUnsubscribe) {
    return () => {}
  }

  controlUnsubscribe = api.onControl(payload => {
    if (payload.type === 'ambient-wake-disable') {
      setBasilAmbientWakeEnabled(false)
    } else if (payload.type === 'pop-in') {
      popInBasil()
    } else if (payload.type === 'ready') {
      overlayRendererReady = true
      pushNow()
      finishOverlayReady(true)
    } else if (payload.type === 'bounds') {
      saveBounds(payload.bounds)
    }
  })

  const reconcileLifecycle = () => {
    if (
      $basilOverlayActive.get() &&
      !shouldRetainBasilOverlay({
        ambientWakeEnabled: $basilAmbientWakeEnabled.get(),
        presence: $basilPresence.get().phase
      })
    ) {
      popInBasil()
    }
  }

  lifecycleUnsubscribers = [
    $basilAmbientWakeEnabled.listen(reconcileLifecycle),
    $basilPresence.listen(reconcileLifecycle)
  ]

  return () => {
    controlUnsubscribe?.()
    controlUnsubscribe = null
    lifecycleUnsubscribers.forEach(unsubscribe => unsubscribe())
    lifecycleUnsubscribers = []
  }
}
