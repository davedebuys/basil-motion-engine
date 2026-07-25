import type { BasilPresenceCommand, BasilPresencePhase } from './presence-engine'

export type BasilAmbientPresenceAction = 'hide' | 'summon'

export interface BasilAmbientPresenceConditions {
  command: BasilPresenceCommand | null
  presence: BasilPresencePhase
}

export function deriveBasilAmbientPresenceAction({
  command,
  presence
}: BasilAmbientPresenceConditions): BasilAmbientPresenceAction | null {
  if (command === 'summon' && presence === 'hidden') {
    return 'summon'
  }

  if (command === 'hide' && presence === 'visible') {
    return 'hide'
  }

  return null
}
