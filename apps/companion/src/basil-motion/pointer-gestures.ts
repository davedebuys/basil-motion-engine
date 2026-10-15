import type { BasilPoint } from './spatial-engine'

const ORBIT_COOLDOWN_MS = 900
const ORBIT_HISTORY_MS = 1400
const PET_COOLDOWN_MS = 680
const PET_HISTORY_MS = 1000
const SWIPE_COOLDOWN_MS = 480
const SWIPE_HISTORY_MS = 240
const TAU = Math.PI * 2

interface BasilPointerGestureSample {
  at: number
  point: BasilPoint
}

export interface BasilPointerGesture {
  orbit: number
  orbitDirection: number
  pet: number
  petDirection: number
  swipe: number
  swipeX: number
  swipeY: number
}

export interface BasilPointerGestureTracker extends BasilPointerGesture {
  lastAt: number | null
  lastOrbitAt: number
  lastPetAt: number
  lastSwipeAt: number
  samples: BasilPointerGestureSample[]
}

const EMPTY_GESTURE: BasilPointerGesture = {
  orbit: 0,
  orbitDirection: 0,
  pet: 0,
  petDirection: 0,
  swipe: 0,
  swipeX: 0,
  swipeY: 0
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value))
}

function wrappedAngleDelta(from: number, to: number): number {
  let delta = to - from

  while (delta > Math.PI) {delta -= TAU}

  while (delta < -Math.PI) {delta += TAU}

  return delta
}

export function createBasilPointerGestureTracker(): BasilPointerGestureTracker {
  return {
    ...EMPTY_GESTURE,
    lastAt: null,
    lastOrbitAt: Number.NEGATIVE_INFINITY,
    lastPetAt: Number.NEGATIVE_INFINITY,
    lastSwipeAt: Number.NEGATIVE_INFINITY,
    samples: []
  }
}

function detectOrbit(
  samples: BasilPointerGestureSample[],
  actorCenter: BasilPoint
): Pick<BasilPointerGesture, 'orbit' | 'orbitDirection'> {
  if (samples.length < 9 || samples.at(-1)!.at - samples[0]!.at < 420) {
    return { orbit: 0, orbitDirection: 0 }
  }

  const polar = samples.map(sample => ({
    angle: Math.atan2(sample.point.y - actorCenter.y, sample.point.x - actorCenter.x),
    radius: Math.hypot(sample.point.x - actorCenter.x, sample.point.y - actorCenter.y)
  }))

  const radii = polar.map(point => point.radius)
  const averageRadius = radii.reduce((sum, radius) => sum + radius, 0) / radii.length

  if (averageRadius < 42 || averageRadius > 180) {
    return { orbit: 0, orbitDirection: 0 }
  }

  const radialSpread = Math.max(...radii) - Math.min(...radii)

  if (radialSpread > averageRadius * 0.58) {
    return { orbit: 0, orbitDirection: 0 }
  }

  let absoluteTravel = 0
  let signedTravel = 0

  for (let index = 1; index < polar.length; index += 1) {
    const delta = wrappedAngleDelta(polar[index - 1]!.angle, polar[index]!.angle)
    absoluteTravel += Math.abs(delta)
    signedTravel += delta
  }

  const consistency = absoluteTravel > 0 ? Math.abs(signedTravel) / absoluteTravel : 0

  if (Math.abs(signedTravel) < Math.PI * 1.55 || consistency < 0.76) {
    return { orbit: 0, orbitDirection: 0 }
  }

  return {
    orbit: clamp01(Math.abs(signedTravel) / TAU) * consistency,
    orbitDirection: Math.sign(signedTravel)
  }
}

function detectPet(
  samples: BasilPointerGestureSample[],
  actorCenter: BasilPoint
): Pick<BasilPointerGesture, 'pet' | 'petDirection'> {
  const recent = samples.filter(sample => samples.at(-1)!.at - sample.at <= PET_HISTORY_MS)
  const crownSamples: BasilPointerGestureSample[] = []

  for (let index = recent.length - 1; index >= 0; index -= 1) {
    const sample = recent[index]!
    const dx = sample.point.x - actorCenter.x
    const dy = sample.point.y - actorCenter.y

    if (Math.abs(dx) > 52 || dy < -54 || dy > -7 || Math.hypot(dx, dy) > 68) {
      break
    }

    crownSamples.unshift(sample)
  }

  if (crownSamples.length < 7 || crownSamples.at(-1)!.at - crownSamples[0]!.at < 180) {
    return { pet: 0, petDirection: 0 }
  }

  let horizontalTravel = 0
  let lastDirection = 0
  let reversals = 0

  for (let index = 1; index < crownSamples.length; index += 1) {
    const dx = crownSamples[index]!.point.x - crownSamples[index - 1]!.point.x

    horizontalTravel += Math.abs(dx)

    if (Math.abs(dx) < 3) {
      continue
    }

    const direction = Math.sign(dx)

    if (lastDirection !== 0 && direction !== lastDirection) {
      reversals += 1
    }

    lastDirection = direction
  }

  const xValues = crownSamples.map(sample => sample.point.x)
  const yValues = crownSamples.map(sample => sample.point.y)
  const horizontalRange = Math.max(...xValues) - Math.min(...xValues)
  const verticalSpread = Math.max(...yValues) - Math.min(...yValues)
  const elapsedSeconds = Math.max(0.001, (crownSamples.at(-1)!.at - crownSamples[0]!.at) / 1000)
  const speed = horizontalTravel / elapsedSeconds

  if (
    reversals < 3 ||
    horizontalRange < 24 ||
    horizontalTravel < 115 ||
    verticalSpread > 30 ||
    speed < 110 ||
    speed > 1050
  ) {
    return { pet: 0, petDirection: 0 }
  }

  return {
    pet:
      clamp01((reversals - 2) / 3) *
      clamp01((horizontalTravel - 90) / 130) *
      clamp01((horizontalRange - 18) / 30),
    petDirection: lastDirection
  }
}

function detectSwipe(
  samples: BasilPointerGestureSample[],
  actorCenter: BasilPoint
): Omit<BasilPointerGesture, 'orbit' | 'orbitDirection' | 'pet' | 'petDirection'> {
  if (samples.length < 4) {
    return { swipe: 0, swipeX: 0, swipeY: 0 }
  }

  const start = samples[0]!
  const end = samples.at(-1)!
  const elapsedSeconds = Math.max(0.001, (end.at - start.at) / 1000)
  const dx = end.point.x - start.point.x
  const dy = end.point.y - start.point.y
  const directDistance = Math.hypot(dx, dy)
  let pathDistance = 0

  for (let index = 1; index < samples.length; index += 1) {
    pathDistance += Math.hypot(
      samples[index]!.point.x - samples[index - 1]!.point.x,
      samples[index]!.point.y - samples[index - 1]!.point.y
    )
  }

  const startVector = { x: start.point.x - actorCenter.x, y: start.point.y - actorCenter.y }
  const endVector = { x: end.point.x - actorCenter.x, y: end.point.y - actorCenter.y }
  const startRadius = Math.hypot(startVector.x, startVector.y)
  const endRadius = Math.hypot(endVector.x, endVector.y)

  const oppositeSides =
    startRadius > 70 &&
    endRadius > 70 &&
    (startVector.x * endVector.x + startVector.y * endVector.y) / (startRadius * endRadius) < -0.22

  const minimumRadius = Math.min(
    ...samples.map(sample => Math.hypot(sample.point.x - actorCenter.x, sample.point.y - actorCenter.y))
  )

  const linearity = pathDistance > 0 ? directDistance / pathDistance : 0
  const speed = directDistance / elapsedSeconds

  if (!oppositeSides || minimumRadius > 82 || directDistance < 130 || linearity < 0.82 || speed < 600) {
    return { swipe: 0, swipeX: 0, swipeY: 0 }
  }

  return {
    swipe: clamp01((speed - 500) / 650) * clamp01(directDistance / 180) * linearity,
    swipeX: dx / directDistance,
    swipeY: dy / directDistance
  }
}

export function sampleBasilPointerGesture(
  tracker: BasilPointerGestureTracker,
  pointer: BasilPoint,
  actorCenter: BasilPoint,
  now: number
): { gesture: BasilPointerGesture; tracker: BasilPointerGestureTracker } {
  const dtMs = tracker.lastAt === null ? 0 : Math.max(0, Math.min(250, now - tracker.lastAt))
  const orbit = tracker.orbit * Math.exp(-dtMs / 880)
  const pet = tracker.pet * Math.exp(-dtMs / 680)
  const swipe = tracker.swipe * Math.exp(-dtMs / 460)
  const samples = [...tracker.samples, { at: now, point: pointer }].filter(sample => now - sample.at <= ORBIT_HISTORY_MS)
  const recentSwipeSamples = samples.filter(sample => now - sample.at <= SWIPE_HISTORY_MS)

  const orbitDetection = now - tracker.lastOrbitAt >= ORBIT_COOLDOWN_MS
    ? detectOrbit(samples, actorCenter)
    : { orbit: 0, orbitDirection: 0 }

  const petDetection = now - tracker.lastPetAt >= PET_COOLDOWN_MS
    ? detectPet(samples, actorCenter)
    : { pet: 0, petDirection: 0 }

  const swipeDetection = now - tracker.lastSwipeAt >= SWIPE_COOLDOWN_MS
    ? detectSwipe(recentSwipeSamples, actorCenter)
    : { swipe: 0, swipeX: 0, swipeY: 0 }

  const petTriggered = petDetection.pet > 0.32
  const orbitTriggered = orbitDetection.orbit > 0.62 && !petTriggered
  const swipeTriggered = swipeDetection.swipe > 0.32 && !orbitTriggered && !petTriggered
  const nextOrbit = orbitTriggered ? orbitDetection.orbit : orbit
  const nextPet = petTriggered ? petDetection.pet : pet
  const nextSwipe = swipeTriggered ? swipeDetection.swipe : swipe

  const gesture = {
    orbit: nextOrbit,
    orbitDirection: orbitTriggered ? orbitDetection.orbitDirection : tracker.orbitDirection,
    pet: nextPet,
    petDirection: petTriggered ? petDetection.petDirection : tracker.petDirection,
    swipe: nextSwipe,
    swipeX: swipeTriggered ? swipeDetection.swipeX : tracker.swipeX,
    swipeY: swipeTriggered ? swipeDetection.swipeY : tracker.swipeY
  }

  return {
    gesture,
    tracker: {
      ...gesture,
      lastAt: now,
      lastOrbitAt: orbitTriggered ? now : tracker.lastOrbitAt,
      lastPetAt: petTriggered ? now : tracker.lastPetAt,
      lastSwipeAt: swipeTriggered ? now : tracker.lastSwipeAt,
      samples: orbitTriggered || petTriggered || swipeTriggered ? [{ at: now, point: pointer }] : samples
    }
  }
}
