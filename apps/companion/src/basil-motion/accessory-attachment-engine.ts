import type { BasilInteractionAccessory } from './types'

export type BasilAccessoryAttachmentKind = 'floating' | 'held' | 'worn'

export interface BasilAccessoryAttachmentInput {
  accessory: BasilInteractionAccessory
  beat: number
  progress: number
  side?: -1 | 1
}

export interface BasilAccessoryAttachmentPose {
  attachment: BasilAccessoryAttachmentKind
  elbowX: number
  elbowY: number
  grip: number
  handX: number
  handY: number
  propRotation: number
  propScale: number
  propScaleX: number
  propScaleY: number
  propX: number
  propY: number
  shoulderX: number
  shoulderY: number
  side: -1 | 1
}

const HELD_ACCESSORIES = new Set<BasilInteractionAccessory>([
  'book',
  'chart',
  'code',
  'compass',
  'folder',
  'key',
  'keyboard',
  'link',
  'magnifier',
  'pencil',
  'shield',
  'terminal'
])

const WORN_ACCESSORIES = new Set<BasilInteractionAccessory>(['antenna', 'ear', 'glasses'])

const RIGHT_SIDE_ACCESSORIES = new Set<BasilInteractionAccessory>(['compass', 'key', 'magnifier', 'pencil'])

const HELD_PROP_Y: Partial<Record<BasilInteractionAccessory, number>> = {
  book: -17,
  chart: -7,
  code: -6,
  compass: -4,
  folder: -5,
  key: 6,
  keyboard: 8,
  link: -4,
  magnifier: -3,
  pencil: 7,
  shield: -7,
  terminal: -6
}

function finite(value: number, fallback = 0) {
  return Number.isFinite(value) ? value : fallback
}

function normalized(value: number) {
  return Math.max(0, Math.min(1, finite(value)))
}

export function basilAccessoryAttachmentKind(accessory: BasilInteractionAccessory): BasilAccessoryAttachmentKind {
  if (HELD_ACCESSORIES.has(accessory)) {
    return 'held'
  }

  if (WORN_ACCESSORIES.has(accessory)) {
    return 'worn'
  }

  return 'floating'
}

export function deriveBasilAccessoryAttachment({
  accessory,
  beat,
  progress,
  side
}: BasilAccessoryAttachmentInput): BasilAccessoryAttachmentPose {
  const attachment = basilAccessoryAttachmentKind(accessory)
  const safeProgress = normalized(progress)
  const safeBeat = Math.max(0, Math.min(3, Math.round(finite(beat))))
  const resolvedSide = side === -1 || side === 1 ? side : RIGHT_SIDE_ACCESSORIES.has(accessory) ? 1 : -1
  const phase = safeProgress * Math.PI * 2
  const bob = Math.sin(phase * 2) * (attachment === 'held' ? 1.15 : 1.8)
  let propRotation = Math.sin(phase) * 4 * resolvedSide
  let propScale = 1 + Math.max(0, Math.sin(phase)) * 0.08
  let propScaleX = propScale
  let propScaleY = propScale

  let propX =
    resolvedSide *
    (attachment === 'held'
      ? (accessory === 'pencil' ? 46 : accessory === 'book' ? 47 : 48) + Math.cos(phase) * 0.65
      : 43 + Math.cos(phase) * 1.4)

  let propY = attachment === 'held' ? (HELD_PROP_Y[accessory] ?? -6) + bob : -35 + bob

  if (accessory === 'glasses') {
    propRotation = Math.sin(phase) * 0.45
    propScale = 0.96
    propScaleX = propScale
    propScaleY = propScale
    propX = 0
    propY = -7.8 + Math.sin(phase * 2) * 0.18
  } else if (accessory === 'ear') {
    propRotation = Math.sin(phase) * 1.2 * resolvedSide
    propScale = 0.72
    propScaleX = propScale * resolvedSide
    propScaleY = propScale
    propX = resolvedSide * 40.5
    propY = -4.5 + Math.sin(phase * 2) * 0.35
  } else if (accessory === 'antenna') {
    propRotation = 0
    propScale = 1
    propScaleX = 1
    propScaleY = 1
    propX = 0
    propY = -47
  }

  const handX = propX - resolvedSide * (attachment === 'held' ? 10.5 : 9.5)
  const handY = propY + (attachment === 'held' ? (accessory === 'pencil' ? 5 : 7) : 8.5)

  const shoulderY =
    attachment === 'held' ? (propY > 2 ? 7 : propY < -12 ? -7 : -1) : -6

  const elbowY = attachment === 'held' ? (shoulderY + handY) / 2 : -16.5 + bob * 0.35

  return {
    attachment,
    elbowX: resolvedSide * (40 + Math.sin(phase) * 0.8),
    elbowY,
    grip: attachment === 'held' ? 0.72 + safeBeat * 0.045 + Math.max(0, Math.sin(phase)) * 0.08 : 0,
    handX,
    handY,
    propRotation,
    propScale,
    propScaleX,
    propScaleY,
    propX,
    propY,
    shoulderX: resolvedSide * 35,
    shoulderY,
    side: resolvedSide
  }
}
