export type BasilState =
  | 'idle'
  | 'listening'
  | 'thinking'
  | 'searching'
  | 'reading'
  | 'writing'
  | 'using_tool'
  | 'awaiting_permission'
  | 'success'
  | 'error'
  | 'speaking'
  | 'sleeping'

export interface BasilParameters {
  accessoryVisibility: number
  blink: number
  energy: number
  eyeX: number
  eyeY: number
  float: number
  glow: number
  mouth: number
  particleIntensity: number
  rotation: number
  squash: number
}

export interface BasilMotionFrame extends BasilParameters {
  actorHold?: number
  actorRelease?: number
  affection?: number
  familiarity?: number
  handoff?: number
  handoffSource?: BasilSceneTarget | null
  handoffTarget?: BasilSceneTarget | null
  landing?: number
  interactionAccessory?: BasilInteractionAccessory
  interactionBeat?: number
  interactionId?: string
  interactionProgress?: number
  interactionRotation?: number
  interactionScaleX?: number
  interactionScaleY?: number
  interactionSide?: -1 | 1
  interactionX?: number
  interactionY?: number
  motionPhase?: number
  novelty?: number
  pointerApproach?: number
  pointerActive?: boolean
  pointerDeparture?: number
  pointerDepartureX?: number
  pointerDepartureY?: number
  pointerBoop?: number
  pointerTickle?: number
  pointerTickleDirection?: number
  pointerReturn?: number
  pointerReturnX?: number
  pointerReturnY?: number
  pointerDwell?: number
  pointerOrbit?: number
  pointerOrbitDirection?: number
  pointerPet?: number
  pointerPetDirection?: number
  pointerProximity?: number
  pointerSpeed?: number
  pointerVelocityX?: number
  pointerVelocityY?: number
  pointerSwipe?: number
  pointerSwipeX?: number
  pointerSwipeY?: number
  pointerX?: number
  pointerY?: number
  state: BasilState
  travel?: number
  travelAcceleration?: number
  travelX?: number
  travelY?: number
}

export type BasilInteractionAccessory =
  | 'antenna'
  | 'book'
  | 'chart'
  | 'check'
  | 'code'
  | 'compass'
  | 'confetti'
  | 'ear'
  | 'folder'
  | 'glasses'
  | 'heart'
  | 'idea'
  | 'key'
  | 'keyboard'
  | 'link'
  | 'magnifier'
  | 'moon'
  | 'pencil'
  | 'question'
  | 'shield'
  | 'spark'
  | 'speech'
  | 'terminal'
  | 'warning'
  | 'wave'

export interface BasilInteractionPlayback {
  id: string
  nonce: number
  startProgress?: number
}

export type BasilSceneTarget =
  | 'rest'
  | 'conversation'
  | 'composer'
  | 'web'
  | 'document'
  | 'image'
  | 'data'
  | 'editor'
  | 'folder'
  | 'terminal'
  | 'tool'
  | 'permission'
  | 'error'

export type BasilTaskPhase = 'complete' | 'execute' | 'inspect' | 'prepare'

export type BasilTaskJourneyStatus = 'active' | 'complete' | 'failed' | 'paused'

export type BasilTaskJourneyTransition =
  | 'advance'
  | 'complete'
  | 'fail'
  | 'pause'
  | 'repeat'
  | 'resume'
  | 'return'
  | 'start'

export interface BasilTaskJourneySnapshot {
  currentTarget: BasilSceneTarget
  eventKey: string
  previousTarget: BasilSceneTarget | null
  sessionKey: string
  status: BasilTaskJourneyStatus
  stepCount: number
  trail: BasilSceneTarget[]
  transition: BasilTaskJourneyTransition
  visitedTargets: BasilSceneTarget[]
}

export interface BasilSceneHint {
  label?: string
  resourceKind?: 'code' | 'control' | 'data' | 'document' | 'file' | 'folder' | 'image' | 'link' | 'terminal'
  taskPhase?: BasilTaskPhase
  target: BasilSceneTarget
}

export interface BasilInteractionInput {
  active: boolean
  actorHold: number
  actorRelease: number
  affection: number
  eyeX: number
  eyeY: number
  familiarity: number
  handoff: number
  handoffSource: BasilSceneTarget | null
  handoffTarget: BasilSceneTarget | null
  hover: number
  landing: number
  novelty: number
  pointerApproach: number
  pointerDeparture: number
  pointerDepartureX: number
  pointerDepartureY: number
  pointerBoop: number
  pointerTickle: number
  pointerTickleDirection: number
  pointerReturn: number
  pointerReturnX: number
  pointerReturnY: number
  pointerDwell: number
  pointerOrbit: number
  pointerOrbitDirection: number
  pointerPet: number
  pointerPetDirection: number
  pointerSpeed: number
  pointerVelocityX?: number
  pointerVelocityY?: number
  pointerSwipe: number
  pointerSwipeX: number
  pointerSwipeY: number
  press: number
  proximity: number
  reaction: number
  travel: number
  travelX: number
  travelY: number
}

export interface GenericAgentEvent {
  id?: string
  kind:
    | 'agent_error'
    | 'agent_idle'
    | 'agent_sleep'
    | 'assistant_delta'
    | 'assistant_start'
    | 'assistant_success'
    | 'awaiting_permission'
    | 'listening'
    | 'reading'
    | 'searching'
    | 'thinking'
    | 'tool_complete'
    | 'tool_start'
    | 'writing'
  label?: string
  payload?: Record<string, unknown>
  scene?: BasilSceneHint
  source?: string
}

export interface BasilStateSnapshot {
  interaction?: BasilInteractionPlayback
  journey?: BasilTaskJourneySnapshot
  lastEvent?: GenericAgentEvent
  state: BasilState
}

export type AgentEventAdapter<SourceEvent> = (event: SourceEvent) => GenericAgentEvent | null
