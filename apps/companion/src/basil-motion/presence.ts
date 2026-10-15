import { atom } from 'nanostores'

import { persistBoolean, storedBoolean } from '@/lib/storage'

import {
  BASIL_HIDE_DURATION_MS,
  BASIL_SUMMON_DURATION_MS,
  type BasilPresenceCommand,
  type BasilPresencePhase
} from './presence-engine'

export interface BasilPresenceSnapshot {
  nonce: number
  phase: BasilPresencePhase
  startedAt: number
}

const PRESENCE_KEY = 'basil.motion.presence-visible.v1'
export const BASIL_PRESENCE_COMMAND_EVENT = 'basil:presence-command'

const initiallyVisible = storedBoolean(PRESENCE_KEY, true)

export const $basilPresence = atom<BasilPresenceSnapshot>({
  nonce: 0,
  phase: initiallyVisible ? 'visible' : 'hidden',
  startedAt: Date.now()
})

let completionTimer: ReturnType<typeof setTimeout> | null = null

function scheduleCompletion(snapshot: BasilPresenceSnapshot, duration: number): void {
  if (completionTimer) {
    clearTimeout(completionTimer)
  }

  completionTimer = setTimeout(() => {
    completionTimer = null
    completeBasilPresenceTransition(snapshot.nonce)
  }, duration)
}

function beginPresenceTransition(phase: 'hiding' | 'summoning'): boolean {
  const current = $basilPresence.get()

  if (
    (phase === 'summoning' && (current.phase === 'visible' || current.phase === 'summoning')) ||
    (phase === 'hiding' && (current.phase === 'hidden' || current.phase === 'hiding'))
  ) {
    return false
  }

  const snapshot = {
    nonce: current.nonce + 1,
    phase,
    startedAt: Date.now()
  } satisfies BasilPresenceSnapshot

  $basilPresence.set(snapshot)
  scheduleCompletion(snapshot, phase === 'summoning' ? BASIL_SUMMON_DURATION_MS : BASIL_HIDE_DURATION_MS)

  return true
}

export function summonBasil(): boolean {
  return beginPresenceTransition('summoning')
}

export function hideBasil(): boolean {
  return beginPresenceTransition('hiding')
}

export function toggleBasilPresence(): boolean {
  const phase = $basilPresence.get().phase

  return phase === 'visible' || phase === 'summoning' ? hideBasil() : summonBasil()
}

export function completeBasilPresenceTransition(nonce: number): void {
  const current = $basilPresence.get()

  if (current.nonce !== nonce || (current.phase !== 'hiding' && current.phase !== 'summoning')) {
    return
  }

  const visible = current.phase === 'summoning'
  persistBoolean(PRESENCE_KEY, visible)
  $basilPresence.set({
    nonce: current.nonce,
    phase: visible ? 'visible' : 'hidden',
    startedAt: Date.now()
  })
}

export function applyBasilPresenceSnapshot(snapshot: BasilPresenceSnapshot): void {
  const current = $basilPresence.get()

  if (
    current.nonce === snapshot.nonce &&
    current.phase === snapshot.phase &&
    current.startedAt === snapshot.startedAt
  ) {
    return
  }

  $basilPresence.set(snapshot)
}

export function emitBasilPresenceCommand(command: BasilPresenceCommand): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent<BasilPresenceCommand>(BASIL_PRESENCE_COMMAND_EVENT, { detail: command }))
  }
}

export function onBasilPresenceCommand(listener: (command: BasilPresenceCommand) => void): () => void {
  if (typeof window === 'undefined') {
    return () => {}
  }

  const handle = (event: Event) => listener((event as CustomEvent<BasilPresenceCommand>).detail)
  window.addEventListener(BASIL_PRESENCE_COMMAND_EVENT, handle)

  return () => window.removeEventListener(BASIL_PRESENCE_COMMAND_EVENT, handle)
}
