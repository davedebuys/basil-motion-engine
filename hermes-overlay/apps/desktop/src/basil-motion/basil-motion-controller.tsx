import { useStore } from '@nanostores/react'
import { useEffect } from 'react'

import { onGatewayEvent } from '@/contrib/events'
import { isSecondaryWindow } from '@/store/windows'

import { hermesToGenericAgentEvent } from './adapters/hermes'
import { HermesBasilAmbientWakeController } from './adapters/hermes-ambient-wake-controller'
import { registerHermesBasilPresenceControls } from './adapters/hermes-presence-controls'
import {
  handleHermesBasilSummonRequest,
  primeHermesBasilAmbientOverlay
} from './adapters/hermes-summon-presentation'
import { $basilAmbientWakeEnabled } from './ambient-wake'
import { BasilMotionStage } from './basil-motion-stage'
import { $basilOverlayActive, initBasilOverlayBridge, restoreBasilOverlay } from './basil-overlay'
import { $basilPresence, hideBasil, onBasilPresenceCommand, summonBasil } from './presence'
import { $basilPresenceAudioEnabled } from './presence-audio'
import { applyBasilAgentEvent } from './store'
import { shouldPrimeBasilAmbientOverlay } from './summon-presentation-engine'
import { onBasilSummonRequest } from './summon-request'
import { useBasilPresenceAudio } from './use-basil-presence-audio'

export function BasilMotionController() {
  const ambientWakeEnabled = useStore($basilAmbientWakeEnabled)
  const overlayActive = useStore($basilOverlayActive)
  const presence = useStore($basilPresence)
  const presenceAudioEnabled = useStore($basilPresenceAudioEnabled)
  const secondaryWindow = isSecondaryWindow()

  useBasilPresenceAudio({ active: !secondaryWindow })

  useEffect(
    () =>
      onGatewayEvent('*', event => {
        const generic = hermesToGenericAgentEvent(event)

        if (generic) {
          applyBasilAgentEvent(generic)
        }
      }),
    []
  )

  useEffect(() => {
    const dispose = initBasilOverlayBridge()
    restoreBasilOverlay()

    return dispose
  }, [])

  useEffect(
    () =>
      onBasilPresenceCommand(command => {
        if (command === 'summon') {
          summonBasil()
        } else {
          hideBasil()
        }
      }),
    []
  )

  useEffect(
    () =>
      onBasilSummonRequest(request => {
        void handleHermesBasilSummonRequest(request)
      }),
    []
  )

  useEffect(() => {
    if (
      shouldPrimeBasilAmbientOverlay({
        ambientWakeEnabled,
        overlayActive,
        overlayAvailable: Boolean(window.hermesDesktop?.basilOverlay),
        presence: presence.phase
      })
    ) {
      void primeHermesBasilAmbientOverlay()
    }
  }, [ambientWakeEnabled, overlayActive, presence.phase])

  useEffect(
    () => registerHermesBasilPresenceControls(ambientWakeEnabled, presenceAudioEnabled),
    [ambientWakeEnabled, presenceAudioEnabled]
  )

  if (secondaryWindow) {
    return null
  }

  return (
    <>
      <HermesBasilAmbientWakeController />
      <BasilMotionStage />
    </>
  )
}
