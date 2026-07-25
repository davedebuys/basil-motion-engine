import { describe, expect, it } from 'vitest'

import { BASIL_STATE_TARGETS } from './engine'
import { applyBasilPersonalityToFrame, sampleBasilPersonality } from './personality-engine'
import { BASIL_PERSONALITY_BEHAVIORS } from './personality-pack'

describe('Basil personality pose sampler', () => {
  it('samples every behaviour into finite bounded procedural motion', () => {
    for (const behavior of BASIL_PERSONALITY_BEHAVIORS) {
      for (const phase of [0, 0.2, 0.5, 0.8, 1]) {
        const pose = sampleBasilPersonality(behavior, behavior.durationMs * phase, -1)

        expect(Object.values(pose).filter(value => typeof value === 'number').every(Number.isFinite)).toBe(true)
        expect(pose.progress).toBeGreaterThanOrEqual(0)
        expect(pose.progress).toBeLessThanOrEqual(1)
        expect(pose.intensity).toBeGreaterThanOrEqual(0)
        expect(pose.intensity).toBeLessThanOrEqual(1)
        expect(pose.side).toBe(-1)
      }
    }
  })

  it('holds the character still under reduced motion while preserving the readable prop cue', () => {
    const behavior = BASIL_PERSONALITY_BEHAVIORS.find(candidate => candidate.id === 'window-surfing')!
    const pose = sampleBasilPersonality(behavior, behavior.durationMs * 0.5, 1, true)

    expect(pose.bodyX).toBe(0)
    expect(pose.bodyY).toBe(-2)
    expect(pose.rotation).toBe(0)
    expect(pose.intensity).toBe(1)
  })

  it('composes a cameo without replacing the authoritative agent state', () => {
    const behavior = BASIL_PERSONALITY_BEHAVIORS.find(candidate => candidate.id === 'typing-mimic')!
    const pose = sampleBasilPersonality(behavior, behavior.durationMs * 0.5)
    const frame = { ...BASIL_STATE_TARGETS.writing, state: 'writing' as const }
    const composed = applyBasilPersonalityToFrame(frame, pose)

    expect(composed.state).toBe('writing')
    expect(composed.interactionY).not.toBe(0)
    expect(composed.eyeY).toBeGreaterThan(frame.eyeY)
  })
})
