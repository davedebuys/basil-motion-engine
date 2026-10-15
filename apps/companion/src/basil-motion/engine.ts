import type { BasilParameters, BasilState, BasilStateSnapshot, GenericAgentEvent } from './types'

export const BASIL_STATES: readonly BasilState[] = [
  'idle',
  'listening',
  'thinking',
  'searching',
  'reading',
  'writing',
  'using_tool',
  'awaiting_permission',
  'success',
  'error',
  'speaking',
  'sleeping'
]

export const BASIL_DEFAULT_PARAMETERS: BasilParameters = {
  accessoryVisibility: 0,
  blink: 0,
  energy: 0.3,
  eyeX: 0,
  eyeY: 0,
  float: 0.35,
  glow: 0.08,
  mouth: 0.2,
  particleIntensity: 0,
  rotation: 0,
  squash: 0
}

export const BASIL_STATE_TARGETS: Record<BasilState, BasilParameters> = {
  idle: {
    ...BASIL_DEFAULT_PARAMETERS,
    energy: 0.28,
    float: 0.28,
    mouth: 0.25
  },
  listening: {
    ...BASIL_DEFAULT_PARAMETERS,
    accessoryVisibility: 0.35,
    energy: 0.52,
    eyeY: -0.12,
    float: 0.48,
    glow: 0.22,
    mouth: 0.1,
    particleIntensity: 0.12
  },
  thinking: {
    ...BASIL_DEFAULT_PARAMETERS,
    accessoryVisibility: 0.78,
    energy: 0.62,
    eyeX: 0.22,
    eyeY: -0.08,
    float: 0.42,
    glow: 0.18,
    mouth: -0.06,
    particleIntensity: 0.18,
    rotation: -0.08
  },
  searching: {
    ...BASIL_DEFAULT_PARAMETERS,
    accessoryVisibility: 0.9,
    energy: 0.76,
    eyeX: 0.42,
    eyeY: -0.12,
    float: 0.56,
    glow: 0.34,
    mouth: 0.08,
    particleIntensity: 0.48,
    rotation: 0.2,
    squash: 0.08
  },
  reading: {
    ...BASIL_DEFAULT_PARAMETERS,
    accessoryVisibility: 0.55,
    energy: 0.46,
    eyeX: -0.28,
    eyeY: 0.16,
    float: 0.3,
    glow: 0.12,
    mouth: 0.02,
    particleIntensity: 0.08,
    rotation: -0.05
  },
  writing: {
    ...BASIL_DEFAULT_PARAMETERS,
    accessoryVisibility: 0.7,
    energy: 0.7,
    eyeX: 0.28,
    eyeY: 0.2,
    float: 0.36,
    glow: 0.2,
    mouth: 0.18,
    particleIntensity: 0.34,
    rotation: 0.1,
    squash: 0.16
  },
  using_tool: {
    ...BASIL_DEFAULT_PARAMETERS,
    accessoryVisibility: 1,
    energy: 0.82,
    eyeX: 0.12,
    float: 0.55,
    glow: 0.3,
    mouth: 0.05,
    particleIntensity: 0.52,
    rotation: 0.28,
    squash: 0.12
  },
  awaiting_permission: {
    ...BASIL_DEFAULT_PARAMETERS,
    accessoryVisibility: 1,
    energy: 0.38,
    eyeY: -0.25,
    float: 0.16,
    glow: 0.12,
    mouth: -0.22,
    particleIntensity: 0.08,
    rotation: 0.02,
    squash: -0.08
  },
  success: {
    ...BASIL_DEFAULT_PARAMETERS,
    accessoryVisibility: 0.68,
    energy: 0.66,
    eyeY: -0.1,
    float: 0.58,
    glow: 0.32,
    mouth: 0.58,
    particleIntensity: 0.36,
    rotation: -0.12,
    squash: 0.18
  },
  error: {
    ...BASIL_DEFAULT_PARAMETERS,
    accessoryVisibility: 0.5,
    energy: 0.3,
    eyeY: 0.22,
    float: 0.12,
    glow: 0.05,
    mouth: -0.48,
    particleIntensity: 0.18,
    rotation: 0.16,
    squash: -0.16
  },
  speaking: {
    ...BASIL_DEFAULT_PARAMETERS,
    energy: 0.58,
    eyeX: -0.08,
    float: 0.44,
    glow: 0.2,
    mouth: 0.42,
    particleIntensity: 0.18,
    squash: 0.08
  },
  sleeping: {
    ...BASIL_DEFAULT_PARAMETERS,
    accessoryVisibility: 0.82,
    blink: 1,
    energy: 0.08,
    eyeY: 0.28,
    float: 0.08,
    glow: 0,
    mouth: 0.05,
    rotation: -0.1,
    squash: -0.12
  }
}

const GENERIC_STATE_MAP: Record<GenericAgentEvent['kind'], BasilState> = {
  agent_error: 'error',
  agent_idle: 'idle',
  agent_sleep: 'sleeping',
  assistant_delta: 'speaking',
  assistant_start: 'thinking',
  assistant_success: 'success',
  awaiting_permission: 'awaiting_permission',
  listening: 'listening',
  reading: 'reading',
  searching: 'searching',
  thinking: 'thinking',
  tool_complete: 'thinking',
  tool_start: 'using_tool',
  writing: 'writing'
}

export function stateForGenericAgentEvent(event: GenericAgentEvent): BasilState {
  return GENERIC_STATE_MAP[event.kind]
}

export function reduceBasilState(snapshot: BasilStateSnapshot, event: GenericAgentEvent): BasilStateSnapshot {
  return {
    lastEvent: event,
    state: stateForGenericAgentEvent(event)
  }
}

export function clampParameter(value: number): number {
  return Math.max(-1, Math.min(1, value))
}

export function normalizedParameter(value: number): number {
  return Math.max(0, Math.min(1, value))
}

function mix(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export function interpolateBasilParameters(
  current: BasilParameters,
  target: BasilParameters,
  dtMs: number
): BasilParameters {
  const t = 1 - Math.exp(-Math.max(0, dtMs) / 130)

  return {
    accessoryVisibility: normalizedParameter(mix(current.accessoryVisibility, target.accessoryVisibility, t)),
    blink: normalizedParameter(mix(current.blink, target.blink, t)),
    energy: normalizedParameter(mix(current.energy, target.energy, t)),
    eyeX: clampParameter(mix(current.eyeX, target.eyeX, t)),
    eyeY: clampParameter(mix(current.eyeY, target.eyeY, t)),
    float: normalizedParameter(mix(current.float, target.float, t)),
    glow: normalizedParameter(mix(current.glow, target.glow, t)),
    mouth: clampParameter(mix(current.mouth, target.mouth, t)),
    particleIntensity: normalizedParameter(mix(current.particleIntensity, target.particleIntensity, t)),
    rotation: clampParameter(mix(current.rotation, target.rotation, t)),
    squash: clampParameter(mix(current.squash, target.squash, t))
  }
}
