import { describe, expect, it } from 'vitest'

import { advanceBasilTaskJourney } from './task-journey-engine'
import type { GenericAgentEvent } from './types'

function event(
  kind: GenericAgentEvent['kind'],
  target: NonNullable<GenericAgentEvent['scene']>['target'],
  taskPhase?: NonNullable<GenericAgentEvent['scene']>['taskPhase'],
  id = 'session-a'
): GenericAgentEvent {
  return { id, kind, scene: { target, taskPhase }, source: 'generic-agent' }
}

describe('Basil task journey engine', () => {
  it('builds one privacy-safe trail from genuine cross-surface events', () => {
    const document = advanceBasilTaskJourney(undefined, event('reading', 'document', 'inspect'))
    const editor = advanceBasilTaskJourney(document, event('writing', 'editor', 'execute'))
    const terminal = advanceBasilTaskJourney(editor, event('tool_start', 'terminal', 'execute'))
    const web = advanceBasilTaskJourney(terminal, event('searching', 'web', 'inspect'))

    expect(web).toMatchObject({
      currentTarget: 'web',
      previousTarget: 'terminal',
      status: 'active',
      stepCount: 4,
      trail: ['document', 'editor', 'terminal', 'web'],
      transition: 'advance',
      visitedTargets: ['document', 'editor', 'terminal', 'web']
    })
    expect(web).not.toHaveProperty('label')
    expect(web).not.toHaveProperty('payload')
  })

  it('does not add steps for repeated lifecycle phases on one surface', () => {
    const prepare = advanceBasilTaskJourney(undefined, event('writing', 'editor', 'prepare'))
    const execute = advanceBasilTaskJourney(prepare, event('writing', 'editor', 'execute'))
    const inspect = advanceBasilTaskJourney(execute, event('writing', 'editor', 'inspect'))

    expect(inspect).toMatchObject({
      currentTarget: 'editor',
      stepCount: 1,
      trail: ['editor'],
      transition: 'repeat'
    })
    expect(advanceBasilTaskJourney(inspect, event('writing', 'editor', 'inspect'))).toBe(inspect)
  })

  it('marks genuine returns, pauses, resumes, failures, and completion', () => {
    const document = advanceBasilTaskJourney(undefined, event('reading', 'document'))
    const editor = advanceBasilTaskJourney(document, event('writing', 'editor'))
    const returned = advanceBasilTaskJourney(editor, event('reading', 'document'))
    const paused = advanceBasilTaskJourney(returned, event('awaiting_permission', 'permission'))
    const resumed = advanceBasilTaskJourney(paused, event('reading', 'document', 'inspect'))
    const failed = advanceBasilTaskJourney(resumed, event('agent_error', 'error'))
    const complete = advanceBasilTaskJourney(resumed, event('assistant_success', 'conversation'))

    expect(returned?.transition).toBe('return')
    expect(returned?.trail).toEqual(['document', 'editor', 'document'])
    expect(paused?.status).toBe('paused')
    expect(paused?.transition).toBe('pause')
    expect(resumed?.status).toBe('active')
    expect(resumed?.transition).toBe('resume')
    expect(failed?.status).toBe('failed')
    expect(complete?.status).toBe('complete')
  })

  it('keeps only the four newest generic targets while retaining the total step count', () => {
    const targets = ['folder', 'document', 'editor', 'terminal', 'web'] as const

    const journey = targets.reduce(
      (current, target) => advanceBasilTaskJourney(current, event('tool_start', target)),
      undefined as ReturnType<typeof advanceBasilTaskJourney>
    )

    expect(journey?.stepCount).toBe(5)
    expect(journey?.trail).toEqual(['document', 'editor', 'terminal', 'web'])
    expect(journey?.visitedTargets).toEqual(['folder', 'document', 'editor', 'terminal', 'web'])

    const returned = advanceBasilTaskJourney(journey, event('tool_start', 'folder', 'inspect'))

    expect(returned?.transition).toBe('return')
    expect(returned?.trail).toEqual(['editor', 'terminal', 'web', 'folder'])
  })

  it('starts fresh for another session and ignores development-only events', () => {
    const first = advanceBasilTaskJourney(undefined, event('writing', 'editor'))
    const second = advanceBasilTaskJourney(first, event('searching', 'web', undefined, 'session-b'))

    const development = advanceBasilTaskJourney(second, {
      id: 'dev',
      kind: 'writing',
      scene: { target: 'editor' },
      source: 'development'
    })

    expect(second).toMatchObject({ stepCount: 1, trail: ['web'], transition: 'start' })
    expect(development).toBe(second)
  })
})
