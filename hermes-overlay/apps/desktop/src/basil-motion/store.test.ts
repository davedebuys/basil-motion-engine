import { beforeEach, describe, expect, it } from 'vitest'

import { $basilSnapshot, applyBasilAgentEvent } from './store'

describe('Basil generic event journey integration', () => {
  beforeEach(() => {
    $basilSnapshot.set({ state: 'idle' })
  })

  it('advances the shared snapshot journey from generic agent events', () => {
    applyBasilAgentEvent({
      id: 'workflow',
      kind: 'reading',
      scene: { target: 'document' },
      source: 'another-agent'
    })
    applyBasilAgentEvent({
      id: 'workflow',
      kind: 'writing',
      scene: { target: 'editor' },
      source: 'another-agent'
    })
    applyBasilAgentEvent({
      id: 'workflow',
      kind: 'tool_start',
      scene: { target: 'terminal' },
      source: 'another-agent'
    })

    expect($basilSnapshot.get().journey).toMatchObject({
      currentTarget: 'terminal',
      stepCount: 3,
      trail: ['document', 'editor', 'terminal'],
      transition: 'advance'
    })
  })
})
