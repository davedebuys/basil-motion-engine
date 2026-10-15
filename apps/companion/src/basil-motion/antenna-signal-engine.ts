import type { BasilState } from './types'

export type BasilAntennaSignal =
  | 'alert'
  | 'calm'
  | 'guard'
  | 'process'
  | 'receive'
  | 'result'
  | 'scan'
  | 'sleep'
  | 'transmit'
  | 'work'

export interface BasilAntennaSignalInput {
  attentionStrength?: number
  attentionX?: number
  energy: number
  petting?: number
  pettingDirection?: number
  phase: number
  state: BasilState
}

export interface BasilAntennaSignalPose {
  attentionBias: number
  lean: number
  petWag: number
  pulse: number
  ringCount: 0 | 1 | 2
  ringOpacity: number
  signal: BasilAntennaSignal
  tipScale: number
}

interface BasilAntennaProfile {
  baseLean: number
  frequency: number
  pulseBase: number
  pulseRange: number
  ringCount: 0 | 1 | 2
  signal: BasilAntennaSignal
  sway: number
}

const PROFILES: Record<BasilState, BasilAntennaProfile> = {
  idle: {
    baseLean: 0,
    frequency: 1,
    pulseBase: 0.12,
    pulseRange: 0.08,
    ringCount: 0,
    signal: 'calm',
    sway: 0.8
  },
  listening: {
    baseLean: -1,
    frequency: 2,
    pulseBase: 0.48,
    pulseRange: 0.34,
    ringCount: 2,
    signal: 'receive',
    sway: 2.4
  },
  thinking: {
    baseLean: 2,
    frequency: 1.5,
    pulseBase: 0.34,
    pulseRange: 0.25,
    ringCount: 1,
    signal: 'process',
    sway: 1.7
  },
  searching: {
    baseLean: 4,
    frequency: 3,
    pulseBase: 0.5,
    pulseRange: 0.38,
    ringCount: 2,
    signal: 'scan',
    sway: 4.5
  },
  reading: {
    baseLean: -2.5,
    frequency: 1.2,
    pulseBase: 0.25,
    pulseRange: 0.18,
    ringCount: 1,
    signal: 'process',
    sway: 1.1
  },
  writing: {
    baseLean: 3,
    frequency: 2.2,
    pulseBase: 0.36,
    pulseRange: 0.25,
    ringCount: 1,
    signal: 'work',
    sway: 2.2
  },
  using_tool: {
    baseLean: 1,
    frequency: 3.5,
    pulseBase: 0.56,
    pulseRange: 0.4,
    ringCount: 2,
    signal: 'work',
    sway: 3.8
  },
  awaiting_permission: {
    baseLean: 0,
    frequency: 1,
    pulseBase: 0.38,
    pulseRange: 0.22,
    ringCount: 1,
    signal: 'guard',
    sway: 0.4
  },
  success: {
    baseLean: -2,
    frequency: 2.5,
    pulseBase: 0.58,
    pulseRange: 0.42,
    ringCount: 2,
    signal: 'result',
    sway: 2.8
  },
  error: {
    baseLean: -7,
    frequency: 1.5,
    pulseBase: 0.5,
    pulseRange: 0.32,
    ringCount: 1,
    signal: 'alert',
    sway: 1.4
  },
  speaking: {
    baseLean: 3,
    frequency: 3,
    pulseBase: 0.5,
    pulseRange: 0.36,
    ringCount: 2,
    signal: 'transmit',
    sway: 3
  },
  sleeping: {
    baseLean: 12,
    frequency: 0.5,
    pulseBase: 0.03,
    pulseRange: 0.04,
    ringCount: 0,
    signal: 'sleep',
    sway: 0.5
  }
}

function clamp(value: number, minimum = 0, maximum = 1): number {
  return Math.min(Math.max(Number.isFinite(value) ? value : minimum, minimum), maximum)
}

export function deriveBasilAntennaSignal(input: BasilAntennaSignalInput): BasilAntennaSignalPose {
  const profile = PROFILES[input.state]
  const energy = clamp(input.energy)
  const phase = Number.isFinite(input.phase) ? input.phase : 0
  const wave = (Math.sin(phase * Math.PI * 2 * profile.frequency) + 1) / 2
  const petting = clamp(input.petting ?? 0)
  const pettingDirection = clamp(input.pettingDirection ?? 0, -1, 1)
  const attentionStrength = clamp(input.attentionStrength ?? 0)
  const attentionX = clamp(input.attentionX ?? 0, -1, 1)

  const attentionGain =
    input.state === 'sleeping' ? 0.08 : input.state === 'awaiting_permission' ? 0.3 : input.state === 'error' ? 0.42 : 1

  const attentionBias = attentionX * attentionStrength * attentionGain * 3.2
  const petWag = petting * pettingDirection * (6 + Math.sin(phase * Math.PI * 6) * 4)
  const pulse = clamp(profile.pulseBase + profile.pulseRange * wave * (0.45 + energy * 0.55))

  const lean =
    profile.baseLean + Math.sin(phase * Math.PI * 2 * profile.frequency) * profile.sway + attentionBias + petWag

  return {
    attentionBias,
    lean: clamp(lean, -18, 18),
    petWag,
    pulse,
    ringCount: profile.ringCount,
    ringOpacity: clamp((pulse - 0.18) * 0.72),
    signal: profile.signal,
    tipScale: 0.9 + pulse * 0.22
  }
}
