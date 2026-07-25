import { $basilOverlayActive, popOutBasil } from '../basil-overlay'
import { summonBasil } from '../presence'
import {
  type BasilSummonSurface,
  deriveBasilSummonSurface
} from '../summon-presentation-engine'
import type { BasilSummonRequest } from '../summon-request'

function embeddedActorBounds(): { height: number; width: number; x: number; y: number } | null {
  const actor = document.querySelector<HTMLElement>('[data-basil-actor]')

  if (!actor) {
    return null
  }

  const bounds = actor.getBoundingClientRect()

  if (bounds.height <= 0 || bounds.width <= 0) {
    return null
  }

  return {
    height: bounds.height,
    width: bounds.width,
    x: bounds.left,
    y: bounds.top
  }
}

export async function presentHermesBasilSummon(request: BasilSummonRequest): Promise<BasilSummonSurface> {
  const overlayAvailable = Boolean(window.hermesDesktop?.basilOverlay)

  const requestedSurface = deriveBasilSummonSurface({
    overlayActive: $basilOverlayActive.get(),
    overlayAvailable,
    source: request.source
  })

  if (requestedSurface === 'embedded' || $basilOverlayActive.get()) {
    return requestedSurface
  }

  const bounds = embeddedActorBounds()

  if (!bounds) {
    return 'embedded'
  }

  await popOutBasil(bounds)

  return $basilOverlayActive.get() ? 'overlay' : 'embedded'
}

export function primeHermesBasilAmbientOverlay(): Promise<BasilSummonSurface> {
  return presentHermesBasilSummon({ source: 'ambient-wake' })
}

export async function handleHermesBasilSummonRequest(request: BasilSummonRequest): Promise<BasilSummonSurface> {
  const surface = await presentHermesBasilSummon(request)

  summonBasil()

  return surface
}
