import { describe, expect, it } from 'vitest'

import { BASIL_INTERACTION_BY_ID, BASIL_INTERACTIONS } from './interaction-pack'
import { interactionForGenericAgentEvent } from './interaction-router'
import type { GenericAgentEvent } from './types'

const route = (event: GenericAgentEvent) => interactionForGenericAgentEvent(event)

describe('Basil semantic interaction router', () => {
  it.each([
    [{ kind: 'agent_idle' }, 'hello-basil'],
    [{ kind: 'listening' }, 'all-ears'],
    [{ kind: 'assistant_start' }, 'deep-thought'],
    [{ kind: 'thinking', label: 'brainstorm ideas' }, 'brainstorm'],
    [{ kind: 'thinking', label: 'make a plan' }, 'plan-ready'],
    [{ kind: 'searching', scene: { target: 'image' } }, 'image-hunt'],
    [{ kind: 'searching', scene: { target: 'data' } }, 'data-hunt'],
    [{ kind: 'searching', scene: { target: 'folder' } }, 'file-hunt'],
    [{ kind: 'searching', label: 'cross_reference', scene: { target: 'web' } }, 'cross-reference'],
    [{ kind: 'searching', label: 'map route', scene: { target: 'web' } }, 'map-route'],
    [{ kind: 'reading', label: 'compacting', scene: { target: 'document' } }, 'memory-search'],
    [{ kind: 'reading', label: 'rg', scene: { target: 'document' } }, 'line-follow'],
    [{ kind: 'reading', scene: { target: 'image' } }, 'image-inspect'],
    [{ kind: 'reading', scene: { target: 'data' } }, 'chart-read'],
    [{ kind: 'reading', scene: { target: 'editor' } }, 'code-review'],
    [{ kind: 'writing', label: 'apply_patch', scene: { target: 'editor' } }, 'fix-patch'],
    [{ kind: 'writing', label: 'rename_file', scene: { target: 'folder' } }, 'rename-file'],
    [{ kind: 'writing', label: 'save_document', scene: { target: 'document' } }, 'save-document'],
    [{ kind: 'writing', label: 'organize_notes', scene: { target: 'document' } }, 'organize-notes'],
    [{ kind: 'tool_start', label: 'run terminal', scene: { target: 'terminal' } }, 'terminal-command'],
    [{ kind: 'tool_start', label: 'install package', scene: { target: 'terminal' } }, 'install-package'],
    [{ kind: 'tool_start', label: 'settings', scene: { target: 'tool' } }, 'settings-adjust'],
    [{ kind: 'tool_complete', label: 'web_search', scene: { target: 'web' } }, 'found-a-lead'],
    [{ kind: 'tool_complete', label: 'read_file', scene: { target: 'document' } }, 'reading-complete'],
    [{ kind: 'tool_complete', label: 'apply_patch', scene: { target: 'editor' } }, 'final-polish'],
    [{ kind: 'awaiting_permission', label: 'secret.request' }, 'key-request'],
    [{ kind: 'awaiting_permission', label: 'sudo.request' }, 'risk-warning'],
    [{ kind: 'awaiting_permission', label: 'clarify.request' }, 'review-needed'],
    [{ kind: 'awaiting_permission', label: 'approval.request' }, 'confirm-action'],
    [{ kind: 'assistant_success', label: 'voice listening complete' }, 'listening-done'],
    [{ kind: 'assistant_success', scene: { target: 'folder' } }, 'saved-safely'],
    [{ kind: 'assistant_success', scene: { target: 'document' } }, 'neat-finish'],
    [{ kind: 'assistant_success', scene: { target: 'permission' } }, 'permission-granted'],
    [{ kind: 'assistant_delta', scene: { target: 'document' } }, 'read-aloud'],
    [{ kind: 'assistant_delta', label: 'explain step' }, 'explain-step'],
    [{ kind: 'agent_error', label: 'retry recovery' }, 'retry-ready'],
    [{ kind: 'agent_error' }, 'gentle-oops'],
    [{ kind: 'agent_sleep' }, 'good-night']
  ] satisfies Array<[GenericAgentEvent, string]>)('maps semantic event %j to %s', (event, interaction) => {
    expect(route(event)).toBe(interaction)
  })

  it('uses genuine lifecycle phase to select distinct preparation, action, review, and completion cues', () => {
    const patch = (kind: GenericAgentEvent['kind'], taskPhase: NonNullable<GenericAgentEvent['scene']>['taskPhase']) =>
      route({ id: 'session-patch', kind, label: 'apply_patch', scene: { target: 'editor', taskPhase } })

    const web = (kind: GenericAgentEvent['kind'], taskPhase: NonNullable<GenericAgentEvent['scene']>['taskPhase']) =>
      route({ id: 'session-web', kind, label: 'web_search', scene: { target: 'web', taskPhase } })

    expect([
      patch('writing', 'prepare'),
      patch('writing', 'execute'),
      patch('writing', 'inspect'),
      patch('tool_complete', 'complete')
    ]).toEqual(['pencil-ready', 'fix-patch', 'careful-edit', 'final-polish'])
    expect([
      web('searching', 'prepare'),
      web('searching', 'execute'),
      web('searching', 'inspect'),
      web('tool_complete', 'complete')
    ]).toEqual(['web-scout', 'link-hop', 'scan-results', 'found-a-lead'])
  })

  it('keeps repeated real-session events stable while varying independent sessions within compatible categories', () => {
    const event = { id: 'stable-session', kind: 'thinking' as const, scene: { target: 'conversation' as const } }

    expect(route(event)).toBe(route({ ...event }))

    const cues = new Set(
      Array.from({ length: 80 }, (_, index) =>
        route({ id: `focus-session-${index}`, kind: 'thinking', scene: { target: 'conversation' } })
      )
    )

    expect(cues.size).toBeGreaterThanOrEqual(8)
    expect([...cues].every(id => BASIL_INTERACTION_BY_ID.get(id)?.category === 'focus')).toBe(true)
  })

  it('never scans arbitrary content fields to choose a sensitive animation', () => {
    const event: GenericAgentEvent = {
      kind: 'awaiting_permission',
      payload: { command: 'sudo reveal secret token', text: 'credential password key' }
    }

    expect(route(event)).toBe('permission-please')
  })

  it('makes every catalog interaction reachable from genuine generic event structure', () => {
    const reached = new Set<string>()

    for (let index = 0; index < 800; index += 1) {
      const id = `runtime-session-${index}`

      reached.add(route({ id, kind: 'agent_idle' }))
      reached.add(route({ id, kind: 'listening' }))
      reached.add(route({ id, kind: 'thinking' }))
      reached.add(route({ id, kind: 'searching' }))
      reached.add(route({ id, kind: 'reading' }))
      reached.add(route({ id, kind: 'writing' }))
      reached.add(route({ id, kind: 'tool_start' }))
      reached.add(route({ id, kind: 'awaiting_permission' }))
      reached.add(route({ id, kind: 'assistant_success' }))
      reached.add(route({ id, kind: 'assistant_delta' }))
      reached.add(route({ id, kind: 'agent_error' }))
      reached.add(route({ id, kind: 'agent_sleep' }))
    }

    reached.add(route({ kind: 'assistant_success', label: 'listening complete' }))
    reached.add(route({ kind: 'assistant_success', scene: { target: 'permission' } }))
    reached.add(route({ kind: 'agent_error', label: 'retry recovery' }))
    reached.add(route({ kind: 'tool_complete', scene: { target: 'document' } }))
    reached.add(route({ kind: 'tool_complete', scene: { target: 'tool' } }))
    reached.add(route({ kind: 'tool_complete', scene: { target: 'web' } }))

    expect([...reached].sort()).toEqual(BASIL_INTERACTIONS.map(interaction => interaction.id).sort())
  })
})
