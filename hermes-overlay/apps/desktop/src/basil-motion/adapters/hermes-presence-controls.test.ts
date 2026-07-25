import { afterEach, describe, expect, it, vi } from 'vitest'

import { PALETTE_AREA, type PaletteContribution } from '@/app/command-palette/contrib'
import { registry } from '@/contrib/registry'

import { $basilAmbientWakeEnabled, setBasilAmbientWakeEnabled } from '../ambient-wake'
import { $basilPresenceAudioEnabled, setBasilPresenceAudioEnabled } from '../presence-audio'

import { registerHermesBasilPresenceControls } from './hermes-presence-controls'

describe('Hermes Basil presence controls', () => {
  let dispose: (() => void) | null = null

  afterEach(() => {
    dispose?.()
    dispose = null
    setBasilAmbientWakeEnabled(false)
    setBasilPresenceAudioEnabled(true)
  })

  it('registers command-palette escape hatches that emit generic commands', () => {
    const listener = vi.fn()
    window.addEventListener('basil:presence-command', listener)
    dispose = registerHermesBasilPresenceControls()

    const commands = registry
      .getArea(PALETTE_AREA)
      .filter(item => item.id.startsWith('basil.'))
      .map(item => item.data as PaletteContribution)

    expect(commands.map(command => command.label)).toEqual([
      'Summon Basil',
      'Hide Basil',
      'Enable local Basil voice commands',
      'Mute Basil summon sounds'
    ])
    commands[0].run()
    commands[1].run()
    commands[2].run()
    commands[3].run()
    expect(listener.mock.calls.map(([event]) => (event as CustomEvent).detail)).toEqual(['summon', 'hide'])
    expect($basilAmbientWakeEnabled.get()).toBe(true)
    expect($basilPresenceAudioEnabled.get()).toBe(false)

    window.removeEventListener('basil:presence-command', listener)
  })

  it('labels the ambient control as a disable action when active', () => {
    dispose = registerHermesBasilPresenceControls(true, false)
    const commands = registry.getArea(PALETTE_AREA)
    const ambientCommand = commands.find(item => item.id === 'basil.ambient-wake')
    const audioCommand = commands.find(item => item.id === 'basil.presence-audio')

    expect((ambientCommand?.data as PaletteContribution).label).toBe('Disable local Basil voice commands')
    expect((audioCommand?.data as PaletteContribution).label).toBe('Enable Basil summon sounds')
  })
})
