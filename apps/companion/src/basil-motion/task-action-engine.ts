import type { BasilSceneMotion } from './scene-motion'
import type { BasilSceneTarget, BasilTaskPhase, GenericAgentEvent } from './types'

export type BasilTaskAction =
  | 'adjust'
  | 'analyze'
  | 'browse'
  | 'choose'
  | 'compare'
  | 'complete'
  | 'compose'
  | 'confirm'
  | 'edit'
  | 'frame'
  | 'inspect'
  | 'locate'
  | 'monitor'
  | 'navigate'
  | 'open'
  | 'outline'
  | 'plan'
  | 'query'
  | 'read'
  | 'review'
  | 'run'
  | 'save'
  | 'scan'
  | 'select'
  | 'send'
  | 'verify'

export type BasilTaskCue = 'check' | 'dots' | 'execute' | 'magnify' | 'none'

export interface BasilTaskActionInput {
  eventKind?: GenericAgentEvent['kind']
  phase?: BasilTaskPhase
  target: BasilSceneTarget
}

export interface BasilTaskActionPose {
  action: BasilTaskAction | 'idle'
  active: boolean
  cue: BasilTaskCue
  motionScale: number
  phase: BasilTaskPhase | 'idle'
  reverseProgress: boolean
}

type ActionSet = Record<BasilTaskPhase, BasilTaskAction>

const TARGET_ACTIONS: Partial<Record<BasilSceneTarget, ActionSet>> = {
  composer: { complete: 'send', execute: 'compose', inspect: 'review', prepare: 'outline' },
  data: { complete: 'confirm', execute: 'analyze', inspect: 'compare', prepare: 'frame' },
  document: { complete: 'complete', execute: 'read', inspect: 'review', prepare: 'locate' },
  editor: { complete: 'save', execute: 'compose', inspect: 'review', prepare: 'plan' },
  folder: { complete: 'confirm', execute: 'open', inspect: 'browse', prepare: 'locate' },
  image: { complete: 'select', execute: 'inspect', inspect: 'compare', prepare: 'frame' },
  terminal: { complete: 'complete', execute: 'run', inspect: 'monitor', prepare: 'plan' },
  tool: { complete: 'confirm', execute: 'adjust', inspect: 'verify', prepare: 'choose' },
  web: { complete: 'select', execute: 'navigate', inspect: 'scan', prepare: 'query' }
}

const PHASE_STYLE: Record<BasilTaskPhase, Pick<BasilTaskActionPose, 'cue' | 'motionScale' | 'reverseProgress'>> = {
  complete: { cue: 'check', motionScale: 0, reverseProgress: false },
  execute: { cue: 'execute', motionScale: 1, reverseProgress: false },
  inspect: { cue: 'magnify', motionScale: 0.68, reverseProgress: true },
  prepare: { cue: 'dots', motionScale: 0.18, reverseProgress: false }
}

export function deriveBasilTaskAction(input: BasilTaskActionInput): BasilTaskActionPose {
  const actions = TARGET_ACTIONS[input.target]

  if (!input.phase || !actions) {
    return { action: 'idle', active: false, cue: 'none', motionScale: 1, phase: 'idle', reverseProgress: false }
  }

  let action = actions[input.phase]

  if (input.target === 'document' && input.phase === 'execute' && input.eventKind === 'writing') {
    action = 'compose'
  }

  if (input.target === 'data' && input.phase === 'execute' && input.eventKind === 'writing') {
    action = 'edit'
  }

  return { action, active: true, phase: input.phase, ...PHASE_STYLE[input.phase] }
}

export function applyBasilTaskActionMotion(motion: BasilSceneMotion, action: BasilTaskActionPose): BasilSceneMotion {
  if (!action.active) {
    return motion
  }

  if (action.phase === 'complete') {
    return {
      attentionX: motion.attentionX * 0.2,
      attentionY: motion.attentionY * 0.2,
      gesture: 0,
      progress: 1,
      propLift: 0,
      propRotation: 0,
      pulse: 1
    }
  }

  return {
    attentionX: motion.attentionX,
    attentionY: motion.attentionY,
    gesture: motion.gesture * action.motionScale,
    progress: action.phase === 'prepare' ? 0 : action.reverseProgress ? 1 - motion.progress : motion.progress,
    propLift: motion.propLift * action.motionScale,
    propRotation: motion.propRotation * action.motionScale,
    pulse: motion.pulse * action.motionScale
  }
}
