import { act, cleanup, render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { $voicePlayback } from '@/store/voice-playback'

import { $basilPresence } from './presence'
import { $basilPresenceAudio, setBasilPresenceAudioEnabled } from './presence-audio'
import { useBasilPresenceAudio } from './use-basil-presence-audio'

const audioMocks = vi.hoisted(() => ({
  play: vi.fn(async () => true)
}))

vi.mock('./presence-audio-web', () => ({
  playBasilPresenceAudio: audioMocks.play
}))

function Harness({ active = true }: { active?: boolean }) {
  useBasilPresenceAudio({ active })

  return null
}

describe('useBasilPresenceAudio', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setBasilPresenceAudioEnabled(true)
    $basilPresenceAudio.set({
      lastCue: null,
      lastPlayedAt: null,
      playCount: 0,
      status: 'idle'
    })
    $basilPresence.set({ nonce: 1, phase: 'hidden', startedAt: 1 })
    $voicePlayback.set({ audioElement: null, messageId: null, sequence: 0, source: null, status: 'idle' })
  })

  afterEach(() => {
    cleanup()
  })

  it('ignores mount state and plays each later transition exactly once', async () => {
    render(<Harness />)
    expect(audioMocks.play).not.toHaveBeenCalled()

    act(() => $basilPresence.set({ nonce: 2, phase: 'summoning', startedAt: 2 }))
    await waitFor(() => expect(audioMocks.play).toHaveBeenCalledWith('summon'))

    act(() => $basilPresence.set({ nonce: 2, phase: 'visible', startedAt: 3 }))
    await Promise.resolve()
    expect(audioMocks.play).toHaveBeenCalledTimes(1)

    act(() => $basilPresence.set({ nonce: 3, phase: 'hiding', startedAt: 4 }))
    await waitFor(() => expect(audioMocks.play).toHaveBeenCalledWith('hide'))
    expect(audioMocks.play).toHaveBeenCalledTimes(2)
    expect($basilPresenceAudio.get().playCount).toBe(2)
  })

  it('suppresses cues while muted, speaking, or mounted in a secondary renderer', async () => {
    const rendered = render(<Harness />)
    setBasilPresenceAudioEnabled(false)
    act(() => $basilPresence.set({ nonce: 2, phase: 'summoning', startedAt: 2 }))
    await Promise.resolve()
    expect(audioMocks.play).not.toHaveBeenCalled()
    expect($basilPresenceAudio.get().status).toBe('muted')

    setBasilPresenceAudioEnabled(true)
    act(() =>
      $voicePlayback.set({
        audioElement: null,
        messageId: 'message-1',
        sequence: 1,
        source: 'read-aloud',
        status: 'speaking'
      })
    )
    act(() => $basilPresence.set({ nonce: 3, phase: 'hiding', startedAt: 3 }))
    await Promise.resolve()
    expect(audioMocks.play).not.toHaveBeenCalled()
    expect($basilPresenceAudio.get().status).toBe('suppressed')

    rendered.unmount()
    $voicePlayback.set({ audioElement: null, messageId: null, sequence: 2, source: null, status: 'idle' })
    $basilPresence.set({ nonce: 4, phase: 'hidden', startedAt: 4 })
    render(<Harness active={false} />)
    act(() => $basilPresence.set({ nonce: 5, phase: 'summoning', startedAt: 5 }))
    await Promise.resolve()
    expect(audioMocks.play).not.toHaveBeenCalled()
  })
})
