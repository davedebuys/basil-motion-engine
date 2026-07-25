import { describe, expect, it } from 'vitest'

import type { BasilExternalTarget } from './basil-external-scene'
import {
  basilWorkspaceEventKey,
  basilWorkspaceEventMatchesTarget,
  basilWorkspaceFollowIntent,
  basilWorkspaceGeometryChange,
  BasilWorkspaceTargetMemory,
  basilWorkspaceTargetMoved,
  shouldFollowBasilUserWorkspaceTarget,
  shouldFollowBasilWorkspaceTarget
} from './basil-workspace-memory'

function target(overrides: Partial<BasilExternalTarget> = {}): BasilExternalTarget {
  return {
    bounds: { height: 500, width: 700, x: 900, y: 120 },
    className: 'EditorSurface',
    controlType: 'Edit',
    intent: 'activate',
    isKeyboardFocusable: true,
    obstacles: [],
    point: { x: 1040, y: 260 },
    processId: 42,
    source: 'windows-uia',
    supportsInvoke: false,
    target: 'editor',
    ...overrides
  }
}

function state(id: string, sceneTarget = 'editor', source = 'hermes', kind = 'tool_start', taskPhase = 'execute') {
  return {
    snapshot: {
      lastEvent: {
        id,
        kind,
        label: 'apply_patch',
        scene: { target: sceneTarget, taskPhase },
        source
      }
    }
  }
}

describe('Basil external workspace memory', () => {
  it('recalls a genuinely activated matching surface only for a newer real event', () => {
    const memory = new BasilWorkspaceTargetMemory(10_000)
    const current = state('before')
    const editor = target()

    memory.remember(editor, current, 100)

    expect(memory.consume(current, 200)).toBeNull()
    expect(memory.consume(state('next'), 300)).toEqual(editor)
    expect(memory.consume(state('next'), 400)).toBeNull()
  })

  it('treats a new lifecycle phase as real work even when the tool event id is stable', () => {
    const memory = new BasilWorkspaceTargetMemory(10_000)

    memory.remember(target(), state('tool-1', 'editor', 'hermes', 'tool_start', 'prepare'), 100)

    expect(memory.consume(state('tool-1', 'editor', 'hermes', 'tool_start', 'prepare'), 200)).toBeNull()
    expect(memory.consume(state('tool-1', 'editor', 'hermes', 'tool_start', 'execute'), 300)).toBeTruthy()
  })

  it('ignores previews, development events, unrelated targets, and expired geometry', () => {
    const memory = new BasilWorkspaceTargetMemory(500)

    memory.remember(target({ intent: 'preview' }), state('before'), 0)
    expect(memory.consume(state('one'), 100)).toBeNull()

    memory.remember(target(), state('before'), 0)
    expect(memory.consume(state('dev', 'editor', 'development'), 100)).toBeNull()
    expect(memory.consume(state('web', 'web'), 100)).toBeNull()
    expect(memory.consume(state('late'), 501)).toBeNull()
  })

  it('refreshes geometry for the same process while preserving known obstacles', () => {
    const memory = new BasilWorkspaceTargetMemory(1_000)

    const editor = target({
      obstacles: [
        {
          bounds: { height: 300, width: 300, x: 400, y: 200 },
          processId: 77
        }
      ]
    })

    memory.remember(editor, state('before'), 0)

    expect(
      memory.refresh(
        target({
          bounds: { height: 520, width: 720, x: 940, y: 160 },
          intent: 'refresh',
          obstacles: []
        }),
        800
      )
    ).toMatchObject({
      bounds: { height: 520, width: 720, x: 940, y: 160 },
      point: { x: 1084, y: 305.6 }
    })

    expect(memory.consume(state('next'), 1_200)).toMatchObject({
      bounds: { height: 520, width: 720, x: 940, y: 160 },
      obstacles: editor.obstacles,
      point: { x: 1084, y: 305.6 }
    })
    expect(memory.refresh(target({ intent: 'refresh', processId: 99 }), 1_300)).toBeNull()
  })

  it('forgets only the dismissed process and category surface', () => {
    const memory = new BasilWorkspaceTargetMemory(1_000)
    const editor = target()

    memory.remember(editor, state('before'), 0)

    expect(memory.forget({ processId: 99, target: 'editor' })).toBe(false)
    expect(memory.consume(state('first'), 100)).toEqual(editor)

    memory.remember(editor, state('before'), 200)
    expect(memory.forget({ processId: 42, target: 'web' })).toBe(false)
    expect(memory.forget({ processId: 42, target: 'editor' })).toBe(true)
    expect(memory.consume(state('second'), 300)).toBeNull()
  })

  it('requires a named non-development source and an actionable scene', () => {
    expect(basilWorkspaceEventKey(state('editor'))).toContain('hermes|editor|tool_start|editor|execute')
    expect(basilWorkspaceEventKey(state('rest', 'conversation'))).toBeNull()
    expect(basilWorkspaceEventKey(state('missing', 'editor', ''))).toBeNull()
    expect(basilWorkspaceEventKey(state('dev', 'editor', 'development'))).toBeNull()
  })

  it('follows only a moved surface attached by a matching real agent event', () => {
    const active = target({ activationSource: 'agent-event' })

    const moved = target({
      bounds: { height: 500, width: 700, x: 620, y: 220 },
      intent: 'refresh',
      point: { x: 760, y: 360 }
    })

    const work = state('work')

    expect(basilWorkspaceEventMatchesTarget(work, active)).toBe(true)
    expect(basilWorkspaceTargetMoved(active, moved)).toBe(true)
    expect(shouldFollowBasilWorkspaceTarget(active, moved, work)).toBe(true)
    expect(shouldFollowBasilWorkspaceTarget(target({ activationSource: 'pointer' }), moved, work)).toBe(false)
    expect(shouldFollowBasilWorkspaceTarget(active, moved, state('rest', 'conversation'))).toBe(false)
    expect(
      shouldFollowBasilWorkspaceTarget(
        active,
        target({ activationSource: 'agent-event', intent: 'refresh', processId: 7 }),
        work
      )
    ).toBe(false)
    expect(
      shouldFollowBasilWorkspaceTarget(active, target({ activationSource: 'agent-event', intent: 'refresh' }), work)
    ).toBe(false)
  })

  it('follows moved pointer-approved geometry without requiring agent work', () => {
    const moved = target({
      bounds: { height: 500, width: 700, x: 620, y: 220 },
      intent: 'refresh',
      point: { x: 760, y: 360 }
    })

    for (const activationSource of [
      'collection',
      'content',
      'control',
      'invocation',
      'keyboard',
      'pointer',
      'selection'
    ] as const) {
      expect(shouldFollowBasilUserWorkspaceTarget(target({ activationSource }), moved)).toBe(true)
    }

    expect(shouldFollowBasilUserWorkspaceTarget(target({ activationSource: 'agent-event' }), moved)).toBe(false)
    expect(
      shouldFollowBasilUserWorkspaceTarget(
        target({ activationSource: 'pointer' }),
        target({ intent: 'refresh', processId: 7 })
      )
    ).toBe(false)
    expect(
      shouldFollowBasilUserWorkspaceTarget(
        target({ activationSource: 'pointer' }),
        target({ intent: 'refresh', target: 'web' })
      )
    ).toBe(false)
    expect(
      shouldFollowBasilUserWorkspaceTarget(
        target({ activationSource: 'pointer' }),
        target({ activationSource: 'pointer', intent: 'refresh' })
      )
    ).toBe(false)
  })

  it('distinguishes native surface resizing from translation and subpixel noise', () => {
    const current = target()

    expect(
      basilWorkspaceGeometryChange(
        current,
        target({
          bounds: { ...current.bounds, x: current.bounds.x + 80 },
          point: { x: current.point.x + 80, y: current.point.y }
        })
      )
    ).toBe('move')

    expect(
      basilWorkspaceGeometryChange(
        current,
        target({
          bounds: { ...current.bounds, height: current.bounds.height + 90, width: current.bounds.width + 140 }
        })
      )
    ).toBe('resize')

    expect(
      basilWorkspaceGeometryChange(
        current,
        target({
          bounds: { ...current.bounds, width: current.bounds.width + 1 },
          point: { x: current.point.x + 1, y: current.point.y }
        })
      )
    ).toBeNull()

    expect(
      basilWorkspaceFollowIntent(
        current,
        target({ bounds: { ...current.bounds, height: current.bounds.height + 90 } })
      )
    ).toBe('resize')
    expect(
      basilWorkspaceFollowIntent(
        current,
        target({ bounds: { ...current.bounds, x: current.bounds.x + 80 } })
      )
    ).toBe('move')
    expect(basilWorkspaceFollowIntent(current, current)).toBe('activate')
  })

  it('recalls a genuine multi-object session in the same event order', () => {
    const memory = new BasilWorkspaceTargetMemory(10_000)
    const baseline = state('before', 'conversation')

    const targets = [
      target({ processId: 11, target: 'document' }),
      target({ processId: 12, target: 'editor' }),
      target({ processId: 13, target: 'terminal' }),
      target({ processId: 14, target: 'web' })
    ]

    targets.forEach((item, index) => memory.remember(item, baseline, 100 + index))

    expect(memory.consume(state('journey', 'document', 'hermes', 'reading', 'inspect'), 200)?.processId).toBe(11)
    expect(memory.consume(state('journey', 'editor', 'hermes', 'writing', 'execute'), 300)?.processId).toBe(12)
    expect(memory.consume(state('journey', 'terminal', 'hermes', 'tool_start', 'execute'), 400)?.processId).toBe(13)
    expect(memory.consume(state('journey', 'web', 'hermes', 'searching', 'inspect'), 500)?.processId).toBe(14)
  })
})
