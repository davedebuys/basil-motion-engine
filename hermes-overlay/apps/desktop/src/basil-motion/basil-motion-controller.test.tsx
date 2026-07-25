import { act, cleanup, render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { setBasilAmbientWakeEnabled } from './ambient-wake'
import { BasilMotionController } from './basil-motion-controller'
import { $basilOverlayActive } from './basil-overlay'
import { $basilPresence } from './presence'

const controllerMocks = vi.hoisted(() => ({
  handleSummon: vi.fn(async () => 'overlay'),
  primeOverlay: vi.fn(async () => 'overlay')
}))

vi.mock('@/contrib/events', () => ({
  onGatewayEvent: vi.fn(() => () => {})
}))

vi.mock('@/store/windows', () => ({
  isSecondaryWindow: () => false
}))

vi.mock('./adapters/hermes-ambient-wake-controller', () => ({
  HermesBasilAmbientWakeController: () => null
}))

vi.mock('./adapters/hermes-presence-controls', () => ({
  registerHermesBasilPresenceControls: vi.fn(() => () => {})
}))

vi.mock('./adapters/hermes-summon-presentation', () => ({
  handleHermesBasilSummonRequest: controllerMocks.handleSummon,
  primeHermesBasilAmbientOverlay: controllerMocks.primeOverlay
}))

vi.mock('./basil-motion-stage', () => ({
  BasilMotionStage: () => null
}))

vi.mock('./basil-overlay', async importOriginal => {
  const original = (await importOriginal()) as Record<string, unknown>

  return {
    ...original,
    initBasilOverlayBridge: vi.fn(() => () => {}),
    restoreBasilOverlay: vi.fn()
  }
})

describe('Basil motion controller presentation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setBasilAmbientWakeEnabled(true)
    $basilOverlayActive.set(false)
    $basilPresence.set({ nonce: 1, phase: 'hidden', startedAt: Date.now() })
    Object.defineProperty(window, 'hermesDesktop', {
      configurable: true,
      value: { basilOverlay: {} }
    })
  })

  afterEach(() => {
    cleanup()
    setBasilAmbientWakeEnabled(false)
    $basilOverlayActive.set(false)
    $basilPresence.set({ nonce: 0, phase: 'visible', startedAt: Date.now() })
  })

  it('primes one overlay as soon as hidden ambient listening becomes eligible', async () => {
    render(<BasilMotionController />)

    await waitFor(() => expect(controllerMocks.primeOverlay).toHaveBeenCalledOnce())

    act(() => $basilOverlayActive.set(true))
    await Promise.resolve()
    expect(controllerMocks.primeOverlay).toHaveBeenCalledOnce()
  })

  it('does not prime while Basil is visible or when overlay IPC is unavailable', async () => {
    $basilPresence.set({ nonce: 1, phase: 'visible', startedAt: Date.now() })
    const rendered = render(<BasilMotionController />)

    await Promise.resolve()
    expect(controllerMocks.primeOverlay).not.toHaveBeenCalled()

    rendered.unmount()
    $basilPresence.set({ nonce: 2, phase: 'hidden', startedAt: Date.now() })
    Object.defineProperty(window, 'hermesDesktop', { configurable: true, value: {} })
    render(<BasilMotionController />)

    await Promise.resolve()
    expect(controllerMocks.primeOverlay).not.toHaveBeenCalled()
  })
})
