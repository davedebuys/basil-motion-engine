import { useStore } from '@nanostores/react'
import { useEffect, useRef } from 'react'

import { $voicePlayback } from '@/store/voice-playback'

import { $basilPresence } from './presence'
import {
  $basilPresenceAudioEnabled,
  markBasilPresenceAudio
} from './presence-audio'
import { decideBasilPresenceAudio } from './presence-audio-engine'
import { playBasilPresenceAudio } from './presence-audio-web'

export interface UseBasilPresenceAudioOptions {
  active?: boolean
}

export function useBasilPresenceAudio({ active = true }: UseBasilPresenceAudioOptions = {}): void {
  const enabled = useStore($basilPresenceAudioEnabled)
  const presence = useStore($basilPresence)
  const voicePlayback = useStore($voicePlayback)
  const initializedRef = useRef(false)
  const lastNonceRef = useRef(presence.nonce)

  useEffect(() => {
    const decision = decideBasilPresenceAudio({
      active,
      enabled,
      initialized: initializedRef.current,
      lastNonce: lastNonceRef.current,
      nonce: presence.nonce,
      phase: presence.phase,
      voicePlaybackIdle: voicePlayback.status === 'idle'
    })

    initializedRef.current = true
    lastNonceRef.current = presence.nonce

    if (decision.reason === 'disabled') {
      markBasilPresenceAudio('muted')

      return
    }

    if (decision.reason === 'voice-playback') {
      markBasilPresenceAudio('suppressed', decision.cue)

      return
    }

    if (decision.reason !== 'play') {
      return
    }

    let cancelled = false
    const cue = decision.cue

    void playBasilPresenceAudio(cue)
      .then(played => {
        if (!cancelled) {
          markBasilPresenceAudio(played ? 'played' : 'unavailable', cue)
        }
      })
      .catch(() => {
        if (!cancelled) {
          markBasilPresenceAudio('error', cue)
        }
      })

    return () => {
      cancelled = true
    }
  }, [active, enabled, presence.nonce, presence.phase, voicePlayback.status])
}
