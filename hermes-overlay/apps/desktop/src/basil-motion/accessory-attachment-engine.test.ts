import { describe, expect, it } from 'vitest'

import {
  basilAccessoryAttachmentKind,
  deriveBasilAccessoryAttachment
} from './accessory-attachment-engine'
import type { BasilInteractionAccessory } from './types'

const HELD: BasilInteractionAccessory[] = [
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
]

const WORN: BasilInteractionAccessory[] = ['antenna', 'ear', 'glasses']

const FLOATING: BasilInteractionAccessory[] = [
  'check',
  'confetti',
  'heart',
  'idea',
  'moon',
  'question',
  'spark',
  'speech',
  'warning',
  'wave'
]

describe('deriveBasilAccessoryAttachment', () => {
  it('classifies every accessory without coupling to a host application', () => {
    for (const accessory of HELD) {
      expect(basilAccessoryAttachmentKind(accessory)).toBe('held')
    }

    for (const accessory of WORN) {
      expect(basilAccessoryAttachmentKind(accessory)).toBe('worn')
    }

    for (const accessory of FLOATING) {
      expect(basilAccessoryAttachmentKind(accessory)).toBe('floating')
    }

    expect(HELD.length + WORN.length + FLOATING.length).toBe(25)
  })

  it('places held props at a reachable hand point on either side', () => {
    const left = deriveBasilAccessoryAttachment({ accessory: 'book', beat: 2, progress: 0.35, side: -1 })
    const right = deriveBasilAccessoryAttachment({ accessory: 'book', beat: 2, progress: 0.35, side: 1 })

    expect(left.attachment).toBe('held')
    expect(left.side).toBe(-1)
    expect(right.side).toBe(1)
    expect(left.propX).toBeCloseTo(-right.propX)
    expect(left.handX).toBeCloseTo(-right.handX)
    expect(left.shoulderX).toBeCloseTo(-right.shoulderX)
    expect(left.grip).toBeGreaterThan(0.7)
  })

  it('places held props beside the shell instead of pinning them to the crown', () => {
    const book = deriveBasilAccessoryAttachment({ accessory: 'book', beat: 1, progress: 0.25 })
    const magnifier = deriveBasilAccessoryAttachment({ accessory: 'magnifier', beat: 1, progress: 0.25 })
    const pencil = deriveBasilAccessoryAttachment({ accessory: 'pencil', beat: 1, progress: 0.25 })
    const terminal = deriveBasilAccessoryAttachment({ accessory: 'terminal', beat: 1, progress: 0.25 })

    expect(book.propY).toBeGreaterThan(-19)
    expect(magnifier.propY).toBeGreaterThan(-6)
    expect(pencil.propY).toBeGreaterThan(5)
    expect(terminal.propY).toBeGreaterThan(-9)
    expect(Math.abs(pencil.propX)).toBeGreaterThan(45)
    expect(pencil.handY).toBeGreaterThan(pencil.shoulderY)
  })

  it('keeps symbols and worn cues free of a false grip', () => {
    expect(deriveBasilAccessoryAttachment({ accessory: 'heart', beat: 1, progress: 0.4 }).grip).toBe(0)
    expect(deriveBasilAccessoryAttachment({ accessory: 'glasses', beat: 1, progress: 0.4 }).grip).toBe(0)
  })

  it('fits glasses to the eye line and mirrors an ear at the shell edge', () => {
    const glasses = deriveBasilAccessoryAttachment({ accessory: 'glasses', beat: 1, progress: 0.4 })
    const leftEar = deriveBasilAccessoryAttachment({ accessory: 'ear', beat: 1, progress: 0.4, side: -1 })
    const rightEar = deriveBasilAccessoryAttachment({ accessory: 'ear', beat: 1, progress: 0.4, side: 1 })

    expect(glasses.propX).toBe(0)
    expect(glasses.propY).toBeCloseTo(-7.8, 0)
    expect(glasses.propScale).toBeLessThan(1)
    expect(leftEar.propX).toBeCloseTo(-rightEar.propX)
    expect(leftEar.propScaleX).toBeLessThan(0)
    expect(rightEar.propScaleX).toBeGreaterThan(0)
  })

  it('integrates antenna interactions with the existing crown signal position', () => {
    const antenna = deriveBasilAccessoryAttachment({ accessory: 'antenna', beat: 1, progress: 0.4 })

    expect(antenna.propX).toBe(0)
    expect(antenna.propY).toBe(-47)
    expect(antenna.propRotation).toBe(0)
  })

  it('uses a stable accessory fallback side while honoring runtime direction', () => {
    expect(deriveBasilAccessoryAttachment({ accessory: 'magnifier', beat: 0, progress: 0 }).side).toBe(1)
    expect(deriveBasilAccessoryAttachment({ accessory: 'book', beat: 0, progress: 0 }).side).toBe(-1)
    expect(deriveBasilAccessoryAttachment({ accessory: 'magnifier', beat: 0, progress: 0, side: -1 }).side).toBe(-1)
  })

  it('sanitizes malformed host values and keeps every output finite', () => {
    const pose = deriveBasilAccessoryAttachment({
      accessory: 'terminal',
      beat: Number.POSITIVE_INFINITY,
      progress: Number.NaN
    })

    expect(
      Object.values(pose)
        .filter(value => typeof value === 'number')
        .every(Number.isFinite)
    ).toBe(true)
    expect(pose.grip).toBeGreaterThan(0)
  })
})
