import { describe, expect, it } from 'vitest'

import {
  BASIL_INTERACTION_BY_ID,
  BASIL_INTERACTIONS,
  sampleBasilInteraction
} from './interaction-pack'

describe('Basil interaction pack', () => {
  it('contains exactly 100 complete, uniquely named interactions across ten categories', () => {
    expect(BASIL_INTERACTIONS).toHaveLength(100)
    expect(new Set(BASIL_INTERACTIONS.map(interaction => interaction.id))).toHaveLength(100)
    expect(new Set(BASIL_INTERACTIONS.map(interaction => interaction.label))).toHaveLength(100)
    expect(new Set(BASIL_INTERACTIONS.map(interaction => interaction.category))).toHaveLength(10)

    const categoryCounts = BASIL_INTERACTIONS.reduce<Record<string, number>>((counts, interaction) => {
      counts[interaction.category] = (counts[interaction.category] ?? 0) + 1

      return counts
    }, {})

    expect(Object.values(categoryCounts)).toEqual(expect.arrayContaining(Array.from({ length: 10 }, () => 10)))

    for (const interaction of BASIL_INTERACTIONS) {
      expect(BASIL_INTERACTION_BY_ID.get(interaction.id)).toBe(interaction)
      expect(interaction.durationMs).toBeGreaterThanOrEqual(1900)
      expect(interaction.durationMs).toBeLessThanOrEqual(6200)
      expect(interaction.amplitude).toBeGreaterThan(0)
      expect(interaction.scene).toBeTruthy()
      expect(interaction.accessory).toBeTruthy()
      expect(interaction.motif).toBeTruthy()
    }
  })

  it('samples every interaction as four finite, bounded animation beats', () => {
    for (const interaction of BASIL_INTERACTIONS) {
      const samples = [0.05, 0.3, 0.55, 0.8].map(progress =>
        sampleBasilInteraction(interaction, interaction.durationMs * progress)
      )

      expect(samples.map(sample => sample.beat)).toEqual([0, 1, 2, 3])

      for (const sample of samples) {
        expect(sample.accessory).toBe(interaction.accessory)
        expect(sample.side).toBe(interaction.mirror)
        expect(sample.progress).toBeGreaterThanOrEqual(0)
        expect(sample.progress).toBeLessThanOrEqual(1)
        expect(Object.values(sample.parameters).every(value => Number.isFinite(value))).toBe(true)
        expect([sample.x, sample.y, sample.rotation, sample.scaleX, sample.scaleY].every(Number.isFinite)).toBe(true)
        expect(sample.parameters.energy).toBeGreaterThanOrEqual(0)
        expect(sample.parameters.energy).toBeLessThanOrEqual(1)
        expect(sample.parameters.mouth).toBeGreaterThanOrEqual(-1)
        expect(sample.parameters.mouth).toBeLessThanOrEqual(1)
      }
    }
  })

  it('keeps non-looping celebrations settled and active work cues cycling', () => {
    const success = BASIL_INTERACTION_BY_ID.get('mission-complete')!
    const writing = BASIL_INTERACTION_BY_ID.get('code-scribe')!

    expect(success.loop).toBe(false)
    expect(sampleBasilInteraction(success, success.durationMs * 2).progress).toBe(1)
    expect(writing.loop).toBe(true)
    expect(sampleBasilInteraction(writing, writing.durationMs * 1.25).progress).toBeCloseTo(0.25)
  })
})
