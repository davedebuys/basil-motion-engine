import type { BasilExternalSceneTarget, BasilExternalTarget } from './basil-external-scene'

interface BasilWorkspaceScene {
  taskPhase?: unknown
  target?: unknown
}

interface BasilWorkspaceEvent {
  id?: unknown
  kind?: unknown
  label?: unknown
  scene?: BasilWorkspaceScene
  source?: unknown
}

interface BasilWorkspaceStatePayload {
  snapshot?: {
    lastEvent?: BasilWorkspaceEvent
  }
}

interface BasilWorkspaceMemoryEntry<Target> {
  baselineEventKey: string | null
  refreshedAt: number
  value: Target
}

const EXTERNAL_WORK_TARGETS = new Set<BasilExternalSceneTarget>([
  'data',
  'document',
  'editor',
  'folder',
  'image',
  'terminal',
  'tool',
  'web'
])

const USER_APPROVED_ACTIVATION_SOURCES = new Set([
  'collection',
  'content',
  'control',
  'invocation',
  'keyboard',
  'pointer',
  'selection'
])

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export function basilWorkspaceEventTarget(payload: unknown): BasilExternalSceneTarget | null {
  const target = (payload as BasilWorkspaceStatePayload | null)?.snapshot?.lastEvent?.scene
    ?.target as BasilExternalSceneTarget

  return EXTERNAL_WORK_TARGETS.has(target) ? target : null
}

export function basilWorkspaceEventKey(payload: unknown): string | null {
  const statePayload = payload as BasilWorkspaceStatePayload | null
  const event = statePayload?.snapshot?.lastEvent
  const source = text(event?.source)
  const kind = text(event?.kind)
  const target = basilWorkspaceEventTarget(payload)

  if (!source || source === 'development' || !kind || !target) {
    return null
  }

  return [source, text(event?.id), kind, target, text(event?.scene?.taskPhase), text(event?.label)].join('|')
}

export function basilWorkspaceEventMatchesTarget(
  payload: unknown,
  target: Pick<BasilExternalTarget, 'target'>
): boolean {
  return basilWorkspaceEventKey(payload) !== null && basilWorkspaceEventTarget(payload) === target.target
}

export function basilWorkspaceTargetMoved(
  previous: Pick<BasilExternalTarget, 'bounds' | 'point'>,
  next: Pick<BasilExternalTarget, 'bounds' | 'point'>,
  epsilon = 2
): boolean {
  return basilWorkspaceGeometryChange(previous, next, epsilon) !== null
}

export function basilWorkspaceGeometryChange(
  previous: Pick<BasilExternalTarget, 'bounds' | 'point'>,
  next: Pick<BasilExternalTarget, 'bounds' | 'point'>,
  epsilon = 2
): 'move' | 'resize' | null {
  if (
    Math.abs(previous.bounds.width - next.bounds.width) > epsilon ||
    Math.abs(previous.bounds.height - next.bounds.height) > epsilon
  ) {
    return 'resize'
  }

  if (
    Math.abs(previous.bounds.x - next.bounds.x) > epsilon ||
    Math.abs(previous.bounds.y - next.bounds.y) > epsilon ||
    Math.abs(previous.point.x - next.point.x) > epsilon ||
    Math.abs(previous.point.y - next.point.y) > epsilon
  ) {
    return 'move'
  }

  return null
}

export function basilWorkspaceFollowIntent(
  previous: Pick<BasilExternalTarget, 'bounds' | 'point'>,
  next: Pick<BasilExternalTarget, 'bounds' | 'point'>
): 'activate' | 'move' | 'resize' {
  const change = basilWorkspaceGeometryChange(previous, next)

  return change === 'resize' ? 'resize' : change === 'move' ? 'move' : 'activate'
}

export function shouldFollowBasilWorkspaceTarget(
  active: BasilExternalTarget | null,
  refreshed: BasilExternalTarget | null,
  payload: unknown
): boolean {
  return Boolean(
    active &&
    refreshed &&
    active.activationSource === 'agent-event' &&
    active.processId === refreshed.processId &&
    active.target === refreshed.target &&
    basilWorkspaceEventMatchesTarget(payload, refreshed) &&
    basilWorkspaceTargetMoved(active, refreshed)
  )
}

export function shouldFollowBasilUserWorkspaceTarget(
  active: BasilExternalTarget | null,
  refreshed: BasilExternalTarget | null
): boolean {
  return Boolean(
    active &&
    refreshed &&
    typeof active.activationSource === 'string' &&
    USER_APPROVED_ACTIVATION_SOURCES.has(active.activationSource) &&
    active.processId === refreshed.processId &&
    active.target === refreshed.target &&
    basilWorkspaceTargetMoved(active, refreshed)
  )
}

export class BasilWorkspaceTargetMemory<Target extends BasilExternalTarget> {
  readonly #entries = new Map<BasilExternalSceneTarget, BasilWorkspaceMemoryEntry<Target>>()
  readonly #maxAgeMs: number
  #lastConsumedEventKey: string | null = null

  constructor(maxAgeMs = 30 * 60 * 1000) {
    this.#maxAgeMs = Math.max(1, maxAgeMs)
  }

  clear(): void {
    this.#entries.clear()
    this.#lastConsumedEventKey = null
  }

  forget(target: Pick<Target, 'processId' | 'target'>): boolean {
    const entry = this.#entries.get(target.target)

    if (!entry || entry.value.processId !== target.processId) {
      return false
    }

    return this.#entries.delete(target.target)
  }

  remember(target: Target, currentState: unknown, now: number): void {
    if (target.intent !== 'activate') {
      return
    }

    this.#entries.set(target.target, {
      baselineEventKey: basilWorkspaceEventKey(currentState),
      refreshedAt: now,
      value: target
    })
  }

  refresh(target: Target, now: number): Target | null {
    const entry = this.#entries.get(target.target)

    if (!entry || entry.value.processId !== target.processId) {
      return null
    }

    const previous = entry.value
    const contactX = (previous.point.x - previous.bounds.x) / Math.max(1, previous.bounds.width)
    const contactY = (previous.point.y - previous.bounds.y) / Math.max(1, previous.bounds.height)

    entry.refreshedAt = now
    entry.value = {
      ...target,
      obstacles: target.obstacles.length ? target.obstacles : previous.obstacles,
      point: {
        x: target.bounds.x + Math.min(Math.max(contactX, 0), 1) * target.bounds.width,
        y: target.bounds.y + Math.min(Math.max(contactY, 0), 1) * target.bounds.height
      }
    }

    return entry.value
  }

  consume(payload: unknown, now: number): Target | null {
    const eventKey = basilWorkspaceEventKey(payload)

    if (!eventKey || eventKey === this.#lastConsumedEventKey) {
      return null
    }

    const target = basilWorkspaceEventTarget(payload)

    if (!target) {
      return null
    }

    const entry = this.#entries.get(target)

    if (!entry || eventKey === entry.baselineEventKey || now - entry.refreshedAt > this.#maxAgeMs) {
      return null
    }

    this.#lastConsumedEventKey = eventKey

    return entry.value
  }
}
