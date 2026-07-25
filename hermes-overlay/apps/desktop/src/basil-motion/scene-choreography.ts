import { clampParameter, normalizedParameter } from './engine'
import type { BasilParameters, BasilSceneTarget } from './types'

export type BasilScenePhase = 'approach' | 'engaged' | 'preview' | 'traverse'

interface BasilSceneProfile {
  accessoryVisibility?: number
  energy?: number
  eyeX?: number
  eyeY?: number
  float?: number
  glow?: number
  mouth?: number
  particleIntensity?: number
  rotation?: number
  squash?: number
}

const SCENE_PROFILES: Record<BasilSceneTarget, BasilSceneProfile> = {
  composer: { accessoryVisibility: 0.35, energy: 0.5, eyeY: -0.08, glow: 0.18, mouth: 0.2 },
  conversation: { energy: 0.38, mouth: 0.28 },
  data: {
    accessoryVisibility: 0.78,
    energy: 0.66,
    eyeX: 0.12,
    eyeY: 0.12,
    glow: 0.22,
    mouth: 0.2,
    particleIntensity: 0.26,
    rotation: 0.045
  },
  document: {
    accessoryVisibility: 0.55,
    energy: 0.42,
    eyeY: 0.13,
    float: 0.3,
    mouth: 0.16,
    rotation: -0.035
  },
  editor: {
    accessoryVisibility: 0.75,
    energy: 0.68,
    eyeX: 0.12,
    eyeY: 0.18,
    glow: 0.18,
    mouth: 0.22,
    particleIntensity: 0.24,
    rotation: 0.055,
    squash: 0.08
  },
  error: { energy: 0.3, eyeY: 0.16, mouth: -0.34, rotation: 0.06 },
  folder: {
    accessoryVisibility: 0.7,
    energy: 0.48,
    eyeY: 0.08,
    float: 0.34,
    mouth: 0.32,
    rotation: -0.045
  },
  image: {
    accessoryVisibility: 0.82,
    energy: 0.64,
    eyeX: 0.18,
    eyeY: -0.04,
    float: 0.42,
    glow: 0.26,
    mouth: 0.3,
    particleIntensity: 0.3,
    rotation: -0.045
  },
  permission: { accessoryVisibility: 0.8, energy: 0.38, eyeY: -0.12, mouth: -0.12 },
  rest: {},
  terminal: {
    accessoryVisibility: 0.9,
    energy: 0.76,
    eyeX: 0.16,
    glow: 0.3,
    mouth: 0.12,
    particleIntensity: 0.38,
    rotation: 0.09,
    squash: 0.1
  },
  tool: {
    accessoryVisibility: 0.75,
    energy: 0.62,
    glow: 0.2,
    mouth: 0.22,
    particleIntensity: 0.24,
    rotation: 0.05
  },
  web: {
    accessoryVisibility: 0.82,
    energy: 0.7,
    eyeX: 0.18,
    eyeY: -0.08,
    glow: 0.3,
    mouth: 0.3,
    particleIntensity: 0.32,
    rotation: 0.07
  }
}

export function applyBasilSceneChoreography(
  base: BasilParameters,
  target: BasilSceneTarget,
  phase: BasilScenePhase = 'engaged',
  objectDirectionX = 1
): BasilParameters {
  const profile = SCENE_PROFILES[target]
  const approaching = phase === 'approach'
  const previewing = phase === 'preview'
  const traversing = phase === 'traverse'
  const profileWeight = previewing ? 0.52 : 1
  const facing = objectDirectionX < -0.15 ? -1 : 1
  const directional = target !== 'rest' && target !== 'conversation'

  const weightedFloor = (baseValue: number, profileValue?: number): number => {
    if (profileValue === undefined) {
      return baseValue
    }

    return baseValue + Math.max(0, profileValue - baseValue) * profileWeight
  }

  return {
    accessoryVisibility: normalizedParameter(weightedFloor(base.accessoryVisibility, profile.accessoryVisibility)),
    blink: base.blink,
    energy: normalizedParameter(
      weightedFloor(base.energy, profile.energy) + (approaching ? 0.12 : 0) + (traversing ? 0.06 : 0)
    ),
    eyeX: clampParameter(
      (directional ? base.eyeX * facing : base.eyeX) + (profile.eyeX ?? 0) * facing * profileWeight
    ),
    eyeY: clampParameter(base.eyeY + (profile.eyeY ?? 0) * profileWeight),
    float: normalizedParameter(weightedFloor(base.float, profile.float)),
    glow: normalizedParameter(
      weightedFloor(base.glow, profile.glow) + (approaching ? 0.08 : 0) + (traversing ? 0.04 : 0)
    ),
    mouth: clampParameter(
      profile.mouth === undefined ? base.mouth : base.mouth + Math.max(0, profile.mouth - base.mouth) * profileWeight
    ),
    particleIntensity: normalizedParameter(
      weightedFloor(base.particleIntensity, profile.particleIntensity) +
        (approaching ? 0.22 : 0) +
        (traversing ? 0.14 : 0)
    ),
    rotation: clampParameter(
      (directional ? base.rotation * facing : base.rotation) + (profile.rotation ?? 0) * facing * profileWeight
    ),
    squash: clampParameter(
      base.squash +
        (profile.squash ?? 0) * profileWeight +
        (approaching ? 0.08 : 0) +
        (traversing ? 0.04 : 0)
    )
  }
}
