import type { BasilGazePose } from './gaze-engine'
import type { BasilManipulationPose } from './manipulation-engine'
import type { BasilState } from './types'

export type BasilFaceIntent = 'ambient' | 'check_in' | 'coordinate' | 'focus' | 'orient' | 'sleep'

export interface BasilFaceIntentInput {
  gaze: BasilGazePose
  manipulation: BasilManipulationPose
  objectX: number
  objectY: number
  pointerActive: boolean
  pointerApproach: number
  pointerDwell: number
  pointerProximity: number
  pointerSpeed: number
  pointerX: number
  pointerY: number
  state: BasilState
}

export interface BasilFaceIntentPose {
  eyeScaleY: number
  eyeSpacing: number
  eyeX: number
  eyeY: number
  faceX: number
  faceY: number
  focus: number
  intent: BasilFaceIntent
  leftEyeScaleX: number
  rightEyeScaleX: number
}

const WORK_STATES = new Set<BasilState>(['reading', 'searching', 'thinking', 'using_tool', 'writing'])
const USER_FACING_STATES = new Set<BasilState>(['awaiting_permission', 'error', 'listening', 'speaking', 'success'])

function clamp(value: number, minimum = 0, maximum = 1): number {
  return Math.min(Math.max(value, minimum), maximum)
}

function signed(value: number): number {
  return clamp(value, -1, 1)
}

function mix(from: number, to: number, amount: number): number {
  return from + (to - from) * clamp(amount)
}

function faceIntent(
  input: BasilFaceIntentInput,
  objectLead: number,
  pointerCheck: number
): BasilFaceIntent {
  if (input.state === 'sleeping') {
    return 'sleep'
  }

  if (
    input.pointerActive &&
    (USER_FACING_STATES.has(input.state) ||
      (input.gaze.source === 'pointer' && input.manipulation.stage === 'idle') ||
      input.manipulation.stage === 'release' ||
      pointerCheck > 0.34)
  ) {
    return 'check_in'
  }

  if (objectLead > 0.14 && (input.manipulation.stage === 'observe' || input.manipulation.stage === 'reach')) {
    return 'orient'
  }

  if (
    WORK_STATES.has(input.state) &&
    (input.manipulation.stage === 'contact' || input.manipulation.stage === 'operate')
  ) {
    return input.gaze.source === 'shared' ? 'coordinate' : 'focus'
  }

  if (input.gaze.source === 'shared') {
    return 'coordinate'
  }

  return 'ambient'
}

export function deriveBasilFaceIntentPose(input: BasilFaceIntentInput): BasilFaceIntentPose {
  if (input.state === 'sleeping') {
    return {
      eyeScaleY: 1,
      eyeSpacing: 1,
      eyeX: signed(input.gaze.eyeX * 0.08),
      eyeY: signed(input.gaze.eyeY * 0.08),
      faceX: 0,
      faceY: 0.18,
      focus: 0,
      intent: 'sleep',
      leftEyeScaleX: 1,
      rightEyeScaleX: 1
    }
  }

  const pointerApproach = clamp(input.pointerApproach)
  const pointerDwell = clamp(input.pointerDwell)
  const pointerProximity = clamp(input.pointerProximity)
  const pointerSpeed = clamp(input.pointerSpeed)

  const activeObject =
    input.manipulation.stage !== 'idle' && input.manipulation.stage !== 'release'

  const pointerAlert = input.pointerActive
    ? clamp(pointerApproach * 0.62 + pointerSpeed * 0.28 + pointerProximity * 0.1)
    : 0

  const objectLead = activeObject
    ? clamp(input.manipulation.gazeLead * input.gaze.objectWeight * (1 - pointerAlert * 0.42))
    : 0

  const socialCheck = input.pointerActive && USER_FACING_STATES.has(input.state) ? 0.68 : 0
  const releaseCheck = input.pointerActive && input.manipulation.stage === 'release' ? 0.58 : 0
  const movingCheck = input.pointerActive ? pointerAlert * (WORK_STATES.has(input.state) ? 0.42 : 0.62) : 0
  const pointerCheck = clamp(Math.max(socialCheck, releaseCheck, movingCheck))

  let eyeX = input.gaze.eyeX
  let eyeY = input.gaze.eyeY

  eyeX = mix(eyeX, input.objectX, objectLead * 0.34)
  eyeY = mix(eyeY, input.objectY, objectLead * 0.34)
  eyeX = mix(eyeX, input.pointerX, pointerCheck)
  eyeY = mix(eyeY, input.pointerY, pointerCheck)

  eyeX = signed(eyeX)
  eyeY = signed(eyeY)

  const workFocus =
    WORK_STATES.has(input.state) &&
    (input.manipulation.stage === 'contact' || input.manipulation.stage === 'operate')
      ? 0.72
      : objectLead * 0.58

  const focus = clamp(workFocus + pointerDwell * 0.12)
  const yaw = eyeX
  const yawMagnitude = Math.abs(yaw)
  const approachOpen = pointerApproach * 0.12
  const focusNarrow = focus * 0.075

  return {
    eyeScaleY: clamp(1 - focusNarrow + approachOpen, 0.88, 1.14),
    eyeSpacing: clamp(1 - yawMagnitude * 0.07, 0.92, 1),
    eyeX,
    eyeY,
    faceX: yaw * 1.72,
    faceY: eyeY * 0.76,
    focus,
    intent: faceIntent(input, objectLead, pointerCheck),
    leftEyeScaleX: clamp(1 + Math.max(-yaw, 0) * 0.045 - Math.max(yaw, 0) * 0.08, 0.91, 1.05),
    rightEyeScaleX: clamp(1 + Math.max(yaw, 0) * 0.045 - Math.max(-yaw, 0) * 0.08, 0.91, 1.05)
  }
}
