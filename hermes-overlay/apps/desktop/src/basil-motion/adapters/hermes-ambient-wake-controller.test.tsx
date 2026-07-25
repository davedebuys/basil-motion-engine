import { act, cleanup, render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { MicRecorderOptions } from '@/app/chat/composer/hooks/use-mic-recorder'
import { $voicePlayback } from '@/store/voice-playback'

import { $basilAmbientWake, setBasilAmbientWakeEnabled } from '../ambient-wake'
import { $basilPresence } from '../presence'

import { HermesBasilAmbientWakeController } from './hermes-ambient-wake-controller'

const recorderMocks = vi.hoisted(() => ({
  cancel: vi.fn(),
  options: null as MicRecorderOptions | null,
  start: vi.fn(async (options?: MicRecorderOptions) => {
    recorderMocks.options = options ?? null
  }),
  stop: vi.fn()
}))

const hermesMocks = vi.hoisted(() => ({
  config: vi.fn(),
  prefilter: vi.fn(),
  transcribe: vi.fn(),
  warmPrefilter: vi.fn()
}))

vi.mock('@/app/chat/composer/hooks/use-mic-recorder', () => ({
  useMicRecorder: () => ({
    handle: {
      cancel: recorderMocks.cancel,
      start: recorderMocks.start,
      stop: recorderMocks.stop
    },
    level: 0,
    recording: false
  })
}))

vi.mock('@/hermes', () => ({
  classifyBasilPresenceAudio: hermesMocks.prefilter,
  getHermesConfigRecord: hermesMocks.config,
  transcribeAudio: hermesMocks.transcribe,
  warmBasilPresenceAudioPrefilter: hermesMocks.warmPrefilter
}))

describe('Hermes Basil ambient wake controller', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    recorderMocks.options = null
    hermesMocks.config.mockResolvedValue({ stt: { enabled: true, provider: 'local' } })
    hermesMocks.prefilter.mockResolvedValue({
      available: true,
      candidate: true,
      ok: true,
      processing_ms: 5,
      provider: 'pocketsphinx',
      reason: 'candidate'
    })
    hermesMocks.transcribe.mockResolvedValue({ transcript: 'OK Basil, come out now' })
    hermesMocks.warmPrefilter.mockResolvedValue({
      available: true,
      candidate: false,
      ok: true,
      processing_ms: 10,
      provider: 'pocketsphinx',
      reason: 'ready'
    })
    recorderMocks.stop.mockResolvedValue({
      audio: new Blob(['wake'], { type: 'audio/webm' }),
      durationMs: 800,
      heardSpeech: true
    })
    $basilPresence.set({ nonce: 1, phase: 'hidden', startedAt: Date.now() })
    $voicePlayback.set({ audioElement: null, messageId: null, sequence: 0, source: null, status: 'idle' })
    setBasilAmbientWakeEnabled(true)
  })

  afterEach(() => {
    cleanup()
    setBasilAmbientWakeEnabled(false)
  })

  it('transcribes a local hidden-state utterance and requests visible presentation without an agent prompt', async () => {
    let now = 1_000

    vi.spyOn(Date, 'now').mockImplementation(() => now)
    const listener = vi.fn()
    window.addEventListener('basil:summon-request', listener)
    render(<HermesBasilAmbientWakeController />)

    await waitFor(() => expect(recorderMocks.start).toHaveBeenCalledOnce())
    expect(recorderMocks.options?.leasePriority).toBe(0)
    expect(hermesMocks.warmPrefilter).toHaveBeenCalledOnce()

    await act(async () => {
      recorderMocks.options?.onLevel?.(0.4)
      now += 500
      recorderMocks.options?.onLevel?.(0.4)
      now += 900
      recorderMocks.options?.onLevel?.(0.01)
    })

    await waitFor(() => expect(listener).toHaveBeenCalledOnce())
    expect((listener.mock.calls[0][0] as CustomEvent).detail).toEqual({ source: 'ambient-wake' })
    expect($basilAmbientWake.get().status).toBe('wake_detected')
    expect(hermesMocks.transcribe).toHaveBeenCalledOnce()

    window.removeEventListener('basil:summon-request', listener)
  })

  it('transcribes a local visible-state hide phrase and emits the generic hide command', async () => {
    let now = 1_000

    vi.spyOn(Date, 'now').mockImplementation(() => now)
    hermesMocks.transcribe.mockResolvedValue({ transcript: 'Basil, hide now' })
    $basilPresence.set({ nonce: 2, phase: 'visible', startedAt: now })
    const listener = vi.fn()

    window.addEventListener('basil:presence-command', listener)
    render(<HermesBasilAmbientWakeController />)

    await waitFor(() => expect(recorderMocks.start).toHaveBeenCalledOnce())

    await act(async () => {
      recorderMocks.options?.onLevel?.(0.4)
      now += 500
      recorderMocks.options?.onLevel?.(0.4)
      now += 900
      recorderMocks.options?.onLevel?.(0.01)
    })

    await waitFor(() => expect(listener).toHaveBeenCalledOnce())
    expect((listener.mock.calls[0][0] as CustomEvent).detail).toBe('hide')
    expect($basilAmbientWake.get().status).toBe('hide_detected')
    expect(hermesMocks.transcribe).toHaveBeenCalledOnce()

    window.removeEventListener('basil:presence-command', listener)
  })

  it('discards a state-inappropriate command instead of replaying a transition', async () => {
    let now = 1_000

    vi.spyOn(Date, 'now').mockImplementation(() => now)
    $basilPresence.set({ nonce: 2, phase: 'visible', startedAt: now })
    const summonListener = vi.fn()
    const presenceListener = vi.fn()

    window.addEventListener('basil:summon-request', summonListener)
    window.addEventListener('basil:presence-command', presenceListener)
    render(<HermesBasilAmbientWakeController />)

    await waitFor(() => expect(recorderMocks.start).toHaveBeenCalledOnce())

    await act(async () => {
      recorderMocks.options?.onLevel?.(0.4)
      now += 500
      recorderMocks.options?.onLevel?.(0.4)
      now += 900
      recorderMocks.options?.onLevel?.(0.01)
    })

    await waitFor(() => expect($basilAmbientWake.get().status).toBe('paused'))
    expect(summonListener).not.toHaveBeenCalled()
    expect(presenceListener).not.toHaveBeenCalled()

    window.removeEventListener('basil:summon-request', summonListener)
    window.removeEventListener('basil:presence-command', presenceListener)
  })

  it('refuses cloud speech providers before opening the microphone', async () => {
    hermesMocks.config.mockResolvedValue({ stt: { enabled: true, provider: 'openai' } })
    render(<HermesBasilAmbientWakeController />)

    await waitFor(() => expect($basilAmbientWake.get().status).toBe('error'))
    expect(recorderMocks.start).not.toHaveBeenCalled()
    expect($basilAmbientWake.get().error).toContain('local speech-to-text provider')
  })

  it('enters a refractory pause after ordinary background speech', async () => {
    let now = 1_000

    vi.spyOn(Date, 'now').mockImplementation(() => now)
    hermesMocks.transcribe.mockResolvedValue({ transcript: 'could you check the weather tomorrow' })
    const listener = vi.fn()

    window.addEventListener('basil:summon-request', listener)
    render(<HermesBasilAmbientWakeController />)
    await waitFor(() => expect(recorderMocks.start).toHaveBeenCalledOnce())

    await act(async () => {
      recorderMocks.options?.onLevel?.(0.4)
      now += 500
      recorderMocks.options?.onLevel?.(0.4)
      now += 900
      recorderMocks.options?.onLevel?.(0.01)
    })

    await waitFor(() => expect($basilAmbientWake.get().status).toBe('paused'))
    expect(hermesMocks.transcribe).toHaveBeenCalledOnce()
    expect(listener).not.toHaveBeenCalled()
    expect(recorderMocks.start).toHaveBeenCalledOnce()
    window.removeEventListener('basil:summon-request', listener)
  })

  it('discards an available prefilter rejection without running full STT', async () => {
    let now = 1_000

    vi.spyOn(Date, 'now').mockImplementation(() => now)
    hermesMocks.prefilter.mockResolvedValue({
      available: true,
      candidate: false,
      ok: true,
      processing_ms: 5,
      provider: 'pocketsphinx',
      reason: 'rejected'
    })
    render(<HermesBasilAmbientWakeController />)
    await waitFor(() => expect(recorderMocks.start).toHaveBeenCalledOnce())

    await act(async () => {
      recorderMocks.options?.onLevel?.(0.4)
      now += 500
      recorderMocks.options?.onLevel?.(0.4)
      now += 900
      recorderMocks.options?.onLevel?.(0.01)
    })

    await waitFor(() => expect($basilAmbientWake.get().status).toBe('paused'))
    expect(hermesMocks.prefilter).toHaveBeenCalledOnce()
    expect(hermesMocks.transcribe).not.toHaveBeenCalled()
  })

  it('falls back to strict STT when the optional prefilter is unavailable', async () => {
    let now = 1_000

    vi.spyOn(Date, 'now').mockImplementation(() => now)
    hermesMocks.prefilter.mockResolvedValue({
      available: false,
      candidate: false,
      ok: true,
      processing_ms: 0,
      provider: null,
      reason: 'dependency_unavailable'
    })
    const listener = vi.fn()

    window.addEventListener('basil:summon-request', listener)
    render(<HermesBasilAmbientWakeController />)
    await waitFor(() => expect(recorderMocks.start).toHaveBeenCalledOnce())

    await act(async () => {
      recorderMocks.options?.onLevel?.(0.4)
      now += 500
      recorderMocks.options?.onLevel?.(0.4)
      now += 900
      recorderMocks.options?.onLevel?.(0.01)
    })

    await waitFor(() => expect(listener).toHaveBeenCalledOnce())
    expect(hermesMocks.transcribe).toHaveBeenCalledOnce()
    window.removeEventListener('basil:summon-request', listener)
  })
})
