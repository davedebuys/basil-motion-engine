import { describe, expect, it } from 'vitest'

import { BASIL_PERSONALITY_BEHAVIORS, BASIL_PERSONALITY_BY_ID } from './personality-pack'

describe('Basil personality pack', () => {
  it('contains 20 unique named behaviours and 20 distinct motifs', () => {
    expect(BASIL_PERSONALITY_BEHAVIORS).toHaveLength(20)
    expect(new Set(BASIL_PERSONALITY_BEHAVIORS.map(behavior => behavior.id)).size).toBe(20)
    expect(new Set(BASIL_PERSONALITY_BEHAVIORS.map(behavior => behavior.label)).size).toBe(20)
    expect(new Set(BASIL_PERSONALITY_BEHAVIORS.map(behavior => behavior.motif)).size).toBe(20)
    expect(BASIL_PERSONALITY_BY_ID.size).toBe(20)
  })

  it('keeps every behaviour finite and attached to genuine signal eligibility', () => {
    for (const behavior of BASIL_PERSONALITY_BEHAVIORS) {
      expect(behavior.durationMs).toBeGreaterThanOrEqual(2000)
      expect(behavior.durationMs).toBeLessThanOrEqual(6000)
      expect(behavior.allowedStates.length).toBeGreaterThan(0)
      expect(behavior.signal).toBeTruthy()
    }
  })
})
