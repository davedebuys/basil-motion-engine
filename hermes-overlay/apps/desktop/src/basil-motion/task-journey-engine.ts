import type {
  BasilSceneTarget,
  BasilTaskJourneySnapshot,
  BasilTaskJourneyTransition,
  GenericAgentEvent
} from './types'

const JOURNEY_TRAIL_LIMIT = 4

const JOURNEY_TARGETS = new Set<BasilSceneTarget>([
  'data',
  'document',
  'editor',
  'folder',
  'image',
  'terminal',
  'tool',
  'web'
])

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function eventSessionKey(event: GenericAgentEvent): string | null {
  const source = text(event.source)
  const id = text(event.id)

  if (!source || !id || source === 'development' || source === 'dev-control') {
    return null
  }

  return `${source}|${id}`
}

function eventKey(event: GenericAgentEvent, sessionKey: string): string {
  return [
    sessionKey,
    event.kind,
    event.scene?.target ?? '',
    event.scene?.taskPhase ?? ''
  ].join('|')
}

function appendTrail(trail: readonly BasilSceneTarget[], target: BasilSceneTarget): BasilSceneTarget[] {
  return [...trail, target].slice(-JOURNEY_TRAIL_LIMIT)
}

function lifecycleTransition(
  status: BasilTaskJourneySnapshot['status'],
  previousStatus: BasilTaskJourneySnapshot['status']
): BasilTaskJourneyTransition {
  return previousStatus === 'paused' && status === 'active' ? 'resume' : 'repeat'
}

export function advanceBasilTaskJourney(
  previous: BasilTaskJourneySnapshot | undefined,
  event: GenericAgentEvent
): BasilTaskJourneySnapshot | undefined {
  const sessionKey = eventSessionKey(event)

  if (!sessionKey) {
    return previous
  }

  const sameSession = previous?.sessionKey === sessionKey
  const current = sameSession ? previous : undefined
  const nextEventKey = eventKey(event, sessionKey)

  if (current?.eventKey === nextEventKey) {
    return current
  }

  if (event.kind === 'agent_error') {
    return current
      ? { ...current, eventKey: nextEventKey, status: 'failed', transition: 'fail' }
      : undefined
  }

  if (event.kind === 'awaiting_permission') {
    return current
      ? { ...current, eventKey: nextEventKey, status: 'paused', transition: 'pause' }
      : undefined
  }

  if (event.kind === 'agent_idle' || event.kind === 'assistant_success') {
    return current
      ? { ...current, eventKey: nextEventKey, status: 'complete', transition: 'complete' }
      : undefined
  }

  const target = event.scene?.target

  if (!target || !JOURNEY_TARGETS.has(target)) {
    return current
  }

  if (!current) {
    return {
      currentTarget: target,
      eventKey: nextEventKey,
      previousTarget: null,
      sessionKey,
      status: 'active',
      stepCount: 1,
      trail: [target],
      transition: 'start',
      visitedTargets: [target]
    }
  }

  if (current.currentTarget === target) {
    return {
      ...current,
      eventKey: nextEventKey,
      status: 'active',
      transition: lifecycleTransition('active', current.status)
    }
  }

  const transition = current.visitedTargets.includes(target) ? 'return' : 'advance'

  return {
    currentTarget: target,
    eventKey: nextEventKey,
    previousTarget: current.currentTarget,
    sessionKey,
    status: 'active',
    stepCount: current.stepCount + 1,
    trail: appendTrail(current.trail, target),
    transition,
    visitedTargets: current.visitedTargets.includes(target)
      ? current.visitedTargets
      : [...current.visitedTargets, target]
  }
}
