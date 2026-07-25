import { describe, expect, it } from 'vitest'

import { createBasilAttentionMemory, recordBasilAttention } from './attention-engine'

describe('Basil attention memory', () => {
  it('derives normalized travel direction and target switching', () => {
    const first = recordBasilAttention(createBasilAttentionMemory(), 'folder', { x: 30, y: 40 }, { x: 0, y: 0 })
    const second = recordBasilAttention(first.memory, 'editor', { x: 130, y: 40 })

    expect(first.transition.direction).toEqual({ x: 0.6, y: 0.8 })
    expect(second.transition.direction).toEqual({ x: 1, y: 0 })
    expect(first.transition.previousTarget).toBeNull()
    expect(second.transition.previousTarget).toBe('folder')
    expect(second.transition.switchedTarget).toBe(true)
    expect(second.transition.sequenceLength).toBe(2)
  })

  it('becomes familiar with repeated targets without persisting object identity', () => {
    let memory = createBasilAttentionMemory()
    let familiarity = 0

    for (let visit = 0; visit < 4; visit += 1) {
      const result = recordBasilAttention(memory, 'terminal', { x: visit * 10, y: 20 })
      memory = result.memory
      familiarity = result.transition.familiarity
    }

    expect(familiarity).toBe(1)
    expect(memory.visits.every(visit => Object.keys(visit).sort().join(',') === 'point,target')).toBe(true)
  })

  it('keeps only a short rolling task sequence', () => {
    let memory = createBasilAttentionMemory()

    for (let visit = 0; visit < 10; visit += 1) {
      memory = recordBasilAttention(memory, visit % 2 ? 'web' : 'document', { x: visit, y: visit }).memory
    }

    expect(memory.visits).toHaveLength(6)
    expect(memory.visits[0].point.x).toBe(4)
  })
})
