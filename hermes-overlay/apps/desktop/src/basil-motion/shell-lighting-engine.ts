export interface BasilShellLightingInput {
  energy: number
  gazeX: number
  gazeY: number
}

export interface BasilShellLightingPose {
  gradientCx: number
  gradientCy: number
  highlightX: number
  highlightY: number
  rimOpacity: number
  shadowOffsetX: number
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum)
}

export function deriveBasilShellLighting(input: BasilShellLightingInput): BasilShellLightingPose {
  const gazeX = clamp(input.gazeX, -1, 1)
  const gazeY = clamp(input.gazeY, -1, 1)
  const energy = clamp(input.energy, 0, 1)

  return {
    gradientCx: 34 - gazeX * 5,
    gradientCy: 25 - gazeY * 4,
    highlightX: -gazeX * 2.4,
    highlightY: -gazeY * 1.8,
    rimOpacity: 0.11 + energy * 0.08 + Math.abs(gazeX) * 0.035,
    shadowOffsetX: gazeX * 1.8
  }
}
