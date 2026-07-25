import { beforeEach, describe, expect, it } from 'vitest'

import {
  $basilAmbientWake,
  $basilAmbientWakeEnabled,
  markBasilAmbientWakeDetected,
  setBasilAmbientWakeEnabled,
  setBasilAmbientWakeLevel,
  setBasilAmbientWakeStatus
} from './ambient-wake'

describe('Basil ambient wake state', () => {
  beforeEach(() => {
    window.localStorage.clear()
    setBasilAmbientWakeEnabled(false)
  })

  it('is opt-in and persists only the explicit preference', () => {
    setBasilAmbientWakeEnabled(true)

    expect($basilAmbientWakeEnabled.get()).toBe(true)
    expect($basilAmbientWake.get().status).toBe('armed')
    expect(window.localStorage.getItem('basil.motion.ambient-wake-enabled.v1')).toBe('true')
  })

  it('bounds levels and records detection time without retaining a transcript', () => {
    setBasilAmbientWakeEnabled(true)
    setBasilAmbientWakeStatus('listening')
    setBasilAmbientWakeLevel(2)
    expect($basilAmbientWake.get().level).toBe(1)

    markBasilAmbientWakeDetected(123)
    expect($basilAmbientWake.get()).toEqual({
      error: null,
      lastWakeAt: 123,
      level: 0,
      status: 'wake_detected'
    })
  })
})
