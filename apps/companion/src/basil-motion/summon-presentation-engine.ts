export type BasilSummonSource = 'ambient-wake' | 'direct'
export type BasilSummonSurface = 'embedded' | 'overlay'

export interface BasilSummonPresentationInput {
  overlayActive: boolean
  overlayAvailable: boolean
  source: BasilSummonSource
}

export interface BasilOverlayRetentionInput {
  ambientWakeEnabled: boolean
  presence: 'hidden' | 'hiding' | 'summoning' | 'visible'
}

export interface BasilOverlayPrimingInput extends BasilOverlayRetentionInput {
  overlayActive: boolean
  overlayAvailable: boolean
}

export function deriveBasilSummonSurface({
  overlayActive,
  overlayAvailable,
  source
}: BasilSummonPresentationInput): BasilSummonSurface {
  if (overlayActive) {
    return 'overlay'
  }

  return source === 'ambient-wake' && overlayAvailable ? 'overlay' : 'embedded'
}

export function shouldRetainBasilOverlay({
  ambientWakeEnabled,
  presence
}: BasilOverlayRetentionInput): boolean {
  return presence !== 'hidden' || ambientWakeEnabled
}

export function shouldPrimeBasilAmbientOverlay({
  ambientWakeEnabled,
  overlayActive,
  overlayAvailable,
  presence
}: BasilOverlayPrimingInput): boolean {
  return ambientWakeEnabled && overlayAvailable && !overlayActive && presence === 'hidden'
}
