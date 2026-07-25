import { describe, expect, it } from 'vitest'

import {
  createBasilPersonalityDirectorState,
  requestBasilPersonality
} from './personality-scheduler'

describe('Basil personality director', () => {
  it('keeps quiet mode silent except for high-priority safety and result responses', () => {
    const initial = createBasilPersonalityDirectorState()
    const typing = requestBasilPersonality(initial, { at: 0, kind: 'typing', state: 'writing' }, 'quiet')

    const permission = requestBasilPersonality(
      typing.state,
      { at: 10, kind: 'permission', state: 'awaiting_permission' },
      'quiet'
    )

    expect(typing.playback).toBeNull()
    expect(permission.playback?.definition.id).toBe('permission-guardian')
  })

  it('uses cadence and cooldown to prevent repetitive unsolicited cameos', () => {
    let state = createBasilPersonalityDirectorState()
    let playback = null

    for (let index = 0; index < 4; index += 1) {
      const result = requestBasilPersonality(
        state,
        { at: index * 1000, kind: 'typing', state: 'writing' },
        'balanced'
      )

      state = result.state
      playback = result.playback
    }

    expect(playback?.definition.id).toBe('typing-mimic')

    const repeated = requestBasilPersonality(
      state,
      { at: 5000, kind: 'typing', state: 'writing' },
      'balanced'
    )

    expect(repeated.playback?.startedAt).toBe(3000)
  })

  it('scopes cooldowns per behaviour so one cameo does not silence the whole pack', () => {
    let state = requestBasilPersonality(
      createBasilPersonalityDirectorState(),
      { at: 0, force: true, kind: 'window_edge', state: 'idle' },
      'balanced'
    ).state

    for (let index = 1; index <= 4; index += 1) {
      state = requestBasilPersonality(
        state,
        { at: 5000 + index * 1000, kind: 'typing', state: 'writing' },
        'balanced'
      ).state
    }

    expect(state.active?.definition.id).toBe('typing-mimic')
  })

  it('lets a forced development preview bypass cadence without changing state eligibility', () => {
    const result = requestBasilPersonality(
      createBasilPersonalityDirectorState(),
      { at: 0, force: true, kind: 'folder_active', side: -1, state: 'idle' },
      'balanced'
    )

    expect(result.playback?.definition.id).toBe('folder-fort')
    expect(result.playback?.side).toBe(-1)
  })
})
