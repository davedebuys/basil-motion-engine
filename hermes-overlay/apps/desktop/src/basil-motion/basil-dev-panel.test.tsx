import { cleanup, fireEvent, render, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { BasilDevPanel } from './basil-dev-panel'
import { $basilPresenceAudioEnabled, setBasilPresenceAudioEnabled } from './presence-audio'
import {
  $basilPersonalityPreview,
  $basilSceneOverride,
  $basilSnapshot,
  setBasilSceneOverride
} from './store'

afterEach(() => {
  cleanup()
  $basilPersonalityPreview.set(null)
  setBasilSceneOverride(null)
  setBasilPresenceAudioEnabled(true)
})

describe('BasilDevPanel', () => {
  it('can force every generic scene target without fabricating an agent event', () => {
    const { getByLabelText } = render(<BasilDevPanel />)
    const sceneSelect = getByLabelText('Basil scene target')

    fireEvent.change(sceneSelect, { target: { value: 'terminal' } })
    expect($basilSceneOverride.get()).toBe('terminal')

    fireEvent.change(sceneSelect, { target: { value: '' } })
    expect($basilSceneOverride.get()).toBeNull()
  })

  it('can browse and replay every interaction in the animation pack', () => {
    const { getByLabelText, getByText } = render(<BasilDevPanel />)
    const interactionSelect = getByLabelText('Basil interaction')
    const personalitySelect = getByLabelText('Basil personality behaviour')

    expect(within(interactionSelect).getAllByRole('option')).toHaveLength(100)
    expect(within(personalitySelect).getAllByRole('option')).toHaveLength(20)
    expect(within(getByLabelText('Basil personality frequency')).getAllByRole('option')).toHaveLength(3)
    expect(getByText('100 interaction pack')).toBeTruthy()
    expect(getByText('20 personality behaviours')).toBeTruthy()

    fireEvent.change(interactionSelect, { target: { value: 'happy-spin' } })
    fireEvent.change(getByLabelText('Basil interaction phase'), { target: { value: '0.5' } })
    fireEvent.click(getByLabelText('Play Basil interaction'))

    expect($basilSnapshot.get().interaction?.id).toBe('happy-spin')
    expect($basilSnapshot.get().interaction?.startProgress).toBe(0.5)
    expect($basilSnapshot.get().state).toBe('success')
    expect($basilSceneOverride.get()).toBe('conversation')

    fireEvent.change(personalitySelect, { target: { value: 'folder-fort' } })
    fireEvent.click(getByLabelText('Play Basil personality behaviour'))

    expect($basilPersonalityPreview.get()?.id).toBe('folder-fort')
    expect($basilSnapshot.get().lastEvent?.source).toBe('dev-control')
  })

  it('exposes the summon-sound preference', () => {
    const { getByLabelText } = render(<BasilDevPanel />)
    const sounds = getByLabelText('Basil summon sounds')

    fireEvent.click(sounds)

    expect($basilPresenceAudioEnabled.get()).toBe(false)
  })
})
