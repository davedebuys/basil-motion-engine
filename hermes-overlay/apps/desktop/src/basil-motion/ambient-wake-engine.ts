import type { BasilPresencePhase } from './presence-engine'

export type BasilAmbientWakeDirective = 'armed' | 'listen' | 'off' | 'pause'

export interface BasilAmbientWakeConditions {
  enabled: boolean
  playbackActive: boolean
  presence: BasilPresencePhase
}

export function deriveBasilAmbientWakeDirective({
  enabled,
  playbackActive,
  presence
}: BasilAmbientWakeConditions): BasilAmbientWakeDirective {
  if (!enabled) {
    return 'off'
  }

  if (presence !== 'hidden' && presence !== 'visible') {
    return 'armed'
  }

  if (playbackActive) {
    return 'pause'
  }

  return 'listen'
}
