import type { BasilEngagementStage } from './engagement-engine'
import type { BasilState } from './types'

export type BasilBrowExpression = 'concerned' | 'curious' | 'focused' | 'neutral' | 'soft'
export type BasilGazeSource = 'ambient' | 'object' | 'pointer' | 'shared'

export interface BasilGazeInput {
  ambientX: number
  ambientY: number
  engagement: BasilEngagementStage | null
  motionPhase: number
  objectIntensity: number
  objectX: number
  objectY: number
  pointerActive: boolean
  pointerApproach: number
  pointerDwell: number
  pointerProximity: number
  pointerX: number
  pointerY: number
  state: BasilState
}

export interface BasilGazePose {
  brow: BasilBrowExpression
  eyeX: number
  eyeY: number
  headTilt: number
  objectWeight: number
  pointerWeight: number
  source: BasilGazeSource
}

const USER_FACING_STATES = new Set<BasilState>(['awaiting_permission', 'error', 'listening', 'speaking', 'success'])

const WORK_STATES = new Set<BasilState>(['reading', 'searching', 'thinking', 'using_tool', 'writing'])

function clamp(value: number, minimum = 0, maximum = 1): number {
  return Math.min(Math.max(value, minimum), maximum)
}

function signed(value: number): number {
  return clamp(value, -1, 1)
}

function browFor(input: BasilGazeInput, source: BasilGazeSource): BasilBrowExpression {
  if (input.state === 'sleeping' || input.pointerDwell > 0.62) {
    return 'soft'
  }

  if (input.state === 'error') {
    return 'concerned'
  }

  if (input.state === 'awaiting_permission' || input.pointerApproach > 0.5) {
    return 'curious'
  }

  if ((source === 'object' || source === 'shared') && input.engagement === 'act' && WORK_STATES.has(input.state)) {
    return 'focused'
  }

  if (input.state === 'thinking') {
    return 'curious'
  }

  return 'neutral'
}

export function deriveBasilGazePose(input: BasilGazeInput): BasilGazePose {
  const pointerProximity = clamp(input.pointerProximity)
  const pointerApproach = clamp(input.pointerApproach)
  const pointerDwell = clamp(input.pointerDwell)
  const objectIntensity = clamp(input.objectIntensity)
  const hasObject = input.engagement !== null && objectIntensity > 0.01
  const sleeping = input.state === 'sleeping'

  let pointerWeight = input.pointerActive
    ? sleeping
      ? 0.04
      : 0.38 + pointerProximity * 0.42 + pointerApproach * 0.16 + pointerDwell * 0.1
    : 0

  if (input.pointerActive && USER_FACING_STATES.has(input.state) && !sleeping) {
    pointerWeight = Math.max(pointerWeight, 0.76 + pointerProximity * 0.2)
  }

  const stageWeight =
    input.engagement === 'notice' ? 0.66 : input.engagement === 'prepare' ? 0.62 : input.engagement === 'act' ? 0.86 : 0

  let objectWeight = hasObject ? stageWeight * objectIntensity : 0

  if (hasObject && WORK_STATES.has(input.state)) {
    objectWeight = Math.min(1, objectWeight + 0.12 * objectIntensity)
  }

  if (pointerProximity > 0.84 && !sleeping) {
    objectWeight *= 0.72
  }

  if (sleeping) {
    objectWeight *= 0.08
  }

  let source: BasilGazeSource

  if (pointerWeight < 0.08 && objectWeight < 0.08) {
    source = 'ambient'
  } else if (objectWeight > pointerWeight * 1.28) {
    source = 'object'
  } else if (pointerWeight > objectWeight * 1.28) {
    source = 'pointer'
  } else {
    source = 'shared'
  }

  if (source === 'shared') {
    const exchange = Math.sin((((input.motionPhase % 1) + 1) % 1) * Math.PI * 2) * 0.1
    pointerWeight *= 1 + exchange
    objectWeight *= 1 - exchange
  } else if (source === 'pointer') {
    pointerWeight *= 1.22
    objectWeight *= 0.82
  }

  const ambientWeight = sleeping ? 0.96 : source === 'ambient' ? 1 : 0.16
  const totalWeight = ambientWeight + pointerWeight + objectWeight

  const eyeX = signed(
    (input.ambientX * ambientWeight + input.pointerX * pointerWeight + input.objectX * objectWeight) / totalWeight
  )

  const eyeY = signed(
    (input.ambientY * ambientWeight + input.pointerY * pointerWeight + input.objectY * objectWeight) / totalWeight
  )

  const headTilt = signed(
    eyeY * 0.28 - eyeX * 0.14 + (source === 'shared' ? (input.pointerX - input.objectX) * 0.08 : 0)
  )

  return {
    brow: browFor(input, source),
    eyeX,
    eyeY,
    headTilt,
    objectWeight: clamp(objectWeight),
    pointerWeight: clamp(pointerWeight),
    source
  }
}
