export type BasilDragCollaborationPhase = 'acquire' | 'carry' | 'idle' | 'release'

export type BasilDragSceneTarget =
  | 'rest'
  | 'conversation'
  | 'composer'
  | 'web'
  | 'document'
  | 'image'
  | 'data'
  | 'editor'
  | 'folder'
  | 'terminal'
  | 'tool'
  | 'permission'
  | 'error'

export interface BasilDragPoint {
  x: number
  y: number
}

export interface BasilDragRect extends BasilDragPoint {
  height: number
  width: number
}

export interface BasilDragCollaborationInput {
  actor: BasilDragRect
  distance: number
  phase: BasilDragCollaborationPhase
  pointer: BasilDragPoint
  target: BasilDragSceneTarget
  velocity: BasilDragPoint
  workArea: BasilDragRect
}

export interface BasilDragCollaborationPose {
  active: boolean
  bodyLean: number
  destination: BasilDragRect
  effort: number
  gazeX: number
  gazeY: number
  grip: number
  lift: number
  phase: BasilDragCollaborationPhase
  release: number
  side: -1 | 1
  strength: number
  velocity: BasilDragPoint
}

export function deriveBasilDragCollaboration(
  input: BasilDragCollaborationInput
): BasilDragCollaborationPose

export function constrainBasilDragEscortFrame(
  actor: BasilDragRect,
  pointer: BasilDragPoint,
  workArea: BasilDragRect,
  fallbackDirection?: BasilDragPoint,
  minimumClearance?: number
): BasilDragRect
