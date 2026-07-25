import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { $basilPresence, hideBasil, summonBasil } from './presence'
import { BASIL_HIDE_DURATION_MS, BASIL_SUMMON_DURATION_MS } from './presence-engine'

describe('Basil presence controller', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-25T00:00:00Z'))
    $basilPresence.set({ nonce: 0, phase: 'visible', startedAt: Date.now() })
    window.localStorage.clear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('completes hide and summon transitions and persists the final choice', () => {
    expect(hideBasil()).toBe(true)
    expect($basilPresence.get().phase).toBe('hiding')

    vi.advanceTimersByTime(BASIL_HIDE_DURATION_MS)
    expect($basilPresence.get().phase).toBe('hidden')
    expect(window.localStorage.getItem('basil.motion.presence-visible.v1')).toBe('false')

    expect(summonBasil()).toBe(true)
    expect($basilPresence.get().phase).toBe('summoning')

    vi.advanceTimersByTime(BASIL_SUMMON_DURATION_MS)
    expect($basilPresence.get().phase).toBe('visible')
    expect(window.localStorage.getItem('basil.motion.presence-visible.v1')).toBe('true')
  })

  it('does not restart an already active transition', () => {
    expect(hideBasil()).toBe(true)
    const first = $basilPresence.get()

    expect(hideBasil()).toBe(false)
    expect($basilPresence.get()).toEqual(first)
  })
})
