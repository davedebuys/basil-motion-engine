import type { BasilSceneTarget } from './types'

export type BasilExternalActivityKind =
  | 'adjusting'
  | 'departing'
  | 'invoking'
  | 'organizing'
  | 'resizing'
  | 'selecting'
  | 'surfing'
  | 'typing'
export type BasilExternalActivityVariant = 'add' | 'remove' | 'reorder'

export interface BasilExternalActivityInput {
  directionX?: number
  directionY?: number
  intensity: number
  kind: BasilExternalActivityKind
  motionPhase: number
  target: BasilSceneTarget
  variant?: BasilExternalActivityVariant
}

export interface BasilExternalActivityPose {
  active: boolean
  attentionY: number
  bodyLean: number
  directionX: number
  directionY: number
  gesture: number
  intensity: number
  kind: BasilExternalActivityKind | null
  progress: number
  propLift: number
  propRotation: number
  pulse: number
  variant: BasilExternalActivityVariant | null
}

const TYPING_TARGETS = new Set<BasilSceneTarget>(['data', 'document', 'editor', 'terminal'])

const SELECTION_TARGETS = new Set<BasilSceneTarget>(['data', 'document', 'editor', 'folder', 'image', 'tool', 'web'])

const ADJUSTMENT_TARGETS = new Set<BasilSceneTarget>(['data', 'tool'])

const DEPARTING_TARGETS = new Set<BasilSceneTarget>([
  'data',
  'document',
  'editor',
  'folder',
  'image',
  'terminal',
  'tool',
  'web'
])

const INVOKING_TARGETS = new Set<BasilSceneTarget>(['tool', 'web'])
const ORGANIZING_TARGETS = new Set<BasilSceneTarget>(['data', 'document', 'folder'])
const RESIZING_TARGETS = DEPARTING_TARGETS
const SURFING_TARGETS = DEPARTING_TARGETS

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value))
}

export function deriveBasilExternalActivityPose(input: BasilExternalActivityInput | null): BasilExternalActivityPose {
  const supported =
    input?.kind === 'typing'
      ? TYPING_TARGETS.has(input.target)
      : input?.kind === 'selecting'
        ? SELECTION_TARGETS.has(input.target)
        : input?.kind === 'adjusting'
          ? ADJUSTMENT_TARGETS.has(input.target)
          : input?.kind === 'departing'
            ? DEPARTING_TARGETS.has(input.target)
            : input?.kind === 'invoking'
              ? INVOKING_TARGETS.has(input.target)
              : input?.kind === 'organizing'
                ? ORGANIZING_TARGETS.has(input.target)
                : input?.kind === 'resizing'
                  ? RESIZING_TARGETS.has(input.target)
                  : input?.kind === 'surfing'
                    ? SURFING_TARGETS.has(input.target)
                    : false

  if (!input || !supported) {
    return {
      active: false,
      attentionY: 0,
      bodyLean: 0,
      directionX: 0,
      directionY: 0,
      gesture: 0,
      intensity: 0,
      kind: null,
      progress: 0,
      propLift: 0,
      propRotation: 0,
      pulse: 0,
      variant: null
    }
  }

  const intensity = clamp01(input.intensity)
  const selecting = input.kind === 'selecting'
  const adjusting = input.kind === 'adjusting'
  const departing = input.kind === 'departing'
  const invoking = input.kind === 'invoking'
  const organizing = input.kind === 'organizing'
  const resizing = input.kind === 'resizing'
  const surfing = input.kind === 'surfing'
  const directionX = Math.max(-1, Math.min(1, input.directionX ?? 0))
  const directionY = Math.max(-1, Math.min(1, input.directionY ?? 0))

  const beat =
    (input.motionPhase *
      (selecting
        ? 1.9
        : adjusting
          ? 2.2
          : departing
            ? 1.7
            : invoking
              ? 2.5
              : organizing
                ? 1.75
                : resizing
                  ? 2.05
                  : surfing
                    ? 2.35
                  : 2.75)) %
    1

  const alternating = Math.sin(
    input.motionPhase *
      Math.PI *
      (selecting
        ? 5
        : adjusting
          ? 7
          : departing
            ? 4
            : invoking
              ? 6
              : organizing
                ? 4
                : resizing
                  ? 5
                  : surfing
                    ? 7
                    : 11)
  )

  const pulse =
    (selecting
      ? 0.62 + Math.max(0, alternating) * 0.38
      : adjusting
        ? 0.55 + Math.abs(alternating) * 0.45
        : departing
          ? 0.58 + Math.abs(alternating) * 0.42
          : invoking
            ? 0.66 + Math.max(0, alternating) * 0.34
            : organizing
              ? 0.5 + Math.max(0, alternating) * 0.5
              : resizing
                ? 0.58 + Math.abs(alternating) * 0.42
                : surfing
                  ? 0.62 + Math.abs(alternating) * 0.38
                : 0.45 + Math.abs(alternating) * 0.55) * intensity

  return {
    active: intensity > 0.01,
    attentionY:
      (selecting
        ? -0.09
        : adjusting
          ? 0.04
          : departing
            ? -0.12
            : invoking
              ? -0.07
              : organizing
                ? -0.02
                : resizing
                  ? -0.06
                  : surfing
                    ? directionY * 0.08 - 0.04
                  : 0.16) *
      intensity,
    bodyLean: resizing
      ? alternating * 3.8 * intensity
      : surfing
        ? (-directionX * 5.2 + alternating * 1.1) * intensity
        : 0,
    directionX,
    directionY,
    gesture:
      (selecting
        ? 0.58 + pulse * 0.42
        : adjusting
          ? 0.5 + pulse * 0.5
          : departing
            ? 0.64 + pulse * 0.36
            : invoking
              ? 0.68 + pulse * 0.32
              : organizing
                ? 0.54 + pulse * 0.46
                : resizing
                  ? 0.7 + pulse * 0.3
                  : surfing
                    ? 0.72 + pulse * 0.28
                  : 0.42 + pulse * 0.58) * intensity,
    intensity,
    kind: input.kind,
    progress: beat,
    propLift:
      -pulse *
      (selecting
        ? 2.1
        : adjusting
          ? 1.1
          : departing
            ? 2.6
            : invoking
              ? 2.3
              : organizing
                ? 1.7
                : resizing
                  ? 1.9
                  : surfing
                    ? 2.2
                    : 1.4),
    propRotation: adjusting
      ? (beat * 2 - 1) * 7 * intensity
      : alternating *
        (selecting
          ? 0.9
          : departing
            ? 3.2
            : invoking
              ? 0.7
              : organizing
                ? 1.2
                : resizing
                  ? 1.5
                  : surfing
                    ? directionY * 4 + alternating * 0.8
                    : 1.8) *
        intensity,
    pulse,
    variant: organizing ? (input.variant ?? 'reorder') : null
  }
}
