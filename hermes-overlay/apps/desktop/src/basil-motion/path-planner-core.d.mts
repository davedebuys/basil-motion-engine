export interface BasilPathPoint {
  x: number
  y: number
}

export interface BasilPathRect extends BasilPathPoint {
  height: number
  width: number
}

export interface BasilPathSize {
  height: number
  width: number
}

export interface BasilPathViewport {
  height: number
  width: number
}

export interface BasilPathObstacle {
  id: string
  rect: BasilPathRect
}

export interface BasilTravelPath {
  distance: number
  obstructed: boolean
  obstacleIds: string[]
  points: BasilPathPoint[]
}

export function planBasilTravelPath(
  start: BasilPathPoint,
  destination: BasilPathPoint,
  actor: BasilPathSize,
  viewport: BasilPathViewport,
  rawObstacles: readonly BasilPathObstacle[],
  clearance?: number
): BasilTravelPath
