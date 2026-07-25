import { describe, expect, it } from 'vitest'

import { deriveBasilEngagementPose } from './engagement-engine'

describe('Basil engagement staging', () => {
  it('notices a preview without committing both hands', () => {
    const pose = deriveBasilEngagementPose('editor', 'preview')

    expect(pose).toMatchObject({ handCount: 1, limbReach: 0.12, propIntensity: 0.56, stage: 'notice' })
  })

  it('prepares while genuinely approaching and acts after arrival', () => {
    const prepare = deriveBasilEngagementPose('terminal', 'approach')
    const act = deriveBasilEngagementPose('terminal', 'engaged')

    expect(prepare).toMatchObject({ handCount: 2, limbReach: 0.64, stage: 'prepare' })
    expect(act).toMatchObject({ handCount: 2, limbReach: 1, stage: 'act' })
    expect(prepare?.bodyLean).toBeGreaterThan(act?.bodyLean ?? 0)
  })

  it('does not fabricate object engagement at rest or in conversation', () => {
    expect(deriveBasilEngagementPose('rest', 'preview')).toBeNull()
    expect(deriveBasilEngagementPose('conversation', 'engaged')).toBeNull()
  })
})
