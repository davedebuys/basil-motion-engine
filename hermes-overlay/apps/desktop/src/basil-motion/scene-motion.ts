import type { BasilSceneTarget } from './types'

const TAU = Math.PI * 2

export const BASIL_SCENE_TARGETS: readonly BasilSceneTarget[] = [
  'rest',
  'conversation',
  'composer',
  'folder',
  'document',
  'image',
  'data',
  'editor',
  'terminal',
  'web',
  'tool',
  'permission',
  'error'
]

export interface BasilSceneMotion {
  attentionX: number
  attentionY: number
  gesture: number
  progress: number
  propLift: number
  propRotation: number
  pulse: number
}

const STILL_MOTION: BasilSceneMotion = {
  attentionX: 0,
  attentionY: 0,
  gesture: 0,
  progress: 0,
  propLift: 0,
  propRotation: 0,
  pulse: 0
}

function normalized(value: number): number {
  return Math.max(0, Math.min(1, value))
}

export function basilSceneMotion(
  target: BasilSceneTarget = 'rest',
  phase = 0,
  energy = 0.5
): BasilSceneMotion {
  if (target === 'rest' || target === 'conversation' || target === 'permission' || target === 'error') {
    return STILL_MOTION
  }

  const p = ((phase % 1) + 1) % 1
  const strength = 0.3 + normalized(energy) * 0.7
  const wave = Math.sin(p * TAU)
  const quickWave = Math.sin(p * TAU * 3)
  const pulse = (Math.sin(p * TAU * 2) + 1) / 2

  if (target === 'document') {
    return {
      attentionX: wave * 0.7 * strength,
      attentionY: (p - 0.5) * 1.2 * strength,
      gesture: quickWave * 1.1 * strength,
      progress: p,
      propLift: -pulse * 0.7 * strength,
      propRotation: wave * 1.2 * strength,
      pulse
    }
  }

  if (target === 'image') {
    return {
      attentionX: wave * 1.05 * strength,
      attentionY: Math.cos(p * TAU) * 0.8 * strength,
      gesture: pulse * 1.1 * strength,
      progress: p,
      propLift: -pulse * 0.85 * strength,
      propRotation: wave * 1.15 * strength,
      pulse
    }
  }

  if (target === 'data') {
    return {
      attentionX: wave * 0.75 * strength,
      attentionY: (p - 0.5) * 0.75 * strength,
      gesture: quickWave * 0.9 * strength,
      progress: p,
      propLift: -pulse * 0.55 * strength,
      propRotation: wave * 0.7 * strength,
      pulse
    }
  }

  if (target === 'folder') {
    return {
      attentionX: 0.45 * strength,
      attentionY: pulse * 0.35 * strength,
      gesture: pulse * strength,
      progress: p,
      propLift: -pulse * 0.9 * strength,
      propRotation: wave * 1.6 * strength,
      pulse
    }
  }

  if (target === 'editor' || target === 'terminal') {
    const typing = Math.max(0, quickWave)

    return {
      attentionX: wave * 0.85 * strength,
      attentionY: (pulse - 0.5) * 0.45 * strength,
      gesture: typing * 1.5 * strength,
      progress: p,
      propLift: -typing * 0.45 * strength,
      propRotation: wave * 0.8 * strength,
      pulse
    }
  }

  if (target === 'web') {
    return {
      attentionX: wave * 1.05 * strength,
      attentionY: Math.cos(p * TAU) * 0.55 * strength,
      gesture: wave * 0.8 * strength,
      progress: p,
      propLift: -pulse * 0.8 * strength,
      propRotation: wave * 1.4 * strength,
      pulse
    }
  }

  if (target === 'tool') {
    return {
      attentionX: wave * 0.6 * strength,
      attentionY: quickWave * 0.25 * strength,
      gesture: quickWave * 1.2 * strength,
      progress: p,
      propLift: -pulse * 0.5 * strength,
      propRotation: wave * 1.2 * strength,
      pulse
    }
  }

  return {
    attentionX: wave * 0.45 * strength,
    attentionY: -pulse * 0.25 * strength,
    gesture: pulse * strength,
    progress: p,
    propLift: -pulse * 0.55 * strength,
    propRotation: wave * strength,
    pulse
  }
}
