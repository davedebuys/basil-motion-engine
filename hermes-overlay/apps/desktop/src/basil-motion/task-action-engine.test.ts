import { describe, expect, it } from 'vitest'

import { basilSceneMotion } from './scene-motion'
import { applyBasilTaskActionMotion, deriveBasilTaskAction } from './task-action-engine'

describe('Basil semantic task actions', () => {
  it('maps genuine editor lifecycle into plan, compose, review, and save', () => {
    const action = (phase: 'complete' | 'execute' | 'inspect' | 'prepare') =>
      deriveBasilTaskAction({ eventKind: 'writing', phase, target: 'editor' }).action

    expect((['prepare', 'execute', 'inspect', 'complete'] as const).map(action)).toEqual([
      'plan',
      'compose',
      'review',
      'save'
    ])
  })

  it('maps web work into query, navigate, scan, and select', () => {
    const action = (phase: 'complete' | 'execute' | 'inspect' | 'prepare') =>
      deriveBasilTaskAction({ eventKind: 'searching', phase, target: 'web' }).action

    expect((['prepare', 'execute', 'inspect', 'complete'] as const).map(action)).toEqual([
      'query',
      'navigate',
      'scan',
      'select'
    ])
  })

  it('distinguishes document reading from writing without importing Hermes', () => {
    expect(deriveBasilTaskAction({ eventKind: 'reading', phase: 'execute', target: 'document' }).action).toBe('read')
    expect(deriveBasilTaskAction({ eventKind: 'writing', phase: 'execute', target: 'document' }).action).toBe('compose')
  })

  it('uses target-specific execution and inspection actions', () => {
    expect(deriveBasilTaskAction({ phase: 'execute', target: 'terminal' }).action).toBe('run')
    expect(deriveBasilTaskAction({ phase: 'inspect', target: 'terminal' }).action).toBe('monitor')
    expect(deriveBasilTaskAction({ phase: 'execute', target: 'data' }).action).toBe('analyze')
    expect(deriveBasilTaskAction({ phase: 'inspect', target: 'tool' }).action).toBe('verify')
  })

  it('changes procedural motion for preparation, inspection, and completion', () => {
    const motion = basilSceneMotion('web', 0.25, 0.8)
    const prepare = applyBasilTaskActionMotion(motion, deriveBasilTaskAction({ phase: 'prepare', target: 'web' }))
    const inspect = applyBasilTaskActionMotion(motion, deriveBasilTaskAction({ phase: 'inspect', target: 'web' }))
    const complete = applyBasilTaskActionMotion(motion, deriveBasilTaskAction({ phase: 'complete', target: 'web' }))

    expect(Math.abs(prepare.gesture)).toBeLessThan(Math.abs(motion.gesture))
    expect(prepare.progress).toBe(0)
    expect(inspect.progress).toBe(0.75)
    expect(complete).toMatchObject({ gesture: 0, progress: 1, propLift: 0, propRotation: 0, pulse: 1 })
  })

  it('leaves ordinary object interaction unchanged when no task phase exists', () => {
    const motion = basilSceneMotion('folder', 0.4, 0.8)
    const action = deriveBasilTaskAction({ target: 'folder' })

    expect(action).toMatchObject({ action: 'idle', active: false, cue: 'none', phase: 'idle' })
    expect(applyBasilTaskActionMotion(motion, action)).toBe(motion)
  })
})
