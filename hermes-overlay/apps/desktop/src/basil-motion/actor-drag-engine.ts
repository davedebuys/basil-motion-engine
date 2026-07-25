export type BasilActorDragStage = 'held' | 'idle' | 'release'

export interface BasilActorDragInput {
  directionX: number
  directionY: number
  hold: number
  release: number
  travel: number
}

export interface BasilActorDragPose {
  active: boolean
  bodyLean: number
  grip: number
  lift: number
  release: number
  scaleX: number
  scaleY: number
  shadowOpacity: number
  shadowScale: number
  stage: BasilActorDragStage
}

function clamp(value: number, minimum = 0, maximum = 1): number {
  return Math.min(Math.max(value, minimum), maximum)
}

export function deriveBasilActorDragPose(input: BasilActorDragInput): BasilActorDragPose {
  const hold = clamp(input.hold)
  const release = clamp(input.release)
  const travel = clamp(input.travel)
  const directionLength = Math.hypot(input.directionX, input.directionY)
  const directionX = directionLength > 0.001 ? input.directionX / directionLength : 0

  if (hold > 0.01) {
    return {
      active: true,
      bodyLean: directionX * hold * (2.2 + travel * 2.8),
      grip: hold,
      lift: hold * (5 + travel * 2),
      release: 0,
      scaleX: 1 - hold * 0.018,
      scaleY: 1 + hold * 0.035,
      shadowOpacity: 1 - hold * 0.5,
      shadowScale: 1 - hold * 0.22,
      stage: 'held'
    }
  }

  if (release > 0.01) {
    return {
      active: true,
      bodyLean: 0,
      grip: 0,
      lift: release * 2,
      release,
      scaleX: 1 + release * 0.07,
      scaleY: 1 - release * 0.08,
      shadowOpacity: 1,
      shadowScale: 1 + release * 0.16,
      stage: 'release'
    }
  }

  return {
    active: false,
    bodyLean: 0,
    grip: 0,
    lift: 0,
    release: 0,
    scaleX: 1,
    scaleY: 1,
    shadowOpacity: 1,
    shadowScale: 1,
    stage: 'idle'
  }
}
