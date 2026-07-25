export type BasilLocomotionMode = 'brake' | 'grounded' | 'hop' | 'land' | 'roll'

export interface BasilLocomotionInput {
  acceleration: number
  directionX: number
  directionY: number
  landing: number
  phase: number
  travel: number
}

export interface BasilLocomotionPose {
  bodyRotation: number
  lift: number
  mode: BasilLocomotionMode
  scaleX: number
  scaleY: number
  shadowOpacity: number
  shadowScaleX: number
  shadowScaleY: number
  shellRotation: number
  stride: number
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum)
}

export function deriveBasilLocomotionPose(input: BasilLocomotionInput): BasilLocomotionPose {
  const travel = clamp(input.travel, 0, 1)
  const landing = clamp(input.landing, 0, 1)
  const directionLength = Math.hypot(input.directionX, input.directionY)
  const directionX = directionLength > 0.001 ? input.directionX / directionLength : 0
  const directionY = directionLength > 0.001 ? input.directionY / directionLength : 0
  const phase = ((input.phase % 1) + 1) % 1
  const cadence = phase * Math.PI * 6
  const stride = Math.sin(cadence)
  const stepLift = Math.max(0, stride)

  if (landing > 0.06) {
    return {
      bodyRotation: -directionX * landing * 3.5,
      lift: landing * 2.8,
      mode: 'land',
      scaleX: 1 + landing * 0.1,
      scaleY: 1 - landing * 0.12,
      shadowOpacity: 0.72 + landing * 0.18,
      shadowScaleX: 1 + landing * 0.2,
      shadowScaleY: 1 - landing * 0.08,
      shellRotation: 0,
      stride
    }
  }

  if (travel <= 0.045) {
    return {
      bodyRotation: 0,
      lift: 0,
      mode: 'grounded',
      scaleX: 1,
      scaleY: 1,
      shadowOpacity: 0.72,
      shadowScaleX: 1,
      shadowScaleY: 1,
      shellRotation: 0,
      stride: 0
    }
  }

  if (input.acceleration < -0.16) {
    const braking = clamp(-input.acceleration, 0, 1)

    return {
      bodyRotation: -directionX * (4 + braking * 5),
      lift: -stepLift * (1.2 + travel * 1.8),
      mode: 'brake',
      scaleX: 1 + braking * 0.06,
      scaleY: 1 - braking * 0.045,
      shadowOpacity: 0.6 + braking * 0.12,
      shadowScaleX: 1 + braking * 0.24,
      shadowScaleY: 0.92,
      shellRotation: directionX * phase * 110,
      stride
    }
  }

  const rolling = Math.abs(directionX) >= Math.abs(directionY) * 0.75

  if (rolling) {
    return {
      bodyRotation: directionX * (5 + travel * 4) + stride * 1.8,
      lift: -stepLift * (2 + travel * 3.5),
      mode: 'roll',
      scaleX: 1 + Math.abs(stride) * travel * 0.025,
      scaleY: 1 - Math.abs(stride) * travel * 0.02,
      shadowOpacity: 0.62 - stepLift * 0.18,
      shadowScaleX: 1 + travel * 0.14,
      shadowScaleY: 1 - stepLift * 0.22,
      shellRotation: directionX * phase * 360,
      stride
    }
  }

  const lift = stepLift * (5 + travel * 5)
  const stretch = Math.max(0, -stride) * travel

  return {
    bodyRotation: directionX * (2 + travel * 3),
    lift: -lift,
    mode: 'hop',
    scaleX: 1 - stretch * 0.035 + stepLift * travel * 0.04,
    scaleY: 1 + stretch * 0.07 - stepLift * travel * 0.035,
    shadowOpacity: 0.62 - stepLift * 0.24,
    shadowScaleX: 1 - stepLift * 0.22,
    shadowScaleY: 1 - stepLift * 0.3,
    shellRotation: directionX * phase * 80,
    stride
  }
}
