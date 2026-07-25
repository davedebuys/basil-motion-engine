import { describe, expect, it, vi } from 'vitest'

import { emitBasilSummonRequest, onBasilSummonRequest } from './summon-request'

describe('Basil summon requests', () => {
  it('delivers the portable source and unsubscribes cleanly', () => {
    const listener = vi.fn()
    const dispose = onBasilSummonRequest(listener)

    emitBasilSummonRequest({ source: 'ambient-wake' })
    expect(listener).toHaveBeenCalledWith({ source: 'ambient-wake' })

    dispose()
    emitBasilSummonRequest({ source: 'direct' })
    expect(listener).toHaveBeenCalledOnce()
  })
})
