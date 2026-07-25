import { afterEach, describe, expect, it, vi } from 'vitest'

import { closeBasilPresenceAudio, playBasilPresenceAudio } from './presence-audio-web'

interface FakeParam {
  exponentialRampToValueAtTime: ReturnType<typeof vi.fn>
  setValueAtTime: ReturnType<typeof vi.fn>
}

function fakeParam(): FakeParam {
  return {
    exponentialRampToValueAtTime: vi.fn(),
    setValueAtTime: vi.fn()
  }
}

describe('Basil Web Audio renderer', () => {
  afterEach(async () => {
    await closeBasilPresenceAudio()
    Reflect.deleteProperty(window, 'AudioContext')
  })

  it('resumes and schedules the procedural score without loading media', async () => {
    const oscillators: Array<{
      connect: ReturnType<typeof vi.fn>
      disconnect: ReturnType<typeof vi.fn>
      frequency: FakeParam
      onended: (() => void) | null
      start: ReturnType<typeof vi.fn>
      stop: ReturnType<typeof vi.fn>
      type: OscillatorType
    }> = []

    const gains: Array<{
      connect: ReturnType<typeof vi.fn>
      disconnect: ReturnType<typeof vi.fn>
      gain: FakeParam
    }> = []

    const resume = vi.fn(async () => {})
    const close = vi.fn(async () => {})

    class FakeAudioContext {
      close = close
      currentTime = 12
      destination = {}
      resume = resume
      state: AudioContextState = 'suspended'

      createGain() {
        const gain = { connect: vi.fn(), disconnect: vi.fn(), gain: fakeParam() }
        gains.push(gain)

        return gain
      }

      createOscillator() {
        const oscillator = {
          connect: vi.fn(),
          disconnect: vi.fn(),
          frequency: fakeParam(),
          onended: null,
          start: vi.fn(),
          stop: vi.fn(),
          type: 'sine' as OscillatorType
        }

        oscillators.push(oscillator)

        return oscillator
      }
    }

    Object.defineProperty(window, 'AudioContext', {
      configurable: true,
      value: FakeAudioContext
    })

    await expect(playBasilPresenceAudio('summon')).resolves.toBe(true)
    expect(resume).toHaveBeenCalledOnce()
    expect(oscillators).toHaveLength(3)
    expect(gains).toHaveLength(3)
    expect(oscillators[0].type).toBe('triangle')
    expect(oscillators[0].start).toHaveBeenCalledWith(12.045)
    expect(oscillators.every(oscillator => oscillator.stop.mock.calls.length === 1)).toBe(true)
    expect(gains.every(gain => gain.connect.mock.calls.length === 1)).toBe(true)
  })
})
