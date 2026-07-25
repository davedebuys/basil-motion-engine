import { afterEach, describe, expect, it, vi } from 'vitest'

import { setBasilAmbientWakeEnabled } from './ambient-wake'
import {
  $basilOverlayActive,
  type BasilOverlayControl,
  initBasilOverlayBridge,
  popInBasil,
  popOutBasil
} from './basil-overlay'
import { $basilPresence } from './presence'
import { $basilSceneOverride, $basilSnapshot } from './store'

afterEach(() => {
  popInBasil()
  setBasilAmbientWakeEnabled(false)
  $basilPresence.set({ nonce: 0, phase: 'visible', startedAt: Date.now() })
  $basilSceneOverride.set(null)
  window.localStorage.clear()
  vi.restoreAllMocks()
})

describe('Basil overlay bridge', () => {
  it('opens, mirrors state, replays on ready, and pops back in', async () => {
    let dispatchControl = (_payload: BasilOverlayControl) => {}

    const api = {
      close: vi.fn(async () => ({ ok: true })),
      control: vi.fn(),
      onControl: vi.fn((callback: (payload: BasilOverlayControl) => void) => {
        dispatchControl = callback

        return () => {
          dispatchControl = () => {}
        }
      }),
      onState: vi.fn(() => () => {}),
      open: vi.fn(async request => ({ bounds: request.bounds, ok: true })),
      pushState: vi.fn(),
      setBounds: vi.fn(),
      setIgnoreMouse: vi.fn()
    }

    Object.defineProperty(window, 'hermesDesktop', {
      configurable: true,
      value: { basilOverlay: api }
    })

    const dispose = initBasilOverlayBridge()
    const opened = popOutBasil({ height: 108, width: 108, x: 120, y: 160 })
    await vi.waitFor(() => expect(api.open).toHaveBeenCalledOnce())
    expect($basilOverlayActive.get()).toBe(true)

    $basilSnapshot.set({ state: 'thinking' })
    expect(api.pushState).toHaveBeenLastCalledWith(expect.objectContaining({ snapshot: { state: 'thinking' } }))

    $basilSceneOverride.set('editor')
    expect(api.pushState).toHaveBeenLastCalledWith(expect.objectContaining({ sceneOverride: 'editor' }))

    dispatchControl({ type: 'ready' })
    await expect(opened).resolves.toBe(true)
    expect(api.pushState).toHaveBeenCalled()
    dispatchControl({ type: 'pop-in' })
    expect($basilOverlayActive.get()).toBe(false)
    expect(api.close).toHaveBeenCalled()
    dispose()
  })

  it('does not start a summon transition before the overlay renderer is ready', async () => {
    let dispatchControl = (_payload: BasilOverlayControl) => {}

    const api = {
      close: vi.fn(async () => ({ ok: true })),
      control: vi.fn(),
      onControl: vi.fn((callback: (payload: BasilOverlayControl) => void) => {
        dispatchControl = callback

        return () => {
          dispatchControl = () => {}
        }
      }),
      onState: vi.fn(() => () => {}),
      open: vi.fn(async request => ({ bounds: request.bounds, ok: true })),
      pushState: vi.fn(),
      setBounds: vi.fn(),
      setIgnoreMouse: vi.fn()
    }

    Object.defineProperty(window, 'hermesDesktop', {
      configurable: true,
      value: { basilOverlay: api }
    })

    const dispose = initBasilOverlayBridge()
    let settled = false

    const opened = popOutBasil({ height: 108, width: 108, x: 120, y: 160 }).then(ready => {
      settled = true

      return ready
    })

    await vi.waitFor(() => expect(api.open).toHaveBeenCalledOnce())
    await Promise.resolve()
    expect(settled).toBe(false)

    dispatchControl({ type: 'ready' })
    await expect(opened).resolves.toBe(true)
    dispose()
  })

  it('restores the embedded actor when native overlay creation fails', async () => {
    const api = {
      close: vi.fn(async () => ({ ok: true })),
      control: vi.fn(),
      onControl: vi.fn(() => () => {}),
      onState: vi.fn(() => () => {}),
      open: vi.fn(async () => {
        throw new Error('overlay failed')
      }),
      pushState: vi.fn(),
      setBounds: vi.fn(),
      setIgnoreMouse: vi.fn()
    }

    Object.defineProperty(window, 'hermesDesktop', {
      configurable: true,
      value: { basilOverlay: api }
    })

    await expect(popOutBasil({ height: 108, width: 108, x: 120, y: 160 })).resolves.toBe(false)
    expect($basilOverlayActive.get()).toBe(false)
  })

  it('closes a fully hidden overlay when its wake listener is disabled', async () => {
    let dispatchControl = (_payload: BasilOverlayControl) => {}

    const api = {
      close: vi.fn(async () => ({ ok: true })),
      control: vi.fn(),
      onControl: vi.fn((callback: (payload: BasilOverlayControl) => void) => {
        dispatchControl = callback

        return () => {
          dispatchControl = () => {}
        }
      }),
      onState: vi.fn(() => () => {}),
      open: vi.fn(async request => ({ bounds: request.bounds, ok: true })),
      pushState: vi.fn(),
      setBounds: vi.fn(),
      setIgnoreMouse: vi.fn()
    }

    Object.defineProperty(window, 'hermesDesktop', {
      configurable: true,
      value: { basilOverlay: api }
    })

    setBasilAmbientWakeEnabled(true)
    $basilPresence.set({ nonce: 1, phase: 'hidden', startedAt: Date.now() })
    const dispose = initBasilOverlayBridge()
    const opened = popOutBasil({ height: 108, width: 108, x: 120, y: 160 })

    await vi.waitFor(() => expect(api.open).toHaveBeenCalledOnce())
    dispatchControl({ type: 'ready' })
    await expect(opened).resolves.toBe(true)

    setBasilAmbientWakeEnabled(false)
    expect($basilOverlayActive.get()).toBe(false)
    expect(api.close).toHaveBeenCalled()
    dispose()
  })
})
