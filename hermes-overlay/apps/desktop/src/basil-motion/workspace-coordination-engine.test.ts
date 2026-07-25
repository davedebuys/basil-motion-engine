import { describe, expect, it } from 'vitest'

import { deriveBasilWorkspaceCoordination } from './workspace-coordination-engine'

const BASE = {
  actor: { height: 108, width: 108, x: 510, y: 280 },
  frame: { height: 108, width: 108, x: 510, y: 280 },
  phase: 'engaged' as const,
  pointer: { x: 550, y: 330 },
  target: { height: 360, width: 300, x: 200, y: 150 },
  targetType: 'editor' as const,
  workArea: { height: 720, width: 1100, x: 0, y: 0 }
}

describe('Basil workspace coordination engine', () => {
  it('yields to a genuine pointer obstructed by the visible actor', () => {
    const pose = deriveBasilWorkspaceCoordination(BASE)

    expect(pose.active).toBe(true)
    expect(pose.strength).toBeGreaterThan(0.6)
    expect(pose.pointerClearance).toBeGreaterThan(pose.currentClearance + 22)
    expect(Math.hypot(pose.travel.x, pose.travel.y)).toBeCloseTo(1, 5)
    expect(Math.abs(pose.bodyLean)).toBeGreaterThan(2)
  })

  it('keeps the yielded actor outside the active object', () => {
    const pose = deriveBasilWorkspaceCoordination(BASE)
    const destination = pose.destination

    const overlapWidth = Math.max(
      0,
      Math.min(destination.x + destination.width, BASE.target.x + BASE.target.width) -
        Math.max(destination.x, BASE.target.x)
    )

    const overlapHeight = Math.max(
      0,
      Math.min(destination.y + destination.height, BASE.target.y + BASE.target.height) -
        Math.max(destination.y, BASE.target.y)
    )

    expect(overlapWidth * overlapHeight).toBe(0)
  })

  it('preserves a transparent-frame inset while moving the visible actor', () => {
    const pose = deriveBasilWorkspaceCoordination({
      ...BASE,
      actor: { height: 120, width: 120, x: 548, y: 318 },
      frame: { height: 196, width: 196, x: 510, y: 280 },
      pointer: { x: 590, y: 350 }
    })

    expect(pose.active).toBe(true)
    expect(pose.destination.width).toBe(196)
    expect(pose.destination.height).toBe(196)
    expect(pose.pointerClearance).toBeGreaterThan(pose.currentClearance)
  })

  it('clamps every destination inside negative-origin work areas', () => {
    const pose = deriveBasilWorkspaceCoordination({
      ...BASE,
      actor: { height: 108, width: 108, x: -110, y: 100 },
      frame: { height: 108, width: 108, x: -110, y: 100 },
      pointer: { x: -80, y: 150 },
      target: { height: 280, width: 260, x: -380, y: 60 },
      workArea: { height: 720, width: 1280, x: -1280, y: 0 }
    })

    expect(pose.active).toBe(true)
    expect(pose.destination.x).toBeGreaterThanOrEqual(-1280)
    expect(pose.destination.x + pose.destination.width).toBeLessThanOrEqual(0)
    expect(pose.destination.y).toBeGreaterThanOrEqual(0)
    expect(pose.destination.y + pose.destination.height).toBeLessThanOrEqual(720)
  })

  it('rejects a screen-edge side that cannot preserve the active-asset gap', () => {
    const pose = deriveBasilWorkspaceCoordination({
      ...BASE,
      actor: { height: 108, width: 108, x: 830, y: 346 },
      frame: { height: 108, width: 108, x: 830, y: 346 },
      gap: 20,
      pointer: { x: 884, y: 400 },
      target: { height: 500, width: 300, x: 520, y: 150 },
      workArea: { height: 768, width: 1024, x: 0, y: 0 }
    })

    expect(pose.active).toBe(true)
    expect(pose.side).not.toBe('below')
  })

  it('does not move when the real pointer already has clearance', () => {
    const pose = deriveBasilWorkspaceCoordination({
      ...BASE,
      pointer: { x: 900, y: 650 }
    })

    expect(pose.active).toBe(false)
    expect(pose.destination).toEqual(BASE.frame)
    expect(pose.strength).toBe(0)
  })

  it('protects passive and non-work scenes from unsolicited movement', () => {
    expect(
      deriveBasilWorkspaceCoordination({ ...BASE, phase: 'preview' }).active
    ).toBe(false)
    expect(
      deriveBasilWorkspaceCoordination({ ...BASE, targetType: 'conversation' }).active
    ).toBe(false)
  })
})
