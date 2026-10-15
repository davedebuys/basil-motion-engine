import { atom } from 'nanostores'

/**
 * Standalone replacement for the Hermes `@/store/voice-playback`.
 *
 * The Basil presence-audio policy only consults `status` to avoid playing a
 * summon/hide cue while the host is speaking. The companion app does no host
 * voice playback, so this always reports `idle`.
 */

export type VoicePlaybackStatus = 'idle' | 'playing'

export const $voicePlayback = atom<{ status: VoicePlaybackStatus }>({ status: 'idle' })
