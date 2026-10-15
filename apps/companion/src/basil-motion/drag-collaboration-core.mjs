const COLLABORATIVE_TARGETS = new Set([
  'data',
  'document',
  'editor',
  'folder',
  'image',
  'terminal',
  'tool',
  'web'
])

function clamp(value, minimum = 0, maximum = 1) {
  return Math.min(Math.max(value, minimum), maximum)
}

function signed(value) {
  return clamp(value, -1, 1)
}

function normalizedDirection(point) {
  const length = Math.hypot(point.x, point.y)

  return length > 0.001 ? { x: point.x / length, y: point.y / length } : { x: 0, y: 0 }
}

function clampRect(rect, workArea) {
  return {
    ...rect,
    x: Math.round(
      clamp(rect.x, workArea.x, Math.max(workArea.x, workArea.x + workArea.width - rect.width))
    ),
    y: Math.round(
      clamp(rect.y, workArea.y, Math.max(workArea.y, workArea.y + workArea.height - rect.height))
    )
  }
}

function overflowScore(rect, workArea) {
  const overflowLeft = Math.max(0, workArea.x - rect.x)
  const overflowTop = Math.max(0, workArea.y - rect.y)
  const overflowRight = Math.max(0, rect.x + rect.width - (workArea.x + workArea.width))
  const overflowBottom = Math.max(0, rect.y + rect.height - (workArea.y + workArea.height))

  return overflowLeft + overflowTop + overflowRight + overflowBottom
}

function escortDestination(actor, pointer, velocity, workArea) {
  const speed = Math.hypot(velocity.x, velocity.y)
  const workCenter = {
    x: workArea.x + workArea.width / 2,
    y: workArea.y + workArea.height / 2
  }

  const travelDirection =
    speed > 0.08
      ? normalizedDirection(velocity)
      : normalizedDirection({
          x: pointer.x <= workCenter.x ? 1 : -1,
          y: Math.abs(pointer.y - workCenter.y) > workArea.height * 0.34
            ? pointer.y <= workCenter.y
              ? 0.24
              : -0.24
            : 0
        })

  const trailing = {
    x: -travelDirection.x * 104,
    y: -travelDirection.y * 104
  }

  const normal = { x: -travelDirection.y * 36, y: travelDirection.x * 36 }
  const candidates = [-1, 1].map(normalSide => {
    const center = {
      x: pointer.x + trailing.x + normal.x * normalSide,
      y: pointer.y + trailing.y + normal.y * normalSide
    }

    const rect = {
      height: actor.height,
      width: actor.width,
      x: center.x - actor.width / 2,
      y: center.y - actor.height / 2
    }

    const clamped = clampRect(rect, workArea)
    const clampedCenter = {
      x: clamped.x + clamped.width / 2,
      y: clamped.y + clamped.height / 2
    }

    const pointerDistance = Math.hypot(clampedCenter.x - pointer.x, clampedCenter.y - pointer.y)
    const pointerPenalty = Math.max(0, 88 - pointerDistance) * 20
    const edgePenalty = overflowScore(rect, workArea) * 12

    return {
      destination: clamped,
      score: pointerPenalty + edgePenalty,
      side: clampedCenter.x <= pointer.x ? -1 : 1
    }
  })

  const best = candidates.sort((left, right) => left.score - right.score)[0]

  return { destination: best.destination, side: best.side }
}

export function constrainBasilDragEscortFrame(
  actor,
  pointer,
  workArea,
  fallbackDirection = { x: -1, y: 0 },
  minimumClearance = 104
) {
  const center = {
    x: actor.x + actor.width / 2,
    y: actor.y + actor.height / 2
  }
  const offset = { x: center.x - pointer.x, y: center.y - pointer.y }
  const distance = Math.hypot(offset.x, offset.y)

  if (distance >= minimumClearance) {
    return clampRect(actor, workArea)
  }

  const primary =
    distance > 0.5
      ? normalizedDirection(offset)
      : normalizedDirection(
          Math.hypot(fallbackDirection.x, fallbackDirection.y) > 0.01
            ? { x: -fallbackDirection.x, y: -fallbackDirection.y }
            : { x: -1, y: 0 }
        )

  const directions = [
    primary,
    { x: -primary.y, y: primary.x },
    { x: primary.y, y: -primary.x },
    { x: -primary.x, y: -primary.y }
  ]

  const candidates = directions.map(direction => {
    const candidate = clampRect(
      {
        ...actor,
        x: pointer.x + direction.x * minimumClearance - actor.width / 2,
        y: pointer.y + direction.y * minimumClearance - actor.height / 2
      },
      workArea
    )
    const candidateCenter = {
      x: candidate.x + candidate.width / 2,
      y: candidate.y + candidate.height / 2
    }

    return {
      candidate,
      clearance: Math.hypot(candidateCenter.x - pointer.x, candidateCenter.y - pointer.y)
    }
  })

  return candidates.sort((left, right) => right.clearance - left.clearance)[0].candidate
}

export function deriveBasilDragCollaboration(input) {
  const eligible = COLLABORATIVE_TARGETS.has(input.target)
  const active = eligible && input.phase !== 'idle'
  const velocity = {
    x: signed(input.velocity.x),
    y: signed(input.velocity.y)
  }

  if (!active) {
    return {
      active: false,
      bodyLean: 0,
      destination: clampRect(input.actor, input.workArea),
      effort: 0,
      gazeX: 0,
      gazeY: 0,
      grip: 0,
      lift: 0,
      phase: 'idle',
      release: 0,
      side: 1,
      strength: 0,
      velocity
    }
  }

  const escort = escortDestination(input.actor, input.pointer, velocity, input.workArea)
  const actorCenter = {
    x: escort.destination.x + escort.destination.width / 2,
    y: escort.destination.y + escort.destination.height / 2
  }
  const gaze = {
    x: signed((input.pointer.x - actorCenter.x) / 130),
    y: signed((input.pointer.y - actorCenter.y) / 130)
  }
  const distanceStrength = clamp(input.distance / 180)
  const speed = clamp(Math.hypot(velocity.x, velocity.y))
  const release = input.phase === 'release' ? 1 : 0
  const strength =
    input.phase === 'acquire'
      ? 0.48
      : input.phase === 'carry'
        ? clamp(0.58 + distanceStrength * 0.3 + speed * 0.12)
        : 0.56
  const grip = input.phase === 'acquire' ? 0.5 : input.phase === 'carry' ? 1 : 0.18
  const effort = input.phase === 'carry' ? clamp(0.24 + speed * 0.48 + distanceStrength * 0.2) : strength * 0.28

  return {
    active,
    bodyLean: signed(velocity.x * 0.7 + gaze.x * 0.3) * strength * 7,
    destination: escort.destination,
    effort,
    gazeX: gaze.x,
    gazeY: gaze.y,
    grip,
    lift: -(2.5 + strength * 4.5 + speed * 3),
    phase: input.phase,
    release,
    side: escort.side,
    strength,
    velocity
  }
}
