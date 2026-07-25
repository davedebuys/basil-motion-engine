import { describe, expect, it } from 'vitest'

import { deriveBasilSpeechExpression } from './speech-expression-engine'

describe('deriveBasilSpeechExpression', () => {
  it('produces compact, bounded procedural phonemes', () => {
    const poses = Array.from({ length: 1001 }, (_, index) =>
      deriveBasilSpeechExpression({
        energy: index / 1000,
        expression: Math.sin(index / 90),
        phase: index / 1000
      })
    )

    for (const pose of poses) {
      expect(Number.isFinite(pose.mouthWidth)).toBe(true)
      expect(Number.isFinite(pose.mouthHeight)).toBe(true)
      expect(pose.mouthWidth).toBeGreaterThanOrEqual(2.15)
      expect(pose.mouthWidth).toBeLessThan(3.9)
      expect(pose.mouthHeight).toBeGreaterThanOrEqual(0.68)
      expect(pose.mouthHeight).toBeLessThan(2.73)
      expect(pose.openness).toBeGreaterThanOrEqual(0)
      expect(pose.openness).toBeLessThanOrEqual(1)
      expect(pose.eyeSmile).toBeGreaterThanOrEqual(0)
      expect(pose.eyeSmile).toBeLessThanOrEqual(1)
    }

    expect(new Set(poses.map(pose => pose.shape))).toEqual(new Set(['open', 'round', 'smile', 'soft']))
  })

  it('changes continuously through the speech cycle and wraps cleanly', () => {
    const samples = Array.from({ length: 1001 }, (_, index) =>
      deriveBasilSpeechExpression({ energy: 0.7, expression: 0.4, phase: index / 1000 })
    )

    const largestWidthStep = Math.max(
      ...samples.slice(1).map((pose, index) => Math.abs(pose.mouthWidth - samples[index].mouthWidth))
    )

    const largestHeightStep = Math.max(
      ...samples.slice(1).map((pose, index) => Math.abs(pose.mouthHeight - samples[index].mouthHeight))
    )

    expect(largestWidthStep).toBeLessThan(0.02)
    expect(largestHeightStep).toBeLessThan(0.02)
    expect(samples[0].mouthWidth).toBeCloseTo(samples.at(-1)!.mouthWidth, 8)
    expect(samples[0].mouthHeight).toBeCloseTo(samples.at(-1)!.mouthHeight, 8)
  })

  it('uses a restrained eye smile for one phrase emphasis instead of closing the eyes continuously', () => {
    const open = deriveBasilSpeechExpression({ energy: 0.7, expression: 0.4, phase: 0.05 })
    const emphasis = deriveBasilSpeechExpression({ energy: 0.7, expression: 0.4, phase: 0.36 })
    const release = deriveBasilSpeechExpression({ energy: 0.7, expression: 0.4, phase: 0.68 })

    expect(open.eyeSmile).toBe(0)
    expect(emphasis.eyeSmile).toBeGreaterThan(0.7)
    expect(release.eyeSmile).toBe(0)
  })
})
