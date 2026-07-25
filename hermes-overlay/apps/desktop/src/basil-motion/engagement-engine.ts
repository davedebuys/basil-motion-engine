import type { BasilScenePhase } from './scene-choreography'
import type { BasilSceneTarget } from './types'

export type BasilEngagementStage = 'act' | 'notice' | 'prepare'

export interface BasilEngagementPose {
  bodyLean: number
  eyeLift: number
  handCount: 1 | 2
  limbReach: number
  mouthLift: number
  propIntensity: number
  stage: BasilEngagementStage
}

const TWO_HAND_TARGETS = new Set<BasilSceneTarget>([
  'data',
  'document',
  'editor',
  'folder',
  'image',
  'permission',
  'terminal',
  'tool'
])

export function deriveBasilEngagementPose(
  target: BasilSceneTarget = 'rest',
  phase: BasilScenePhase = 'engaged'
): BasilEngagementPose | null {
  if (target === 'rest' || target === 'conversation' || target === 'error') {
    return null
  }

  if (phase === 'preview') {
    return {
      bodyLean: 0.45,
      eyeLift: -0.42,
      handCount: 1,
      limbReach: 0.12,
      mouthLift: 0.04,
      propIntensity: 0.56,
      stage: 'notice'
    }
  }

  if (phase === 'approach') {
    return {
      bodyLean: 1.75,
      eyeLift: 0.08,
      handCount: TWO_HAND_TARGETS.has(target) ? 2 : 1,
      limbReach: 0.64,
      mouthLift: 0.07,
      propIntensity: 0.82,
      stage: 'prepare'
    }
  }

  return {
    bodyLean: phase === 'traverse' ? 0.8 : 0,
    eyeLift: 0,
    handCount: TWO_HAND_TARGETS.has(target) ? 2 : 1,
    limbReach: 1,
    mouthLift: phase === 'traverse' ? 0.04 : 0.02,
    propIntensity: 1,
    stage: 'act'
  }
}
