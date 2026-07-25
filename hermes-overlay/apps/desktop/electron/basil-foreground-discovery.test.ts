import { describe, expect, it } from 'vitest'

import type { BasilExternalTarget } from './basil-external-scene'
import {
  BasilForegroundDiscoveryGate,
  shouldAcceptBasilForegroundDiscovery,
  WINDOWS_UIA_FOREGROUND_DISCOVERY_SCRIPT
} from './basil-foreground-discovery'

function state(
  id: string,
  target = 'editor',
  source = 'hermes'
) {
  return {
    snapshot: {
      lastEvent: {
        id,
        kind: 'tool_start',
        label: 'apply_patch',
        scene: { target, taskPhase: 'execute' },
        source
      }
    }
  }
}

function target(overrides: Partial<BasilExternalTarget> = {}): BasilExternalTarget {
  return {
    bounds: { height: 500, width: 700, x: 900, y: 120 },
    className: 'EditorSurface',
    controlType: 'Edit',
    intent: 'activate',
    isKeyboardFocusable: true,
    obstacles: [],
    point: { x: 1250, y: 370 },
    processId: 42,
    source: 'windows-uia',
    supportsInvoke: false,
    target: 'editor',
    ...overrides
  }
}

describe('Basil foreground workspace discovery', () => {
  it('requests discovery once for each genuine actionable event', () => {
    const gate = new BasilForegroundDiscoveryGate()
    const first = state('one')

    expect(gate.next(first)).toEqual({
      eventKey: 'hermes|one|tool_start|editor|execute|apply_patch',
      target: 'editor'
    })

    expect(gate.next(first)).toBeNull()
    expect(gate.next(state('two'))?.eventKey).toContain('|two|')
    expect(gate.next(state('dev', 'editor', 'development'))).toBeNull()
    expect(gate.next(state('chat', 'conversation'))).toBeNull()
  })

  it('accepts only a current exact structural match with no active user target', () => {
    const request = new BasilForegroundDiscoveryGate().next(state('one'))!

    const input = {
      activeTarget: null,
      currentPayload: state('one'),
      discoveredTarget: target(),
      ownedProcessIds: [7, 8],
      request
    }

    expect(shouldAcceptBasilForegroundDiscovery(input)).toBe(true)
    expect(
      shouldAcceptBasilForegroundDiscovery({
        ...input,
        activeTarget: target({ activationSource: 'pointer' })
      })
    ).toBe(false)
    expect(
      shouldAcceptBasilForegroundDiscovery({
        ...input,
        currentPayload: state('newer')
      })
    ).toBe(false)
    expect(
      shouldAcceptBasilForegroundDiscovery({
        ...input,
        discoveredTarget: target({ target: 'web' })
      })
    ).toBe(false)
    expect(
      shouldAcceptBasilForegroundDiscovery({
        ...input,
        ownedProcessIds: [42]
      })
    ).toBe(false)
  })

  it('queries only foreground structural UIA metadata and geometry', () => {
    expect(WINDOWS_UIA_FOREGROUND_DISCOVERY_SCRIPT).toContain('GetForegroundWindow')
    expect(WINDOWS_UIA_FOREGROUND_DISCOVERY_SCRIPT).toContain('FocusedElement')
    expect(WINDOWS_UIA_FOREGROUND_DISCOVERY_SCRIPT).toContain('BoundingRectangle')
    expect(WINDOWS_UIA_FOREGROUND_DISCOVERY_SCRIPT).toContain('GetVisibleWindowObstacles')
    expect(WINDOWS_UIA_FOREGROUND_DISCOVERY_SCRIPT).not.toMatch(
      /\.Current\.(Name|Value|HelpText|AutomationId)/
    )
    expect(WINDOWS_UIA_FOREGROUND_DISCOVERY_SCRIPT).not.toContain('ValuePattern')
    expect(WINDOWS_UIA_FOREGROUND_DISCOVERY_SCRIPT).not.toContain('TextPattern')
  })
})
