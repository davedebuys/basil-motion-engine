import { PALETTE_AREA, type PaletteContribution } from '@/app/command-palette/contrib'
import { registry } from '@/contrib/registry'

import { toggleBasilAmbientWake } from '../ambient-wake'
import { emitBasilPresenceCommand } from '../presence'
import { toggleBasilPresenceAudio } from '../presence-audio'

export function registerHermesBasilPresenceControls(
  ambientWakeEnabled = false,
  presenceAudioEnabled = true
): () => void {
  return registry.registerMany([
    {
      area: PALETTE_AREA,
      data: {
        id: 'basil.summon',
        keywords: ['basil', 'appear', 'come out', 'show', 'wake'],
        label: 'Summon Basil',
        run: () => emitBasilPresenceCommand('summon')
      } satisfies PaletteContribution,
      id: 'basil.summon',
      source: 'core'
    },
    {
      area: PALETTE_AREA,
      data: {
        id: 'basil.hide',
        keywords: ['basil', 'disappear', 'hide', 'sleep'],
        label: 'Hide Basil',
        run: () => emitBasilPresenceCommand('hide')
      } satisfies PaletteContribution,
      id: 'basil.hide',
      source: 'core'
    },
    {
      area: PALETTE_AREA,
      data: {
        id: 'basil.ambient-wake',
        keywords: ['ambient', 'basil', 'hide', 'local', 'microphone', 'summon', 'voice', 'wake'],
        label: ambientWakeEnabled ? 'Disable local Basil voice commands' : 'Enable local Basil voice commands',
        run: toggleBasilAmbientWake
      } satisfies PaletteContribution,
      id: 'basil.ambient-wake',
      source: 'core'
    },
    {
      area: PALETTE_AREA,
      data: {
        id: 'basil.presence-audio',
        keywords: ['audio', 'basil', 'chime', 'mute', 'sound'],
        label: presenceAudioEnabled ? 'Mute Basil summon sounds' : 'Enable Basil summon sounds',
        run: toggleBasilPresenceAudio
      } satisfies PaletteContribution,
      id: 'basil.presence-audio',
      source: 'core'
    }
  ])
}
