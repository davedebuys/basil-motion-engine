import type { BasilEngagementStage } from './engagement-engine'
import type { BasilSceneMotion } from './scene-motion'
import type { BasilSceneTarget } from './types'

export type BasilManipulationStage = 'contact' | 'idle' | 'observe' | 'operate' | 'reach' | 'release'

export interface BasilManipulationInput {
  engagement: BasilEngagementStage | null
  landing: number
  motionPhase: number
  target: BasilSceneTarget
  travel: number
}

export interface BasilManipulationPose {
  contact: number
  contactPulse: number
  gazeLead: number
  handProgress: number
  operationProgress: number
  propResponse: number
  release: number
  stage: BasilManipulationStage
}

const MANIPULATED_TARGETS = new Set<BasilSceneTarget>([
  'composer',
  'data',
  'document',
  'editor',
  'folder',
  'image',
  'terminal',
  'tool',
  'web'
])

function clamp(value: number): number {
  return Math.min(Math.max(value, 0), 1)
}

function smoothstep(edge0: number, edge1: number, value: number): number {
  const amount = clamp((value - edge0) / Math.max(0.0001, edge1 - edge0))

  return amount * amount * (3 - 2 * amount)
}

const IDLE_POSE: BasilManipulationPose = {
  contact: 0,
  contactPulse: 0,
  gazeLead: 0,
  handProgress: 0,
  operationProgress: 0,
  propResponse: 1,
  release: 0,
  stage: 'idle'
}

export function deriveBasilManipulationPose(input: BasilManipulationInput): BasilManipulationPose {
  if (!MANIPULATED_TARGETS.has(input.target) || input.engagement === null) {
    return IDLE_POSE
  }

  if (input.engagement === 'notice') {
    return {
      contact: 0,
      contactPulse: 0,
      gazeLead: 1,
      handProgress: 0.12,
      operationProgress: 0,
      propResponse: 0,
      release: 0,
      stage: 'observe'
    }
  }

  if (input.engagement === 'prepare') {
    return {
      contact: 0,
      contactPulse: 0,
      gazeLead: 0.82,
      handProgress: 0.64,
      operationProgress: 0,
      propResponse: 0,
      release: 0,
      stage: 'reach'
    }
  }

  const landing = clamp(input.landing)
  const travel = clamp(input.travel)

  if (landing > 0.06) {
    const settled = smoothstep(0.08, 0.86, 1 - landing)

    return {
      contact: 1,
      contactPulse: landing,
      gazeLead: 0.18,
      handProgress: 1,
      operationProgress: settled,
      propResponse: settled,
      release: 0,
      stage: settled > 0.72 ? 'operate' : 'contact'
    }
  }

  if (travel > 0.08) {
    return {
      contact: 1,
      contactPulse: 0,
      gazeLead: 0.2,
      handProgress: 1,
      operationProgress: ((input.motionPhase % 1) + 1) % 1,
      propResponse: 1,
      release: 0,
      stage: 'operate'
    }
  }

  const phase = ((input.motionPhase % 1) + 1) % 1
  const reach = smoothstep(0.06, 0.25, phase)
  const release = smoothstep(0.86, 0.98, phase)
  const contact = clamp(smoothstep(0.22, 0.32, phase) - release)
  const propResponse = clamp(smoothstep(0.31, 0.42, phase) - release)
  const operationProgress = clamp((phase - 0.34) / 0.5)
  const contactPulse = clamp(1 - Math.abs(phase - 0.3) / 0.055)

  const stage =
    phase < 0.13 ? 'observe' : phase < 0.3 ? 'reach' : phase < 0.42 ? 'contact' : phase < 0.86 ? 'operate' : 'release'

  return {
    contact,
    contactPulse,
    gazeLead: 1 - reach * 0.82,
    handProgress: clamp(0.76 + reach * 0.24 - release * 0.16),
    operationProgress,
    propResponse,
    release,
    stage
  }
}

export function applyBasilManipulationMotion(
  motion: BasilSceneMotion,
  manipulation: BasilManipulationPose
): BasilSceneMotion {
  if (manipulation.stage === 'idle') {
    return motion
  }

  if (manipulation.propResponse === 0) {
    return {
      attentionX: motion.attentionX,
      attentionY: motion.attentionY,
      gesture: 0,
      progress: 0,
      propLift: 0,
      propRotation: 0,
      pulse: 0
    }
  }

  return {
    attentionX: motion.attentionX,
    attentionY: motion.attentionY,
    gesture: motion.gesture * manipulation.propResponse,
    progress: motion.progress * manipulation.operationProgress,
    propLift: motion.propLift * manipulation.propResponse,
    propRotation: motion.propRotation * manipulation.propResponse,
    pulse: motion.pulse * manipulation.propResponse
  }
}
