export type BasilSpeechMouthShape = 'open' | 'round' | 'smile' | 'soft'

export interface BasilSpeechExpressionInput {
  energy: number
  expression: number
  phase: number
}

export interface BasilSpeechExpressionPose {
  cornerLift: number
  eyeSmile: number
  mouthHeight: number
  mouthWidth: number
  openness: number
  shape: BasilSpeechMouthShape
}

function clamp(value: number, minimum = 0, maximum = 1): number {
  return Math.min(Math.max(value, minimum), maximum)
}

function normalizedPhase(value: number): number {
  return ((value % 1) + 1) % 1
}

export function deriveBasilSpeechExpression(input: BasilSpeechExpressionInput): BasilSpeechExpressionPose {
  const phase = normalizedPhase(input.phase)
  const energy = clamp(input.energy)
  const expression = clamp(input.expression, -1, 1)
  const syllable = 0.5 + Math.sin(phase * Math.PI * 6 - 0.35) * 0.5
  const roundness = 0.5 + Math.sin(phase * Math.PI * 4 + 1.1) * 0.5
  const openness = clamp((0.18 + syllable * 0.82) * (0.84 + energy * 0.16))
  const mouthWidth = 2.15 + openness * 0.95 + (1 - roundness) * 0.68
  const mouthHeight = 0.68 + openness * 2.04
  const eyeSmile = clamp((Math.sin(phase * Math.PI * 2 - 0.65) - 0.55) / 0.45)
  const cornerLift = clamp(0.3 + Math.max(0, expression) * 0.42 + (1 - openness) * 0.2)

  let shape: BasilSpeechMouthShape = 'open'

  if (openness < 0.34) {
    shape = 'soft'
  } else if (roundness > 0.7) {
    shape = 'round'
  } else if (cornerLift > 0.54) {
    shape = 'smile'
  }

  return {
    cornerLift,
    eyeSmile,
    mouthHeight,
    mouthWidth,
    openness,
    shape
  }
}
