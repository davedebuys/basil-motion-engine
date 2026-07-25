import { afterEach, describe, expect, it, vi } from 'vitest'

import { $basilOverlayActive, type BasilOverlayControl, initBasilOverlayBridge, popInBasil } from '../basil-overlay'
import { $basilPresence } from '../presence'

import { handleHermesBasilSummonRequest, presentHermesBasilSummon } from './hermes-summon-presentation'

function installActor(): HTMLElement {
  const actor = document.createElement('button')

  actor.dataset.basilActor = ''
  actor.getBoundingClientRect = () =>
    ({
      bottom: 400,
      height: 100,
      left: 400,
      right: 500,
      top: 300,
      width: 100,
      x: 400,
      y: 300,
      toJSON: () => ({})
    }) as DOMRect
  document.body.append(actor)

  return actor
}

function installOverlayApi() {
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
    onExternalTarget: vi.fn(() => () => {}),
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

  return { api, dispatch: (payload: BasilOverlayControl) => dispatchControl(payload) }
}

afterEach(() => {
  popInBasil()
  document.body.replaceChildren()
  window.localStorage.clear()
  vi.restoreAllMocks()
})

describe('Hermes Basil summon presentation', () => {
  it('waits for the detached renderer before starting an ambient summon', async () => {
    installActor()
    const { api, dispatch } = installOverlayApi()
    const dispose = initBasilOverlayBridge()
    $basilPresence.set({ nonce: 1, phase: 'hidden', startedAt: Date.now() })

    const request = handleHermesBasilSummonRequest({ source: 'ambient-wake' })

    await vi.waitFor(() => expect(api.open).toHaveBeenCalledOnce())
    expect($basilPresence.get().phase).toBe('hidden')
    expect(api.open).toHaveBeenCalledWith({
      bounds: { height: 196, width: 196, x: 352, y: 252 },
      screen: false
    })

    dispatch({ type: 'ready' })

    await expect(request).resolves.toBe('overlay')
    expect($basilPresence.get().phase).toBe('summoning')
    dispose()
  })

  it('falls back to the embedded actor when Electron overlay IPC is unavailable', async () => {
    installActor()
    Object.defineProperty(window, 'hermesDesktop', { configurable: true, value: undefined })

    await expect(presentHermesBasilSummon({ source: 'ambient-wake' })).resolves.toBe('embedded')
    expect($basilOverlayActive.get()).toBe(false)
  })

  it('keeps direct summons embedded in Hermes', async () => {
    installActor()
    const { api } = installOverlayApi()

    await expect(presentHermesBasilSummon({ source: 'direct' })).resolves.toBe('embedded')
    expect(api.open).not.toHaveBeenCalled()
  })
})
