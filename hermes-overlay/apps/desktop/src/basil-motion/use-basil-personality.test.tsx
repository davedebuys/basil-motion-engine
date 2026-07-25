import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { BasilStateSnapshot } from './types'
import { useBasilPersonality } from './use-basil-personality'

const IDLE: BasilStateSnapshot = {
  lastEvent: { kind: 'agent_idle', source: 'hermes' },
  state: 'idle'
}

describe('useBasilPersonality', () => {
  it('does not schedule visual frames or react to host signals while paused', () => {
    const requestFrame = vi.spyOn(window, 'requestAnimationFrame')

    const { result } = renderHook(() =>
      useBasilPersonality({
        focusPhase: 'engaged',
        focusTarget: 'rest',
        mode: 'balanced',
        paused: true,
        preview: { id: 'window-peekaboo', nonce: 10, side: 1 },
        snapshot: IDLE,
        workspaceObjectCount: 0
      })
    )

    act(() => window.dispatchEvent(new Event('copy')))

    expect(result.current.pose).toBeNull()
    expect(result.current.signalCount).toBe(0)
    expect(requestFrame).not.toHaveBeenCalled()
    requestFrame.mockRestore()
  })

  it('turns a genuine permission event into the matching protective behaviour', async () => {
    const snapshot: BasilStateSnapshot = {
      lastEvent: { kind: 'awaiting_permission', source: 'hermes' },
      state: 'awaiting_permission'
    }

    const { result } = renderHook(() =>
      useBasilPersonality({
        focusPhase: 'engaged',
        focusTarget: 'permission',
        mode: 'balanced',
        snapshot,
        workspaceObjectCount: 1
      })
    )

    await waitFor(() => expect(result.current.pose?.id).toBe('permission-guardian'))
  })

  it('cancels a casual preview when an authoritative speaking state arrives', async () => {
    const { rerender, result } = renderHook(
      ({ snapshot }) =>
        useBasilPersonality({
          focusPhase: 'engaged',
          focusTarget: 'rest',
          mode: 'balanced',
          preview: { id: 'window-peekaboo', nonce: 1, side: 1 },
          snapshot,
          workspaceObjectCount: 0
        }),
      { initialProps: { snapshot: IDLE } }
    )

    await waitFor(() => expect(result.current.pose?.id).toBe('window-peekaboo'))

    rerender({
      snapshot: {
        lastEvent: { kind: 'assistant_delta', source: 'hermes' },
        state: 'speaking'
      }
    })

    await waitFor(() => expect(result.current.pose).toBeNull())
  })

  it('turns discovery of an active hiding cameo into caught hiding', async () => {
    const { result } = renderHook(() =>
      useBasilPersonality({
        focusPhase: 'engaged',
        focusTarget: 'rest',
        mode: 'balanced',
        preview: { id: 'folder-fort', nonce: 2, side: -1 },
        snapshot: IDLE,
        workspaceObjectCount: 0
      })
    )

    await waitFor(() => expect(result.current.pose?.id).toBe('folder-fort'))

    act(() => result.current.onActorPointerEnter())

    await waitFor(() => expect(result.current.pose?.id).toBe('caught-hiding'))
    expect(result.current.pose?.side).toBe(-1)
  })

  it('uses genuine browser copy events and balanced cadence for the courier cameo', async () => {
    const { result } = renderHook(() =>
      useBasilPersonality({
        focusPhase: 'engaged',
        focusTarget: 'rest',
        mode: 'balanced',
        snapshot: IDLE,
        workspaceObjectCount: 0
      })
    )

    act(() => {
      for (let index = 0; index < 4; index += 1) {
        window.dispatchEvent(new Event('copy'))
      }
    })

    await waitFor(() => expect(result.current.pose?.id).toBe('copy-paste-courier'))
  })

  it('turns sustained genuine keyboard input into typing mimicry', async () => {
    const { result } = renderHook(() =>
      useBasilPersonality({
        focusPhase: 'engaged',
        focusTarget: 'composer',
        mode: 'balanced',
        snapshot: IDLE,
        workspaceObjectCount: 0
      })
    )

    act(() => {
      for (let index = 0; index < 48; index += 1) {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }))
      }
    })

    await waitFor(() => expect(result.current.pose?.id).toBe('typing-mimic'))
  })
})
