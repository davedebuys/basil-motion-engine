import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useBasilFrame } from './use-basil-frame'

describe('useBasilFrame', () => {
  afterEach(() => vi.restoreAllMocks())

  it('does not schedule procedural animation while paused', () => {
    const requestFrame = vi.spyOn(window, 'requestAnimationFrame')

    renderHook(() => useBasilFrame('idle', {}, undefined, undefined, true))

    expect(requestFrame).not.toHaveBeenCalled()
  })
})
