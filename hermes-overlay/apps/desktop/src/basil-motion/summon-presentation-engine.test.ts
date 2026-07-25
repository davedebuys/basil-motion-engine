import { describe, expect, it } from 'vitest'

import {
  deriveBasilSummonSurface,
  shouldPrimeBasilAmbientOverlay,
  shouldRetainBasilOverlay
} from './summon-presentation-engine'

describe('Basil summon presentation engine', () => {
  it('presents an ambient wake in the desktop overlay when the host supports it', () => {
    expect(
      deriveBasilSummonSurface({
        overlayActive: false,
        overlayAvailable: true,
        source: 'ambient-wake'
      })
    ).toBe('overlay')
  })

  it('keeps direct summons embedded unless Basil is already detached', () => {
    expect(
      deriveBasilSummonSurface({
        overlayActive: false,
        overlayAvailable: true,
        source: 'direct'
      })
    ).toBe('embedded')
    expect(
      deriveBasilSummonSurface({
        overlayActive: true,
        overlayAvailable: true,
        source: 'direct'
      })
    ).toBe('overlay')
  })

  it('falls back to the embedded actor when no overlay host exists', () => {
    expect(
      deriveBasilSummonSurface({
        overlayActive: false,
        overlayAvailable: false,
        source: 'ambient-wake'
      })
    ).toBe('embedded')
  })

  it('retains a hidden overlay only when it still hosts the wake control', () => {
    expect(shouldRetainBasilOverlay({ ambientWakeEnabled: true, presence: 'hidden' })).toBe(true)
    expect(shouldRetainBasilOverlay({ ambientWakeEnabled: false, presence: 'hidden' })).toBe(false)
    expect(shouldRetainBasilOverlay({ ambientWakeEnabled: false, presence: 'hiding' })).toBe(true)
  })

  it('primes exactly one capable overlay while hidden listening is enabled', () => {
    expect(
      shouldPrimeBasilAmbientOverlay({
        ambientWakeEnabled: true,
        overlayActive: false,
        overlayAvailable: true,
        presence: 'hidden'
      })
    ).toBe(true)
    expect(
      shouldPrimeBasilAmbientOverlay({
        ambientWakeEnabled: true,
        overlayActive: true,
        overlayAvailable: true,
        presence: 'hidden'
      })
    ).toBe(false)
    expect(
      shouldPrimeBasilAmbientOverlay({
        ambientWakeEnabled: false,
        overlayActive: false,
        overlayAvailable: true,
        presence: 'hidden'
      })
    ).toBe(false)
    expect(
      shouldPrimeBasilAmbientOverlay({
        ambientWakeEnabled: true,
        overlayActive: false,
        overlayAvailable: true,
        presence: 'hiding'
      })
    ).toBe(false)
  })
})
