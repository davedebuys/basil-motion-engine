import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  acquireMicrophoneLease,
  microphoneLeasePriority,
  releaseMicrophoneLease,
  resetMicrophoneLeaseForTests
} from './microphone-lease'

describe('microphone lease', () => {
  afterEach(resetMicrophoneLeaseForTests)

  it('prevents equal-priority recorders from opening the microphone twice', () => {
    const first = Symbol('first')
    const second = Symbol('second')

    expect(acquireMicrophoneLease({ id: first, onPreempt: vi.fn(), priority: 10 })).toBe(true)
    expect(acquireMicrophoneLease({ id: second, onPreempt: vi.fn(), priority: 10 })).toBe(false)
    expect(microphoneLeasePriority()).toBe(10)
  })

  it('lets interactive recording preempt an ambient listener', () => {
    const ambient = Symbol('ambient')
    const interactive = Symbol('interactive')
    const onAmbientPreempt = vi.fn()

    expect(acquireMicrophoneLease({ id: ambient, onPreempt: onAmbientPreempt, priority: 0 })).toBe(true)
    expect(acquireMicrophoneLease({ id: interactive, onPreempt: vi.fn(), priority: 10 })).toBe(true)
    expect(onAmbientPreempt).toHaveBeenCalledOnce()
    expect(microphoneLeasePriority()).toBe(10)

    releaseMicrophoneLease(ambient)
    expect(microphoneLeasePriority()).toBe(10)
    releaseMicrophoneLease(interactive)
    expect(microphoneLeasePriority()).toBeNull()
  })
})
