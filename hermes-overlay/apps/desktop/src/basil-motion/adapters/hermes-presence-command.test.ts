import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  basilPresenceCommandFromHermesTranscript,
  handleHermesBasilPresenceTranscript
} from './hermes-presence-command'

describe('Hermes Basil presence commands', () => {
  afterEach(() => vi.restoreAllMocks())

  it.each([
    ['OK Basil, come out now!', 'summon'],
    ['Basil, show yourself.', 'summon'],
    ['hey Basil wake up', 'summon'],
    ['Basil hide now', 'hide'],
    ['Okay, Basil, go to sleep.', 'hide'],
    ['please Basil disappear', 'hide']
  ])('maps the exact utterance "%s"', (transcript, expected) => {
    expect(basilPresenceCommandFromHermesTranscript(transcript)).toBe(expected)
  })

  it.each([
    'Ask Basil to come out after the build finishes',
    'Basil, come out with three product ideas',
    'Please hide the sidebar',
    'Can Basil disappear from this screenshot?',
    'Wake up the background worker'
  ])('does not consume an ordinary agent request: "%s"', transcript => {
    expect(basilPresenceCommandFromHermesTranscript(transcript)).toBeNull()
  })

  it('emits a generic local command only for a recognized phrase', () => {
    const listener = vi.fn()
    window.addEventListener('basil:presence-command', listener)

    expect(handleHermesBasilPresenceTranscript('OK Basil, come out now')).toBe(true)
    expect(handleHermesBasilPresenceTranscript('Help me with this code')).toBe(false)
    expect(listener).toHaveBeenCalledOnce()
    expect((listener.mock.calls[0][0] as CustomEvent).detail).toBe('summon')

    window.removeEventListener('basil:presence-command', listener)
  })
})
