import { describe, expect, it } from 'vitest'

import {
  constrainBasilDragEscortFrame,
  deriveBasilDragCollaboration
} from './drag-collaboration-engine'

const actor = { height: 196, width: 196, x: 700, y: 400 }
const workArea = { height: 900, width: 1600, x: 0, y: 0 }

describe('deriveBasilDragCollaboration', () => {
  it('stays inert for idle and non-collaborative targets', () => {
    const idle = deriveBasilDragCollaboration({
      actor,
      distance: 0,
      phase: 'idle',
      pointer: { x: 900, y: 500 },
      target: 'document',
      velocity: { x: 0, y: 0 },
      workArea
    })

    const conversation = deriveBasilDragCollaboration({
      actor,
      distance: 80,
      phase: 'carry',
      pointer: { x: 900, y: 500 },
      target: 'conversation',
      velocity: { x: 1, y: 0 },
      workArea
    })

    expect(idle.active).toBe(false)
    expect(idle.strength).toBe(0)
    expect(conversation.active).toBe(false)
    expect(conversation.phase).toBe('idle')
  })

  it('trails a rightward drag and keeps the pointer clear', () => {
    const pose = deriveBasilDragCollaboration({
      actor,
      distance: 150,
      phase: 'carry',
      pointer: { x: 1100, y: 480 },
      target: 'folder',
      velocity: { x: 1, y: 0.1 },
      workArea
    })

    const center = {
      x: pose.destination.x + pose.destination.width / 2,
      y: pose.destination.y + pose.destination.height / 2
    }

    expect(pose.active).toBe(true)
    expect(center.x).toBeLessThan(1100)
    expect(Math.hypot(center.x - 1100, center.y - 480)).toBeGreaterThanOrEqual(88)
    expect(pose.gazeX).toBeGreaterThan(0)
    expect(pose.grip).toBe(1)
    expect(pose.lift).toBeLessThan(-6)
  })

  it('switches escort side immediately when the drag reverses', () => {
    const rightward = deriveBasilDragCollaboration({
      actor,
      distance: 100,
      phase: 'carry',
      pointer: { x: 800, y: 440 },
      target: 'document',
      velocity: { x: 1, y: 0 },
      workArea
    })

    const leftward = deriveBasilDragCollaboration({
      actor,
      distance: 100,
      phase: 'carry',
      pointer: { x: 800, y: 440 },
      target: 'document',
      velocity: { x: -1, y: 0 },
      workArea
    })

    expect(rightward.destination.x).toBeLessThan(leftward.destination.x)
    expect(rightward.side).toBe(-1)
    expect(leftward.side).toBe(1)
  })

  it('clamps escort geometry at every work-area edge', () => {
    const pointers = [
      { x: 2, y: 2 },
      { x: 1598, y: 2 },
      { x: 2, y: 898 },
      { x: 1598, y: 898 }
    ]

    for (const pointer of pointers) {
      const pose = deriveBasilDragCollaboration({
        actor,
        distance: 220,
        phase: 'carry',
        pointer,
        target: 'image',
        velocity: { x: pointer.x < 800 ? -0.8 : 0.8, y: pointer.y < 450 ? -0.6 : 0.6 },
        workArea
      })

      expect(pose.destination.x).toBeGreaterThanOrEqual(workArea.x)
      expect(pose.destination.y).toBeGreaterThanOrEqual(workArea.y)
      expect(pose.destination.x + pose.destination.width).toBeLessThanOrEqual(workArea.width)
      expect(pose.destination.y + pose.destination.height).toBeLessThanOrEqual(workArea.height)
    }
  })

  it('releases the grip while preserving a visible handoff reaction', () => {
    const pose = deriveBasilDragCollaboration({
      actor,
      distance: 260,
      phase: 'release',
      pointer: { x: 1100, y: 500 },
      target: 'data',
      velocity: { x: 0.2, y: 0 },
      workArea
    })

    expect(pose.active).toBe(true)
    expect(pose.phase).toBe('release')
    expect(pose.release).toBe(1)
    expect(pose.grip).toBeLessThan(0.2)
    expect(pose.strength).toBeGreaterThan(0.5)
  })

  it('scales carry effort from genuine distance and speed', () => {
    const gentle = deriveBasilDragCollaboration({
      actor,
      distance: 18,
      phase: 'carry',
      pointer: { x: 900, y: 500 },
      target: 'tool',
      velocity: { x: 0.1, y: 0 },
      workArea
    })

    const committed = deriveBasilDragCollaboration({
      actor,
      distance: 260,
      phase: 'carry',
      pointer: { x: 1200, y: 600 },
      target: 'tool',
      velocity: { x: 0.9, y: 0.5 },
      workArea
    })

    expect(committed.strength).toBeGreaterThan(gentle.strength)
    expect(committed.effort).toBeGreaterThan(gentle.effort)
    expect(committed.bodyLean).not.toBe(gentle.bodyLean)
  })

  it('keeps every smoothed escort frame clear of the live pointer', () => {
    const pointer = { x: 800, y: 450 }
    const crossingFrame = { ...actor, x: 702, y: 352 }

    const safe = constrainBasilDragEscortFrame(
      crossingFrame,
      pointer,
      workArea,
      { x: 1, y: 0 },
      104
    )

    const center = {
      x: safe.x + safe.width / 2,
      y: safe.y + safe.height / 2
    }

    expect(Math.hypot(center.x - pointer.x, center.y - pointer.y)).toBeGreaterThanOrEqual(104)
  })

  it('finds the clearest valid side when the pointer is near a screen edge', () => {
    const pointer = { x: 10, y: 10 }

    const safe = constrainBasilDragEscortFrame(
      { ...actor, x: 0, y: 0 },
      pointer,
      workArea,
      { x: -1, y: -1 },
      104
    )

    const center = {
      x: safe.x + safe.width / 2,
      y: safe.y + safe.height / 2
    }

    expect(safe.x).toBeGreaterThanOrEqual(0)
    expect(safe.y).toBeGreaterThanOrEqual(0)
    expect(Math.hypot(center.x - pointer.x, center.y - pointer.y)).toBeGreaterThanOrEqual(104)
  })
})
