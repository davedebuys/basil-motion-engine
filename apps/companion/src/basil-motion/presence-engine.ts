export type BasilPresenceCommand = 'hide' | 'summon'
export type BasilPresencePhase = 'hidden' | 'hiding' | 'summoning' | 'visible'

export interface BasilPresencePose {
  cueOpacity: number
  glow: number
  opacity: number
  particleIntensity: number
  phase: BasilPresencePhase
  portalWidth: number
  progress: number
  ringOpacity: number
  ringScale: number
  rotation: number
  scaleX: number
  scaleY: number
  starOpacity: number
  translateY: number
}

export const BASIL_SUMMON_DURATION_MS = 1_120
export const BASIL_HIDE_DURATION_MS = 880

const clamp01 = (value: number) => Math.max(0, Math.min(1, value))
const mix = (from: number, to: number, amount: number) => from + (to - from) * amount

function smoothstep(from: number, to: number, value: number): number {
  const progress = clamp01((value - from) / (to - from))

  return progress * progress * (3 - 2 * progress)
}

function easeOutBack(value: number): number {
  const progress = clamp01(value)
  const overshoot = 1.70158
  const shifted = progress - 1

  return 1 + (overshoot + 1) * shifted ** 3 + overshoot * shifted ** 2
}

function visiblePose(phase: BasilPresencePhase, progress: number): BasilPresencePose {
  return {
    cueOpacity: 0,
    glow: 0,
    opacity: 1,
    particleIntensity: 0,
    phase,
    portalWidth: 0,
    progress,
    ringOpacity: 0,
    ringScale: 1,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    starOpacity: 0,
    translateY: 0
  }
}

function hiddenPose(phase: BasilPresencePhase, progress: number): BasilPresencePose {
  return {
    ...visiblePose(phase, progress),
    opacity: 0,
    scaleX: 0.04,
    scaleY: 0.02,
    translateY: 30
  }
}

export function basilPresenceDuration(phase: BasilPresencePhase): number {
  if (phase === 'summoning') {
    return BASIL_SUMMON_DURATION_MS
  }

  if (phase === 'hiding') {
    return BASIL_HIDE_DURATION_MS
  }

  return 0
}

export function sampleBasilPresence(
  phase: BasilPresencePhase,
  elapsedMs: number,
  reducedMotion = false
): BasilPresencePose {
  if (phase === 'visible') {
    return visiblePose(phase, 1)
  }

  if (phase === 'hidden') {
    return hiddenPose(phase, 1)
  }

  const duration = basilPresenceDuration(phase)
  const progress = clamp01(duration > 0 ? elapsedMs / duration : 1)

  if (reducedMotion) {
    const visibility = phase === 'summoning' ? smoothstep(0, 0.7, progress) : 1 - smoothstep(0.18, 1, progress)

    return {
      ...visiblePose(phase, progress),
      cueOpacity: Math.sin(Math.PI * progress) * 0.28,
      opacity: visibility,
      ringOpacity: Math.sin(Math.PI * progress) * 0.24,
      ringScale: mix(0.9, 1.06, progress),
      scaleX: mix(0.94, 1, visibility),
      scaleY: mix(0.94, 1, visibility),
      translateY: mix(4, 0, visibility)
    }
  }

  if (phase === 'summoning') {
    const arrival = easeOutBack(smoothstep(0.08, 0.82, progress))
    const settle = smoothstep(0.72, 1, progress)
    const squashBeat = Math.sin(Math.PI * smoothstep(0.38, 0.78, progress))
    const visibility = smoothstep(0.04, 0.36, progress)
    const cueFade = 1 - smoothstep(0.68, 1, progress)

    return {
      cueOpacity: cueFade,
      glow: Math.sin(Math.PI * progress) * 0.72,
      opacity: visibility,
      particleIntensity: Math.sin(Math.PI * smoothstep(0.18, 0.9, progress)),
      phase,
      portalWidth: mix(0.12, 1, smoothstep(0, 0.42, progress)) * cueFade,
      progress,
      ringOpacity: Math.sin(Math.PI * smoothstep(0, 0.76, progress)) * cueFade,
      ringScale: mix(0.48, 1.18, smoothstep(0, 0.64, progress)),
      rotation: mix(-16, 2.5, arrival) * (1 - settle),
      scaleX: mix(0.08, 1, arrival) + squashBeat * 0.08 * (1 - settle),
      scaleY: mix(0.03, 1, arrival) - squashBeat * 0.09 * (1 - settle),
      starOpacity: Math.sin(Math.PI * smoothstep(0.05, 0.82, progress)) * cueFade,
      translateY: mix(34, 0, arrival)
    }
  }

  const farewell = smoothstep(0.24, 1, progress)
  const hop = Math.sin(Math.PI * smoothstep(0, 0.34, progress))
  const visibility = 1 - smoothstep(0.62, 1, progress)
  const cueRise = smoothstep(0.18, 0.55, progress)

  return {
    cueOpacity: cueRise,
    glow: Math.sin(Math.PI * progress) * 0.4,
    opacity: visibility,
    particleIntensity: Math.sin(Math.PI * smoothstep(0.34, 1, progress)) * 0.5,
    phase,
    portalWidth: smoothstep(0.28, 0.72, progress) * (1 - smoothstep(0.88, 1, progress)),
    progress,
    ringOpacity: Math.sin(Math.PI * smoothstep(0.2, 1, progress)) * 0.7,
    ringScale: mix(1.12, 0.5, farewell),
    rotation: hop * 9 - farewell * 7,
    scaleX: mix(1, 0.08, farewell) + hop * 0.04,
    scaleY: mix(1, 0.025, farewell) - hop * 0.05,
    starOpacity: Math.sin(Math.PI * smoothstep(0.12, 0.86, progress)) * 0.72,
    translateY: hop * -8 + farewell * 34
  }
}
