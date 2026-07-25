import { describe, expect, it } from 'vitest'

import { BASIL_TOUR_CHAPTERS, BASIL_TOUR_INTERACTION_COUNT } from './basil-tour-data'
import { BASIL_INTERACTIONS } from './interaction-pack'

describe('Basil tour data', () => {
  it('covers every named pack interaction exactly once in the category tour', () => {
    const interactionIds = BASIL_TOUR_CHAPTERS.slice(0, 10).flatMap(chapter => chapter.interactionIds)

    expect(BASIL_TOUR_INTERACTION_COUNT).toBe(100)
    expect(interactionIds).toHaveLength(100)
    expect(new Set(interactionIds).size).toBe(100)
    expect(new Set(interactionIds)).toEqual(new Set(BASIL_INTERACTIONS.map(interaction => interaction.id)))
  })

  it('provides local narration and usable showcase content for every chapter', () => {
    expect(BASIL_TOUR_CHAPTERS).toHaveLength(12)

    for (const chapter of BASIL_TOUR_CHAPTERS) {
      expect(chapter.audioSrc).toMatch(/^\.\/basil-motion\/\d{2}-.+\.mp3$/)
      expect(chapter.capabilities.length).toBeGreaterThanOrEqual(4)
      expect(chapter.durationSeconds).toBeGreaterThan(10)
      expect(chapter.interactionIds).toHaveLength(10)
      expect(chapter.narration.length).toBeGreaterThan(100)
    }
  })
})
