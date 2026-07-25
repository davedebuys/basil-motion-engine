import type { BasilPersonalityDefinition, BasilPersonalityId, BasilPersonalityMotif } from './personality-pack'
import type { BasilMotionFrame } from './types'

export type BasilPersonalityStage = 'enter' | 'perform' | 'exit'

export interface BasilPersonalityPose {
  blink: number
  bodyX: number
  bodyY: number
  eyeX: number
  eyeY: number
  happyEyes: number
  id: BasilPersonalityId
  intensity: number
  label: string
  motif: BasilPersonalityMotif
  mouth: number
  occlusion: number
  progress: number
  propPhase: number
  rotation: number
  scaleX: number
  scaleY: number
  side: -1 | 1
  stage: BasilPersonalityStage
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value))
}

function ease(value: number): number {
  const t = clamp01(value)

  return t * t * (3 - 2 * t)
}

function envelope(progress: number): number {
  if (progress < 0.18) {
    return ease(progress / 0.18)
  }

  if (progress > 0.82) {
    return ease((1 - progress) / 0.18)
  }

  return 1
}

function stageForProgress(progress: number): BasilPersonalityStage {
  if (progress < 0.18) {
    return 'enter'
  }

  return progress > 0.82 ? 'exit' : 'perform'
}

export function sampleBasilPersonality(
  definition: BasilPersonalityDefinition,
  elapsedMs: number,
  side: -1 | 1 = 1,
  reducedMotion = false
): BasilPersonalityPose {
  const progress = clamp01(elapsedMs / definition.durationMs)
  const intensity = envelope(progress)
  const cycle = reducedMotion ? 0 : Math.sin(progress * Math.PI * 2)
  const quick = reducedMotion ? 0 : Math.sin(progress * Math.PI * 6)

  const pose: BasilPersonalityPose = {
    blink: 0,
    bodyX: 0,
    bodyY: 0,
    eyeX: side * 0.34,
    eyeY: 0,
    happyEyes: 0,
    id: definition.id,
    intensity,
    label: definition.label,
    motif: definition.motif,
    mouth: 0.38,
    occlusion: 0,
    progress,
    propPhase: progress,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    side,
    stage: stageForProgress(progress)
  }

  switch (definition.id) {
    case 'window-peekaboo':
      return {
        ...pose,
        bodyX: side * (16 - intensity * 8),
        eyeX: -side * 0.52,
        happyEyes: progress > 0.52 ? 0.72 : 0,
        mouth: 0.62,
        occlusion: intensity * 0.72,
        rotation: -side * (5 + cycle * 2)
      }

    case 'folder-fort':
      return {
        ...pose,
        bodyY: 12 - intensity * 5 + Math.max(0, cycle) * 2,
        eyeY: -0.3,
        happyEyes: 0.52,
        mouth: 0.55,
        occlusion: intensity * 0.68,
        rotation: side * cycle * 2
      }

    case 'caught-hiding':
      return {
        ...pose,
        blink: progress > 0.18 && progress < 0.33 ? 0.82 : 0,
        bodyX: side * (8 + intensity * 8),
        eyeX: -side * 0.68,
        mouth: 0.48,
        occlusion: intensity * 0.58,
        rotation: side * 7
      }

    case 'cursor-chase':
      return {
        ...pose,
        bodyX: side * cycle * 7,
        bodyY: -Math.abs(quick) * 3,
        eyeX: side * 0.72,
        eyeY: cycle * 0.18,
        happyEyes: progress > 0.68 ? 0.6 : 0,
        mouth: 0.52,
        rotation: side * cycle * 8,
        scaleX: 1 + Math.abs(cycle) * 0.045,
        scaleY: 1 - Math.abs(cycle) * 0.035
      }

    case 'scroll-elevator':
      return {
        ...pose,
        bodyY: cycle * 8,
        eyeX: side * 0.48,
        eyeY: Math.sign(cycle || 1) * 0.26,
        mouth: 0.44,
        rotation: -side * cycle * 4,
        scaleY: 1 + Math.abs(quick) * 0.025
      }

    case 'tab-surfing':
      return {
        ...pose,
        bodyX: cycle * 6,
        bodyY: -Math.abs(cycle) * 2,
        eyeX: Math.sign(cycle || side) * 0.5,
        happyEyes: 0.44,
        mouth: 0.62,
        rotation: cycle * 9,
        scaleX: 1.035,
        scaleY: 0.965
      }

    case 'window-surfing':
      return {
        ...pose,
        bodyX: side * cycle * 5,
        bodyY: -2 - Math.abs(quick) * 2,
        eyeX: side * 0.4,
        happyEyes: 0.56,
        mouth: 0.6,
        rotation: side * (cycle * 11),
        scaleX: 1.04,
        scaleY: 0.96
      }

    case 'typing-mimic':
      return {
        ...pose,
        blink: Math.max(0, quick) > 0.92 ? 0.7 : 0,
        bodyY: Math.max(0, quick) * 1.8,
        eyeX: side * cycle * 0.18,
        eyeY: 0.34,
        mouth: progress > 0.66 ? -0.12 : 0.28,
        rotation: cycle * 1.5,
        scaleX: 1 + Math.max(0, quick) * 0.025,
        scaleY: 1 - Math.max(0, quick) * 0.02
      }

    case 'copy-paste-courier':
      return {
        ...pose,
        bodyX: side * (cycle * 5),
        bodyY: -Math.abs(cycle) * 3,
        eyeX: side * 0.46,
        happyEyes: progress > 0.7 ? 0.68 : 0,
        mouth: 0.52,
        rotation: side * cycle * 6,
        scaleX: 1 + Math.abs(cycle) * 0.035,
        scaleY: 1 - Math.abs(cycle) * 0.025
      }

    case 'drag-assistant':
      return {
        ...pose,
        bodyX: side * 5,
        bodyY: 2 + Math.abs(cycle) * 2,
        eyeX: side * 0.62,
        eyeY: -0.12,
        mouth: -0.08,
        rotation: -side * (7 + cycle * 2),
        scaleX: 1.055,
        scaleY: 0.95
      }

    case 'download-watch':
      return {
        ...pose,
        blink: progress > 0.55 && progress < 0.61 ? 1 : 0,
        eyeX: side * 0.54,
        eyeY: 0.28,
        happyEyes: progress > 0.82 ? 0.75 : 0,
        mouth: progress > 0.82 ? 0.65 : 0.18,
        rotation: side * cycle * 1.8
      }

    case 'loading-hypnosis':
      return {
        ...pose,
        bodyX: cycle * 2,
        eyeX: Math.cos(progress * Math.PI * 6) * 0.64,
        eyeY: Math.sin(progress * Math.PI * 6) * 0.38,
        mouth: 0.12,
        rotation: cycle * 3
      }

    case 'thinking-detective':
      return {
        ...pose,
        bodyX: side * 3,
        bodyY: cycle * 1.5,
        eyeX: side * 0.66,
        eyeY: cycle * 0.16,
        mouth: 0.26,
        rotation: side * (3 + cycle * 2)
      }

    case 'error-first-aid':
      return {
        ...pose,
        blink: progress > 0.72 ? 0.55 : 0,
        bodyX: side * 2,
        eyeX: side * 0.4,
        eyeY: 0.2,
        happyEyes: progress > 0.76 ? 0.42 : 0,
        mouth: progress > 0.7 ? 0.24 : -0.35,
        rotation: -side * 4
      }

    case 'permission-guardian':
      return {
        ...pose,
        bodyX: side * 2,
        bodyY: -intensity * 2,
        eyeX: side * 0.58,
        eyeY: -0.12,
        mouth: -0.08,
        rotation: -side * 2,
        scaleX: 1.04,
        scaleY: 0.97
      }

    case 'success-high-five':
      return {
        ...pose,
        bodyX: side * intensity * 3,
        bodyY: -Math.max(0, quick) * 3,
        eyeX: side * 0.5,
        happyEyes: 0.88,
        mouth: 0.78,
        rotation: -side * (4 + cycle * 2),
        scaleX: 1 + Math.max(0, quick) * 0.04,
        scaleY: 1 - Math.max(0, quick) * 0.03
      }

    case 'welcome-back-ambush':
      return {
        ...pose,
        bodyX: side * (10 - intensity * 8),
        bodyY: -Math.max(0, quick) * 4,
        eyeX: -side * 0.45,
        happyEyes: 0.82,
        mouth: 0.76,
        occlusion: Math.max(0, 0.68 - progress * 1.4),
        rotation: side * cycle * 7
      }

    case 'focus-companion':
      return {
        ...pose,
        blink: progress > 0.5 && progress < 0.62 ? 0.9 : 0,
        bodyY: 3 + cycle * 0.8,
        eyeX: side * 0.24,
        eyeY: 0.18,
        happyEyes: 0.34,
        mouth: 0.42,
        rotation: side * 2
      }

    case 'desktop-tidy-up':
      return {
        ...pose,
        bodyX: side * cycle * 4,
        bodyY: -Math.max(0, quick) * 2,
        eyeX: side * Math.sign(cycle || 1) * 0.48,
        eyeY: 0.2,
        happyEyes: progress > 0.8 ? 0.62 : 0,
        mouth: progress > 0.8 ? 0.58 : 0.16,
        rotation: side * cycle * 5
      }

    case 'bedtime-negotiation':
      return {
        ...pose,
        blink: progress > 0.25 && progress < 0.72 ? 0.92 : 0.35,
        bodyY: 4 + Math.max(0, cycle) * 2,
        eyeX: -side * 0.18,
        eyeY: 0.3,
        happyEyes: progress > 0.75 ? 0.38 : 0,
        mouth: progress > 0.75 ? 0.28 : 0.06,
        rotation: -side * (5 + Math.max(0, cycle) * 3),
        scaleX: 1.025,
        scaleY: 0.975
      }
  }
}

export function applyBasilPersonalityToFrame(
  frame: BasilMotionFrame,
  personality?: BasilPersonalityPose | null
): BasilMotionFrame {
  if (!personality || personality.intensity <= 0) {
    return frame
  }

  const amount = personality.intensity

  return {
    ...frame,
    blink: Math.max(frame.blink, personality.blink * amount),
    eyeX: frame.eyeX * (1 - amount * 0.7) + personality.eyeX * amount,
    eyeY: frame.eyeY * (1 - amount * 0.7) + personality.eyeY * amount,
    interactionRotation: (frame.interactionRotation ?? 0) + personality.rotation * amount,
    interactionScaleX: (frame.interactionScaleX ?? 1) * (1 + (personality.scaleX - 1) * amount),
    interactionScaleY: (frame.interactionScaleY ?? 1) * (1 + (personality.scaleY - 1) * amount),
    interactionX: (frame.interactionX ?? 0) + personality.bodyX * amount,
    interactionY: (frame.interactionY ?? 0) + personality.bodyY * amount,
    mouth: frame.mouth * (1 - amount * 0.72) + personality.mouth * amount * 0.72,
    particleIntensity: Math.max(frame.particleIntensity, personality.happyEyes * amount * 0.28)
  }
}
