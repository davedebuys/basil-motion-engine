import { describe, expect, it } from 'vitest'

import { deriveBasilAntennaSignal } from './antenna-signal-engine'
import { BASIL_STATES } from './engine'

describe('deriveBasilAntennaSignal', () => {
  it.each(BASIL_STATES)('returns a bounded, finite pose for %s', state => {
    const pose = deriveBasilAntennaSignal({
      energy: 0.7,
      phase: 0.37,
      state
    })

    expect(Number.isFinite(pose.lean)).toBe(true)
    expect(pose.lean).toBeGreaterThanOrEqual(-18)
    expect(pose.lean).toBeLessThanOrEqual(18)
    expect(pose.pulse).toBeGreaterThanOrEqual(0)
    expect(pose.pulse).toBeLessThanOrEqual(1)
    expect(pose.tipScale).toBeGreaterThanOrEqual(0.9)
    expect(pose.tipScale).toBeLessThanOrEqual(1.12)
  })

  it('distinguishes receive, process, work, guard, result, alert, transmit, and sleep signals', () => {
    const signalFor = (state: (typeof BASIL_STATES)[number]) =>
      deriveBasilAntennaSignal({ energy: 0.5, phase: 0.25, state }).signal

    expect(signalFor('listening')).toBe('receive')
    expect(signalFor('thinking')).toBe('process')
    expect(signalFor('using_tool')).toBe('work')
    expect(signalFor('awaiting_permission')).toBe('guard')
    expect(signalFor('success')).toBe('result')
    expect(signalFor('error')).toBe('alert')
    expect(signalFor('speaking')).toBe('transmit')
    expect(signalFor('sleeping')).toBe('sleep')
  })

  it('raises pulse with genuine energy without changing the state signal', () => {
    const quiet = deriveBasilAntennaSignal({ energy: 0, phase: 0.2, state: 'using_tool' })
    const energetic = deriveBasilAntennaSignal({ energy: 1, phase: 0.2, state: 'using_tool' })

    expect(energetic.pulse).toBeGreaterThan(quiet.pulse)
    expect(energetic.signal).toBe(quiet.signal)
  })

  it('leans toward genuine joint attention while preserving the state pulse', () => {
    const left = deriveBasilAntennaSignal({
      attentionStrength: 1,
      attentionX: -1,
      energy: 0.5,
      phase: 0,
      state: 'listening'
    })

    const right = deriveBasilAntennaSignal({
      attentionStrength: 1,
      attentionX: 1,
      energy: 0.5,
      phase: 0,
      state: 'listening'
    })

    expect(left.attentionBias).toBeCloseTo(-3.2)
    expect(right.attentionBias).toBeCloseTo(3.2)
    expect(right.lean - left.lean).toBeCloseTo(6.4)
    expect(right.pulse).toBe(left.pulse)
  })

  it('attenuates attention in guarded, error, and sleeping states', () => {
    const biasFor = (state: 'awaiting_permission' | 'error' | 'idle' | 'sleeping') =>
      deriveBasilAntennaSignal({
        attentionStrength: 1,
        attentionX: 1,
        energy: 0.5,
        phase: 0,
        state
      }).attentionBias

    expect(biasFor('idle')).toBeCloseTo(3.2)
    expect(biasFor('awaiting_permission')).toBeCloseTo(0.96)
    expect(biasFor('error')).toBeCloseTo(1.344)
    expect(biasFor('sleeping')).toBeCloseTo(0.256)
  })

  it('lets petting direction produce the strongest playful wag while remaining bounded', () => {
    const left = deriveBasilAntennaSignal({
      energy: 0.4,
      petting: 1,
      pettingDirection: -1,
      phase: 0.08,
      state: 'idle'
    })

    const right = deriveBasilAntennaSignal({
      energy: 0.4,
      petting: 1,
      pettingDirection: 1,
      phase: 0.08,
      state: 'idle'
    })

    expect(left.petWag).toBeLessThan(0)
    expect(right.petWag).toBeGreaterThan(0)
    expect(left.lean).toBeGreaterThanOrEqual(-18)
    expect(right.lean).toBeLessThanOrEqual(18)
  })

  it('sanitizes malformed portable adapter values', () => {
    const pose = deriveBasilAntennaSignal({
      attentionStrength: 99,
      attentionX: -99,
      energy: Number.POSITIVE_INFINITY,
      petting: Number.NaN,
      pettingDirection: 99,
      phase: Number.NaN,
      state: 'idle'
    })

    expect(pose).toMatchObject({
      attentionBias: -3.2,
      petWag: 0,
      signal: 'calm'
    })
    expect(Number.isFinite(pose.lean)).toBe(true)
    expect(Number.isFinite(pose.pulse)).toBe(true)
  })
})
