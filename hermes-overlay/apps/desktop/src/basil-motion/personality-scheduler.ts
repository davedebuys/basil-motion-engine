import {
  BASIL_PERSONALITY_BY_SIGNAL,
  type BasilPersonalityDefinition,
  type BasilPersonalityId,
  type BasilPersonalitySignalKind
} from './personality-pack'
import type { BasilState } from './types'

export type BasilPersonalityMode = 'balanced' | 'playful' | 'quiet'

export interface BasilPersonalitySignal {
  at: number
  force?: boolean
  kind: BasilPersonalitySignalKind
  side?: -1 | 1
  state: BasilState
}

export interface BasilPersonalityPlayback {
  definition: BasilPersonalityDefinition
  side: -1 | 1
  startedAt: number
}

export interface BasilPersonalityDirectorState {
  active: BasilPersonalityPlayback | null
  lastStartedAt: number
  lastStartedById: Partial<Record<BasilPersonalityId, number>>
  recent: BasilPersonalityId[]
  signalCount: number
}

export function createBasilPersonalityDirectorState(): BasilPersonalityDirectorState {
  return {
    active: null,
    lastStartedAt: Number.NEGATIVE_INFINITY,
    lastStartedById: {},
    recent: [],
    signalCount: 0
  }
}

function signalCandidates(kind: BasilPersonalitySignalKind): readonly BasilPersonalityDefinition[] {
  if (kind === 'paste') {
    return BASIL_PERSONALITY_BY_SIGNAL.get('copy') ?? []
  }

  return BASIL_PERSONALITY_BY_SIGNAL.get(kind) ?? []
}

function cooldownMs(mode: BasilPersonalityMode, priority: number): number {
  if (priority >= 9) {
    return 0
  }

  if (mode === 'quiet') {
    return Number.POSITIVE_INFINITY
  }

  if (priority >= 6) {
    return mode === 'playful' ? 18_000 : 45_000
  }

  return mode === 'playful' ? 120_000 : 360_000
}

function cadence(mode: BasilPersonalityMode, priority: number): number {
  if (priority >= 8) {
    return 1
  }

  return mode === 'playful' ? 2 : 4
}

function activeAt(state: BasilPersonalityDirectorState, at: number): BasilPersonalityPlayback | null {
  const active = state.active

  if (!active || at >= active.startedAt + active.definition.durationMs) {
    return null
  }

  return active
}

function candidateForSignal(
  state: BasilPersonalityDirectorState,
  signal: BasilPersonalitySignal
): BasilPersonalityDefinition | null {
  const candidates = signalCandidates(signal.kind)
    .filter(candidate => candidate.allowedStates.includes(signal.state))
    .sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id))

  if (candidates.length === 0) {
    return null
  }

  const fresh = candidates.filter(candidate => !state.recent.includes(candidate.id))
  const pool = fresh.length > 0 ? fresh : candidates

  return pool[state.signalCount % pool.length] ?? null
}

export function requestBasilPersonality(
  current: BasilPersonalityDirectorState,
  signal: BasilPersonalitySignal,
  mode: BasilPersonalityMode
): { playback: BasilPersonalityPlayback | null; state: BasilPersonalityDirectorState } {
  const signalCount = current.signalCount + 1
  const active = activeAt(current, signal.at)
  const counted = { ...current, active, signalCount }
  const candidate = candidateForSignal(counted, signal)

  if (!candidate) {
    return { playback: active, state: counted }
  }

  if (!signal.force) {
    if (mode === 'quiet' && candidate.priority < 9) {
      return { playback: active, state: counted }
    }

    if (signalCount % cadence(mode, candidate.priority) !== 0) {
      return { playback: active, state: counted }
    }

    const candidateLastStartedAt = current.lastStartedById[candidate.id] ?? Number.NEGATIVE_INFINITY

    if (signal.at - candidateLastStartedAt < cooldownMs(mode, candidate.priority)) {
      return { playback: active, state: counted }
    }

    if (active && active.definition.priority >= candidate.priority) {
      return { playback: active, state: counted }
    }
  }

  const playback: BasilPersonalityPlayback = {
    definition: candidate,
    side: signal.side ?? (signalCount % 2 === 0 ? -1 : 1),
    startedAt: signal.at
  }

  return {
    playback,
    state: {
      active: playback,
      lastStartedAt: signal.at,
      lastStartedById: {
        ...current.lastStartedById,
        [candidate.id]: signal.at
      },
      recent: [candidate.id, ...current.recent.filter(id => id !== candidate.id)].slice(0, 6),
      signalCount
    }
  }
}

export function clearFinishedBasilPersonality(
  state: BasilPersonalityDirectorState,
  at: number
): BasilPersonalityDirectorState {
  return activeAt(state, at) ? state : { ...state, active: null }
}
