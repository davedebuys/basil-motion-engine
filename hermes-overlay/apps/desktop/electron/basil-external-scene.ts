import { planBasilTravelPath } from '../src/basil-motion/path-planner-core.mjs'

export type BasilExternalSceneTarget =
  | 'conversation'
  | 'data'
  | 'document'
  | 'editor'
  | 'folder'
  | 'image'
  | 'terminal'
  | 'tool'
  | 'web'

export interface DesktopPoint {
  x: number
  y: number
}

export interface DesktopRect extends DesktopPoint {
  height: number
  width: number
}

export interface BasilExternalObstacle {
  bounds: DesktopRect
  processId: number
}

export interface BasilExternalTarget {
  activationSource?:
    | 'agent-event'
    | 'collection'
    | 'content'
    | 'control'
    | 'invocation'
    | 'keyboard'
    | 'pointer'
    | 'selection'
  activityIntensity?: number
  activityVariant?: 'add' | 'remove' | 'reorder'
  bounds: DesktopRect
  className: string
  controlType: string
  dragDistance?: number
  dragVelocity?: DesktopPoint
  isKeyboardFocusable: boolean
  intent:
    | 'activate'
    | 'adjustment'
    | 'dismiss'
    | 'drag_end'
    | 'drag_move'
    | 'drag_start'
    | 'focus'
    | 'input'
    | 'invocation'
    | 'move'
    | 'preview'
    | 'refresh'
    | 'resize'
    | 'scroll'
    | 'selection'
    | 'structure'
  obstacles: BasilExternalObstacle[]
  point: DesktopPoint
  processId: number
  scrollDeltaX?: number
  scrollDeltaY?: number
  scrollX?: number
  scrollY?: number
  source: 'windows-uia'
  supportsInvoke: boolean
  target: BasilExternalSceneTarget
}

export interface BasilExternalTargetEvent extends BasilExternalTarget {
  movementReason?: 'activity' | 'assist' | 'follow' | 'visit'
  phase: 'activity' | 'dismissed' | 'dragging' | 'dropped' | 'follow' | 'landed' | 'preview' | 'travel' | 'traverse'
}

interface WindowsAutomationPayload {
  activityCount?: unknown
  className?: unknown
  controlType?: unknown
  dragDistance?: unknown
  dragVelocityX?: unknown
  dragVelocityY?: unknown
  height?: unknown
  intent?: unknown
  isKeyboardFocusable?: unknown
  left?: unknown
  obstacles?: unknown
  processId?: unknown
  scrollDeltaX?: unknown
  scrollDeltaY?: unknown
  scrollX?: unknown
  scrollY?: unknown
  structureKind?: unknown
  supportsInvoke?: unknown
  top?: unknown
  width?: unknown
  x?: unknown
  y?: unknown
}

interface WindowsAutomationObstaclePayload {
  height?: unknown
  left?: unknown
  processId?: unknown
  top?: unknown
  width?: unknown
}

const DATA_CONTROLS = new Set(['DataItem'])
const DOCUMENT_CONTROLS = new Set(['Document', 'ListItem', 'Text'])
const EDITOR_CONTROLS = new Set(['Edit'])
const FOLDER_CONTROLS = new Set(['TreeItem'])
const WEB_CONTROLS = new Set(['Hyperlink'])
const CONVERSATION_CONTROLS = new Set(['Group', 'Pane', 'Window'])

function finiteNumber(value: unknown): number | null {
  const number = Number(value)

  return Number.isFinite(number) ? number : null
}

function parseWindowsObstacles(value: unknown): BasilExternalObstacle[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.flatMap(candidate => {
    const obstacle = candidate as WindowsAutomationObstaclePayload
    const left = finiteNumber(obstacle.left)
    const top = finiteNumber(obstacle.top)
    const width = finiteNumber(obstacle.width)
    const height = finiteNumber(obstacle.height)
    const processId = finiteNumber(obstacle.processId)

    if (
      left === null ||
      top === null ||
      width === null ||
      height === null ||
      processId === null ||
      width < 24 ||
      height < 24
    ) {
      return []
    }

    return [
      {
        bounds: { height, width, x: left, y: top },
        processId: Math.round(processId)
      }
    ]
  })
}

export function classifyWindowsControl(
  rawControlType: string,
  rawClassName = '',
  supportsInvoke = false,
  isKeyboardFocusable = false
): BasilExternalSceneTarget {
  const controlType = rawControlType.replace(/^ControlType\./, '')
  const className = rawClassName.toLowerCase()

  if (/cascadia|console|terminal/.test(className)) {
    return 'terminal'
  }

  if (/button/.test(className)) {
    return 'tool'
  }

  if (/treeview/.test(className)) {
    return 'folder'
  }

  if (/richedit|editor/.test(className)) {
    return 'editor'
  }

  if (/listview|document/.test(className)) {
    return 'document'
  }

  if (/excel|spreadsheet|datagrid|data-grid|chart/.test(className)) {
    return 'data'
  }

  if (/image|photo|picture|thumbnail/.test(className)) {
    return 'image'
  }

  if (/browser|webview/.test(className)) {
    return 'web'
  }

  if (/static/.test(className) && (supportsInvoke || isKeyboardFocusable)) {
    return 'web'
  }

  if (WEB_CONTROLS.has(controlType)) {
    return 'web'
  }

  if (controlType === 'Image') {
    return 'image'
  }

  if (DATA_CONTROLS.has(controlType)) {
    return 'data'
  }

  if (EDITOR_CONTROLS.has(controlType)) {
    return 'editor'
  }

  if (FOLDER_CONTROLS.has(controlType)) {
    return 'folder'
  }

  if (DOCUMENT_CONTROLS.has(controlType)) {
    return 'document'
  }

  if (CONVERSATION_CONTROLS.has(controlType)) {
    return 'conversation'
  }

  return 'tool'
}

export function classifyWindowsControlType(rawControlType: string): BasilExternalSceneTarget {
  return classifyWindowsControl(rawControlType)
}

export function parseWindowsAutomationLine(line: string): BasilExternalTarget | null {
  let payload: WindowsAutomationPayload

  try {
    payload = JSON.parse(line) as WindowsAutomationPayload
  } catch {
    return null
  }

  const x = finiteNumber(payload.x)
  const y = finiteNumber(payload.y)
  const left = finiteNumber(payload.left)
  const top = finiteNumber(payload.top)
  const width = finiteNumber(payload.width)
  const height = finiteNumber(payload.height)
  const processId = finiteNumber(payload.processId)
  const controlType = typeof payload.controlType === 'string' ? payload.controlType : ''
  const className = typeof payload.className === 'string' ? payload.className : ''
  const isKeyboardFocusable = payload.isKeyboardFocusable === true
  const supportsInvoke = payload.supportsInvoke === true
  const dragDistance = finiteNumber(payload.dragDistance) ?? 0
  const dragVelocityX = finiteNumber(payload.dragVelocityX) ?? 0
  const dragVelocityY = finiteNumber(payload.dragVelocityY) ?? 0
  const scrollX = finiteNumber(payload.scrollX)
  const scrollY = finiteNumber(payload.scrollY)
  const scrollDeltaX = finiteNumber(payload.scrollDeltaX)
  const scrollDeltaY = finiteNumber(payload.scrollDeltaY)
  const activityCount = finiteNumber(payload.activityCount)
  const structureKind = typeof payload.structureKind === 'string' ? payload.structureKind : ''

  const intent =
    payload.intent === 'adjustment' ||
    payload.intent === 'dismiss' ||
    payload.intent === 'focus' ||
    payload.intent === 'input' ||
    payload.intent === 'invocation' ||
    payload.intent === 'preview' ||
    payload.intent === 'refresh' ||
    payload.intent === 'scroll' ||
    payload.intent === 'selection' ||
    payload.intent === 'structure' ||
    payload.intent === 'drag_start' ||
    payload.intent === 'drag_move' ||
    payload.intent === 'drag_end'
      ? payload.intent
      : 'activate'

  if (
    x === null ||
    y === null ||
    left === null ||
    top === null ||
    width === null ||
    height === null ||
    processId === null ||
    width < 1 ||
    height < 1 ||
    !controlType
  ) {
    return null
  }

  return {
    bounds: { height, width, x: left, y: top },
    className,
    controlType: controlType.replace(/^ControlType\./, ''),
    ...(intent.startsWith('drag_')
      ? {
          dragDistance: Math.max(0, dragDistance),
          dragVelocity: {
            x: Math.max(-1, Math.min(1, dragVelocityX)),
            y: Math.max(-1, Math.min(1, dragVelocityY))
          }
        }
      : {}),
    isKeyboardFocusable,
    intent,
    obstacles: parseWindowsObstacles(payload.obstacles),
    point: { x, y },
    processId: Math.round(processId),
    ...(intent === 'adjustment' ||
    intent === 'input' ||
    intent === 'invocation' ||
    intent === 'selection' ||
    intent === 'structure'
      ? { activityIntensity: clamp((activityCount ?? 1) / 4, 0.25, 1) }
      : {}),
    ...(intent === 'structure'
      ? {
          activityVariant: /removed/i.test(structureKind)
            ? ('remove' as const)
            : /added/i.test(structureKind)
              ? ('add' as const)
              : ('reorder' as const)
        }
      : {}),
    ...(intent === 'scroll'
      ? {
          ...(scrollDeltaX === null ? {} : { scrollDeltaX: clamp(scrollDeltaX / 100, -1, 1) }),
          ...(scrollDeltaY === null ? {} : { scrollDeltaY: clamp(scrollDeltaY / 100, -1, 1) }),
          ...(scrollX === null || scrollX < 0 ? {} : { scrollX: clamp(scrollX / 100, 0, 1) }),
          ...(scrollY === null || scrollY < 0 ? {} : { scrollY: clamp(scrollY / 100, 0, 1) })
        }
      : {}),
    source: 'windows-uia',
    supportsInvoke,
    target: classifyWindowsControl(controlType, className, supportsInvoke, isKeyboardFocusable)
  }
}

export function externalTargetBelongsToApp(targetProcessId: number, ownedProcessIds: Iterable<number>): boolean {
  for (const processId of ownedProcessIds) {
    if (processId > 0 && processId === targetProcessId) {
      return true
    }
  }

  return false
}

export function shouldSuppressBasilExternalPreview(
  point: DesktopPoint,
  suppressedPoint: DesktopPoint | null,
  movementRadius = 5
): boolean {
  if (!suppressedPoint) {
    return false
  }

  return Math.hypot(point.x - suppressedPoint.x, point.y - suppressedPoint.y) <= Math.max(0, movementRadius)
}

export function basilExternalTargetsShareSurface(
  left: Pick<BasilExternalTarget, 'bounds' | 'processId' | 'target'>,
  right: Pick<BasilExternalTarget, 'bounds' | 'processId' | 'target'> | null,
  geometryTolerance = 2
): boolean {
  if (!right || left.processId !== right.processId || left.target !== right.target) {
    return false
  }

  const tolerance = Math.max(0, geometryTolerance)

  return (
    Math.abs(left.bounds.x - right.bounds.x) <= tolerance &&
    Math.abs(left.bounds.y - right.bounds.y) <= tolerance &&
    Math.abs(left.bounds.width - right.bounds.width) <= tolerance &&
    Math.abs(left.bounds.height - right.bounds.height) <= tolerance
  )
}

export function shouldFollowBasilExternalFocus(
  active: BasilExternalTarget | null,
  next: BasilExternalTarget | null
): boolean {
  return Boolean(
    active &&
    next &&
    next.intent === 'focus' &&
    next.isKeyboardFocusable &&
    active.processId === next.processId &&
    !basilExternalTargetsShareSurface(active, next)
  )
}

export function shouldFollowBasilExternalSelection(
  active: BasilExternalTarget | null,
  next: BasilExternalTarget | null
): boolean {
  return Boolean(
    active &&
    next &&
    next.intent === 'selection' &&
    next.target !== 'conversation' &&
    next.target !== 'terminal' &&
    active.processId === next.processId &&
    !basilExternalTargetsShareSurface(active, next)
  )
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum)
}

export interface BasilOverlayTravelRoute {
  distance: number
  obstacleIds: string[]
  obstructed: boolean
  points: DesktopRect[]
}

export interface BasilOverlayTravelSample {
  bounds: DesktopRect
  direction: DesktopPoint
  segmentIndex: number
}

export type BasilSurfaceProgressSide = 'above' | 'below' | 'left' | 'right'

export interface BasilSurfaceProgressPlacement {
  destination: DesktopRect
  point: DesktopPoint
  side: BasilSurfaceProgressSide
}

export function planOverlayTravelRoute(
  start: DesktopRect,
  destination: DesktopRect,
  workArea: DesktopRect,
  obstacles: readonly BasilExternalObstacle[],
  actorSize = 120,
  clearance = 16
): BasilOverlayTravelRoute {
  const paddingX = Math.max(0, (start.width - actorSize) / 2)
  const paddingY = Math.max(0, (start.height - actorSize) / 2)
  const actor = { height: actorSize, width: actorSize }

  const path = planBasilTravelPath(
    {
      x: start.x + paddingX - workArea.x,
      y: start.y + paddingY - workArea.y
    },
    {
      x: destination.x + paddingX - workArea.x,
      y: destination.y + paddingY - workArea.y
    },
    actor,
    { height: workArea.height, width: workArea.width },
    obstacles.map((obstacle, index) => ({
      id: `${obstacle.processId}:${index}`,
      rect: {
        height: obstacle.bounds.height,
        width: obstacle.bounds.width,
        x: obstacle.bounds.x - workArea.x,
        y: obstacle.bounds.y - workArea.y
      }
    })),
    clearance
  )

  return {
    distance: path.distance,
    obstacleIds: path.obstacleIds,
    obstructed: path.obstructed,
    points: path.points.map(point => ({
      height: destination.height,
      width: destination.width,
      x: Math.round(point.x + workArea.x - paddingX),
      y: Math.round(point.y + workArea.y - paddingY)
    }))
  }
}

export function sampleOverlayTravelRoute(route: BasilOverlayTravelRoute, progress: number): BasilOverlayTravelSample {
  const points = route.points

  if (points.length < 2 || route.distance < 0.01) {
    return {
      bounds: points.at(-1) ?? { height: 0, width: 0, x: 0, y: 0 },
      direction: { x: 0, y: 0 },
      segmentIndex: 0
    }
  }

  const t = clamp(progress, 0, 1)
  const eased = t * t * (3 - 2 * t)
  const desiredDistance = route.distance * eased
  let elapsed = 0

  for (let index = 1; index < points.length; index += 1) {
    const startPoint = points[index - 1]
    const endPoint = points[index]
    const dx = endPoint.x - startPoint.x
    const dy = endPoint.y - startPoint.y
    const segmentDistance = Math.hypot(dx, dy)

    if (desiredDistance <= elapsed + segmentDistance || index === points.length - 1) {
      const segmentProgress = segmentDistance < 0.01 ? 1 : clamp((desiredDistance - elapsed) / segmentDistance, 0, 1)

      return {
        bounds: {
          height: endPoint.height,
          width: endPoint.width,
          x: Math.round(startPoint.x + dx * segmentProgress),
          y: Math.round(startPoint.y + dy * segmentProgress)
        },
        direction: segmentDistance < 0.01 ? { x: 0, y: 0 } : { x: dx / segmentDistance, y: dy / segmentDistance },
        segmentIndex: index - 1
      }
    }

    elapsed += segmentDistance
  }

  const destination = points.at(-1)!

  return { bounds: destination, direction: { x: 0, y: 0 }, segmentIndex: points.length - 2 }
}

export function clampOverlayDestination(
  destination: DesktopPoint,
  overlay: DesktopRect,
  workArea: DesktopRect
): DesktopRect {
  return {
    height: overlay.height,
    width: overlay.width,
    x: Math.round(clamp(destination.x, workArea.x, Math.max(workArea.x, workArea.x + workArea.width - overlay.width))),
    y: Math.round(clamp(destination.y, workArea.y, Math.max(workArea.y, workArea.y + workArea.height - overlay.height)))
  }
}

export function surfaceProgressDestination(
  target: DesktopRect,
  overlay: DesktopRect,
  workArea: DesktopRect,
  progress: number,
  actorSize = 120,
  gap = 16
): BasilSurfaceProgressPlacement {
  const paddingX = Math.max(0, (overlay.width - actorSize) / 2)
  const paddingY = Math.max(0, (overlay.height - actorSize) / 2)

  const actor = {
    height: actorSize,
    width: actorSize,
    x: overlay.x + paddingX,
    y: overlay.y + paddingY
  }

  const actorCenter = {
    x: actor.x + actor.width / 2,
    y: actor.y + actor.height / 2
  }

  const targetCenter = {
    x: target.x + target.width / 2,
    y: target.y + target.height / 2
  }

  let side: BasilSurfaceProgressSide

  if (actorCenter.x >= target.x + target.width) {
    side = 'right'
  } else if (actorCenter.x <= target.x) {
    side = 'left'
  } else if (actorCenter.y <= target.y) {
    side = 'above'
  } else if (actorCenter.y >= target.y + target.height) {
    side = 'below'
  } else {
    const distances = [
      { distance: Math.abs(actorCenter.x - (target.x + target.width)), side: 'right' as const },
      { distance: Math.abs(actorCenter.x - target.x), side: 'left' as const },
      { distance: Math.abs(actorCenter.y - target.y), side: 'above' as const },
      { distance: Math.abs(actorCenter.y - (target.y + target.height)), side: 'below' as const }
    ]

    side = distances.sort((left, right) => left.distance - right.distance)[0]!.side
  }

  const t = clamp(progress, 0, 1)
  let actorX = actor.x
  let actorY = actor.y
  let point: DesktopPoint

  if (side === 'right' || side === 'left') {
    actorX = side === 'right' ? target.x + target.width + gap : target.x - actorSize - gap
    actorY = target.y + Math.max(0, target.height - actorSize) * t
    point = {
      x: side === 'right' ? target.x + target.width : target.x,
      y: target.y + target.height * t
    }
  } else {
    actorX = target.x + Math.max(0, target.width - actorSize) * t
    actorY = side === 'below' ? target.y + target.height + gap : target.y - actorSize - gap
    point = {
      x: target.x + target.width * t,
      y: side === 'below' ? target.y + target.height : target.y
    }
  }

  return {
    destination: clampOverlayDestination({ x: actorX - paddingX, y: actorY - paddingY }, overlay, workArea),
    point,
    side
  }
}

export function placeOverlayBesideTarget(
  target: DesktopRect,
  overlay: DesktopRect,
  workArea: DesktopRect,
  actorSize = 120,
  gap = 16,
  pointer?: DesktopPoint
): DesktopRect {
  const paddingX = Math.max(0, (overlay.width - actorSize) / 2)
  const paddingY = Math.max(0, (overlay.height - actorSize) / 2)
  const maxX = workArea.x + workArea.width - overlay.width
  const maxY = workArea.y + workArea.height - overlay.height

  const clampCandidate = (x: number, y: number): DesktopRect => ({
    height: overlay.height,
    width: overlay.width,
    x: Math.round(clamp(x, workArea.x, Math.max(workArea.x, maxX))),
    y: Math.round(clamp(y, workArea.y, Math.max(workArea.y, maxY)))
  })

  const candidates = [
    clampCandidate(target.x + target.width + gap - paddingX, target.y + target.height / 2 - overlay.height / 2),
    clampCandidate(target.x - gap - actorSize - paddingX, target.y + target.height / 2 - overlay.height / 2),
    clampCandidate(target.x + target.width / 2 - overlay.width / 2, target.y - gap - actorSize - paddingY),
    clampCandidate(target.x + target.width / 2 - overlay.width / 2, target.y + target.height + gap - paddingY)
  ]

  const overlapArea = (candidate: DesktopRect): number => {
    const actor = {
      bottom: candidate.y + paddingY + actorSize,
      left: candidate.x + paddingX,
      right: candidate.x + paddingX + actorSize,
      top: candidate.y + paddingY
    }

    const overlapWidth = Math.max(0, Math.min(actor.right, target.x + target.width) - Math.max(actor.left, target.x))
    const overlapHeight = Math.max(0, Math.min(actor.bottom, target.y + target.height) - Math.max(actor.top, target.y))

    return overlapWidth * overlapHeight
  }

  let best = candidates[0]
  let bestScore = Number.POSITIVE_INFINITY

  candidates.forEach((candidate, index) => {
    const actorCenter = {
      x: candidate.x + paddingX + actorSize / 2,
      y: candidate.y + paddingY + actorSize / 2
    }

    const pointerDistance = pointer ? Math.hypot(actorCenter.x - pointer.x, actorCenter.y - pointer.y) : actorSize * 2
    const pointerPenalty = Math.max(0, actorSize * 0.9 - pointerDistance) * 12
    const travelDistance = Math.hypot(candidate.x - overlay.x, candidate.y - overlay.y)
    const score = overlapArea(candidate) * 100 + pointerPenalty + travelDistance * 0.001 + index * 2

    if (score < bestScore) {
      best = candidate
      bestScore = score
    }
  })

  return best
}

export function overlayTravelFrame(start: DesktopRect, destination: DesktopRect, progress: number): DesktopRect {
  const t = clamp(progress, 0, 1)
  const eased = t * t * (3 - 2 * t)
  const distance = Math.hypot(destination.x - start.x, destination.y - start.y)
  const lift = Math.sin(Math.PI * t) * Math.min(42, distance * 0.09)

  return {
    height: destination.height,
    width: destination.width,
    x: Math.round(start.x + (destination.x - start.x) * eased),
    y: Math.round(start.y + (destination.y - start.y) * eased - lift)
  }
}

const SURFACE_TRAVERSAL_TARGETS = new Set<BasilExternalSceneTarget>([
  'data',
  'document',
  'editor',
  'image',
  'terminal',
  'web'
])

export function surfaceTraversalDestination(
  target: DesktopRect,
  landing: DesktopRect,
  workArea: DesktopRect,
  sceneTarget: BasilExternalSceneTarget,
  pointer?: DesktopPoint,
  actorSize = 120
): DesktopRect | null {
  if (!SURFACE_TRAVERSAL_TARGETS.has(sceneTarget)) {
    return null
  }

  const paddingX = Math.max(0, (landing.width - actorSize) / 2)
  const paddingY = Math.max(0, (landing.height - actorSize) / 2)

  const actorCenter = {
    x: landing.x + paddingX + actorSize / 2,
    y: landing.y + paddingY + actorSize / 2
  }

  const targetCenter = { x: target.x + target.width / 2, y: target.y + target.height / 2 }

  const sideDistances = [
    { distance: Math.abs(actorCenter.x - target.x), side: 'left' as const },
    { distance: Math.abs(actorCenter.x - (target.x + target.width)), side: 'right' as const },
    { distance: Math.abs(actorCenter.y - target.y), side: 'above' as const },
    { distance: Math.abs(actorCenter.y - (target.y + target.height)), side: 'below' as const }
  ].sort((a, b) => a.distance - b.distance)

  const side = sideDistances[0]!.side
  const verticalSide = side === 'left' || side === 'right'
  const traversableLength = verticalSide ? target.height : target.width

  if (traversableLength < actorSize * 1.55) {
    return null
  }

  const pointerAxis = verticalSide ? pointer?.y : pointer?.x
  const centerAxis = verticalSide ? targetCenter.y : targetCenter.x
  const currentAxis = verticalSide ? actorCenter.y : actorCenter.x
  const towardEnd = pointerAxis === undefined ? currentAxis <= centerAxis : pointerAxis <= centerAxis
  const edgeInset = Math.min(actorSize * 0.56, traversableLength * 0.24)

  const destinationActorAxis = verticalSide
    ? towardEnd
      ? target.y + target.height - edgeInset
      : target.y + edgeInset
    : towardEnd
      ? target.x + target.width - edgeInset
      : target.x + edgeInset

  const destination = {
    ...landing,
    x: verticalSide ? landing.x : destinationActorAxis - paddingX - actorSize / 2,
    y: verticalSide ? destinationActorAxis - paddingY - actorSize / 2 : landing.y
  }

  const clamped = {
    ...destination,
    x: Math.round(clamp(destination.x, workArea.x, workArea.x + workArea.width - landing.width)),
    y: Math.round(clamp(destination.y, workArea.y, workArea.y + workArea.height - landing.height))
  }

  return Math.hypot(clamped.x - landing.x, clamped.y - landing.y) >= actorSize * 0.38 ? clamped : null
}

export function overlaySurfaceTraversalFrame(
  start: DesktopRect,
  destination: DesktopRect,
  target: DesktopRect,
  progress: number
): DesktopRect {
  const t = clamp(progress, 0, 1)
  const eased = t * t * (3 - 2 * t)
  const dx = destination.x - start.x
  const dy = destination.y - start.y
  const distance = Math.hypot(dx, dy)
  const curve = Math.sin(Math.PI * t) * Math.min(18, distance * 0.1)
  const startCenter = { x: start.x + start.width / 2, y: start.y + start.height / 2 }
  const targetCenter = { x: target.x + target.width / 2, y: target.y + target.height / 2 }
  const vertical = Math.abs(dy) >= Math.abs(dx)
  const outwardX = Math.sign(startCenter.x - targetCenter.x) || 1
  const outwardY = Math.sign(startCenter.y - targetCenter.y) || -1

  return {
    height: destination.height,
    width: destination.width,
    x: Math.round(start.x + dx * eased + (vertical ? curve * outwardX : 0)),
    y: Math.round(start.y + dy * eased + (vertical ? 0 : curve * outwardY))
  }
}
