const VIEWPORT_MARGIN = 8
const CORNER_OFFSET = 1
const DEFAULT_CLEARANCE = 14
const MAX_OBSTACLE_VIEWPORT_RATIO = 0.72

function clampPoint(point, actor, viewport) {
  return {
    x: Math.min(
      Math.max(VIEWPORT_MARGIN, point.x),
      Math.max(VIEWPORT_MARGIN, viewport.width - actor.width - VIEWPORT_MARGIN)
    ),
    y: Math.min(
      Math.max(VIEWPORT_MARGIN, point.y),
      Math.max(VIEWPORT_MARGIN, viewport.height - actor.height - VIEWPORT_MARGIN)
    )
  }
}

function pointInsideExpanded(point, rect, epsilon = 0) {
  return (
    point.x > rect.x + epsilon &&
    point.x < rect.x + rect.width - epsilon &&
    point.y > rect.y + epsilon &&
    point.y < rect.y + rect.height - epsilon
  )
}

function expandObstacle(obstacle, actor, clearance) {
  return {
    ...obstacle,
    expanded: {
      height: obstacle.rect.height + actor.height + clearance * 2,
      width: obstacle.rect.width + actor.width + clearance * 2,
      x: obstacle.rect.x - actor.width - clearance,
      y: obstacle.rect.y - actor.height - clearance
    }
  }
}

function segmentIntersectsOpenRect(start, end, rect) {
  const epsilon = 0.25
  const minX = rect.x + epsilon
  const maxX = rect.x + rect.width - epsilon
  const minY = rect.y + epsilon
  const maxY = rect.y + rect.height - epsilon
  const dx = end.x - start.x
  const dy = end.y - start.y
  let enter = 0
  let exit = 1

  const clip = (origin, delta, min, max) => {
    if (Math.abs(delta) < 0.000001) {
      return origin > min && origin < max
    }

    const a = (min - origin) / delta
    const b = (max - origin) / delta
    const near = Math.min(a, b)
    const far = Math.max(a, b)

    enter = Math.max(enter, near)
    exit = Math.min(exit, far)

    return enter < exit
  }

  return clip(start.x, dx, minX, maxX) && clip(start.y, dy, minY, maxY) && exit > 0 && enter < 1
}

function segmentClear(start, end, obstacles) {
  return obstacles.every(obstacle => !segmentIntersectsOpenRect(start, end, obstacle.expanded))
}

function pathDistance(points) {
  let distance = 0

  for (let index = 1; index < points.length; index += 1) {
    distance += Math.hypot(points[index].x - points[index - 1].x, points[index].y - points[index - 1].y)
  }

  return distance
}

function routeObstacleIds(points, obstacles) {
  const ids = new Set()

  for (let index = 1; index < points.length; index += 1) {
    for (const obstacle of obstacles) {
      if (segmentIntersectsOpenRect(points[index - 1], points[index], obstacle.expanded)) {
        ids.add(obstacle.id)
      }
    }
  }

  return [...ids]
}

function uniquePoints(points) {
  const seen = new Set()

  return points.filter(point => {
    const key = `${point.x.toFixed(2)}:${point.y.toFixed(2)}`

    if (seen.has(key)) {
      return false
    }

    seen.add(key)

    return true
  })
}

export function planBasilTravelPath(
  start,
  destination,
  actor,
  viewport,
  rawObstacles,
  clearance = DEFAULT_CLEARANCE
) {
  const safeStart = clampPoint(start, actor, viewport)
  const safeDestination = clampPoint(destination, actor, viewport)

  if (Math.hypot(safeDestination.x - safeStart.x, safeDestination.y - safeStart.y) < 0.01) {
    return { distance: 0, obstructed: false, obstacleIds: [], points: [safeStart] }
  }

  const viewportArea = Math.max(1, viewport.width * viewport.height)

  const obstacles = rawObstacles
    .filter(obstacle => obstacle.rect.width >= 12 && obstacle.rect.height >= 12)
    .filter(obstacle => (obstacle.rect.width * obstacle.rect.height) / viewportArea < MAX_OBSTACLE_VIEWPORT_RATIO)
    .map(obstacle => expandObstacle(obstacle, actor, Math.max(0, clearance)))
    .filter(
      obstacle =>
        !pointInsideExpanded(safeStart, obstacle.expanded) &&
        !pointInsideExpanded(safeDestination, obstacle.expanded)
    )

  const directObstacleIds = obstacles
    .filter(obstacle => segmentIntersectsOpenRect(safeStart, safeDestination, obstacle.expanded))
    .map(obstacle => obstacle.id)

  if (!directObstacleIds.length) {
    const points = [safeStart, safeDestination]

    return { distance: pathDistance(points), obstructed: false, obstacleIds: [], points }
  }

  const cornerCandidates = obstacles.flatMap(obstacle => {
    const left = obstacle.expanded.x - CORNER_OFFSET
    const right = obstacle.expanded.x + obstacle.expanded.width + CORNER_OFFSET
    const top = obstacle.expanded.y - CORNER_OFFSET
    const bottom = obstacle.expanded.y + obstacle.expanded.height + CORNER_OFFSET

    return [
      { x: left, y: top },
      { x: right, y: top },
      { x: right, y: bottom },
      { x: left, y: bottom }
    ].map(point => clampPoint(point, actor, viewport))
  })

  const routeCorners = uniquePoints(cornerCandidates)
    .filter(
      point =>
        Math.hypot(point.x - safeStart.x, point.y - safeStart.y) >= 0.01 &&
        Math.hypot(point.x - safeDestination.x, point.y - safeDestination.y) >= 0.01
    )
    .filter(point => obstacles.every(obstacle => !pointInsideExpanded(point, obstacle.expanded, -0.01)))

  const nodes = [safeStart, safeDestination, ...routeCorners]
  const startIndex = 0
  const destinationIndex = 1
  const distances = nodes.map(() => Number.POSITIVE_INFINITY)
  const previous = nodes.map(() => -1)
  const visited = nodes.map(() => false)

  distances[startIndex] = 0

  for (let iteration = 0; iteration < nodes.length; iteration += 1) {
    let current = -1

    for (let index = 0; index < nodes.length; index += 1) {
      if (!visited[index] && (current < 0 || distances[index] < distances[current])) {
        current = index
      }
    }

    if (current < 0 || !Number.isFinite(distances[current]) || current === destinationIndex) {
      break
    }

    visited[current] = true

    for (let next = 0; next < nodes.length; next += 1) {
      if (next === current || visited[next] || !segmentClear(nodes[current], nodes[next], obstacles)) {
        continue
      }

      const candidate =
        distances[current] + Math.hypot(nodes[next].x - nodes[current].x, nodes[next].y - nodes[current].y)

      if (candidate + 0.001 < distances[next]) {
        distances[next] = candidate
        previous[next] = current
      }
    }
  }

  if (!Number.isFinite(distances[destinationIndex])) {
    const points = [safeStart, safeDestination]

    return {
      distance: pathDistance(points),
      obstructed: true,
      obstacleIds: directObstacleIds,
      points
    }
  }

  const indices = []
  let current = destinationIndex

  while (current >= 0) {
    indices.push(current)
    current = previous[current]
  }

  const points = indices.reverse().map(index => nodes[index])

  return {
    distance: pathDistance(points),
    obstructed: true,
    obstacleIds: directObstacleIds.length ? directObstacleIds : routeObstacleIds(points, obstacles),
    points
  }
}
