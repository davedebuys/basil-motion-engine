import { describe, expect, it } from 'vitest'

import { stateForGenericAgentEvent } from '../engine'

import { hermesToGenericAgentEvent } from './hermes'

const map = (type: string, payload: Record<string, unknown> = {}) => {
  const generic = hermesToGenericAgentEvent({ payload, session_id: 's1', type })

  return generic ? stateForGenericAgentEvent(generic) : null
}

describe('hermesToGenericAgentEvent', () => {
  it('maps assistant lifecycle events', () => {
    expect(map('message.start')).toBe('thinking')
    expect(map('message.delta', { text: 'hello' })).toBe('speaking')
    expect(map('message.complete', { text: 'done' })).toBe('success')
    expect(map('error', { message: 'failed' })).toBe('error')
  })

  it('maps blocking request events to awaiting_permission', () => {
    expect(map('approval.request', { command: 'rm file' })).toBe('awaiting_permission')
    expect(map('clarify.request', { question: 'Which one?' })).toBe('awaiting_permission')
    expect(map('secret.request', { env_var: 'TOKEN' })).toBe('awaiting_permission')
    expect(map('sudo.request', { request_id: 'sudo-1' })).toBe('awaiting_permission')
  })

  it('classifies tool calls by genuine tool names', () => {
    expect(map('tool.start', { name: 'web_search' })).toBe('searching')
    expect(map('tool.progress', { name: 'read_file' })).toBe('reading')
    expect(map('tool.generating', { name: 'apply_patch' })).toBe('writing')
    expect(map('tool.start', { name: 'terminal' })).toBe('using_tool')
  })

  it('adds reusable scene intent for real Hermes work', () => {
    expect(
      hermesToGenericAgentEvent({ payload: { name: 'web_search' }, session_id: 's1', type: 'tool.start' })?.scene
    ).toEqual({
      label: 'web_search',
      resourceKind: 'link',
      taskPhase: 'execute',
      target: 'web'
    })
    expect(
      hermesToGenericAgentEvent({ payload: { name: 'apply_patch' }, session_id: 's1', type: 'tool.start' })?.scene
    ).toEqual({
      label: 'apply_patch',
      resourceKind: 'code',
      taskPhase: 'execute',
      target: 'editor'
    })
    expect(
      hermesToGenericAgentEvent({ payload: { name: 'terminal' }, session_id: 's1', type: 'tool.start' })?.scene
    ).toEqual({
      label: 'terminal',
      resourceKind: 'terminal',
      taskPhase: 'execute',
      target: 'terminal'
    })
    expect(
      hermesToGenericAgentEvent({ payload: { name: 'view_image' }, session_id: 's1', type: 'tool.start' })?.scene
    ).toEqual({
      label: 'view_image',
      resourceKind: 'image',
      taskPhase: 'execute',
      target: 'image'
    })
    expect(
      hermesToGenericAgentEvent({ payload: { name: 'edit_spreadsheet' }, session_id: 's1', type: 'tool.start' })?.scene
    ).toEqual({
      label: 'edit_spreadsheet',
      resourceKind: 'data',
      taskPhase: 'execute',
      target: 'data'
    })
    expect(hermesToGenericAgentEvent({ payload: {}, session_id: 's1', type: 'approval.request' })?.scene?.target).toBe(
      'permission'
    )
  })

  it('maps tool completion and idle without inventing activity', () => {
    expect(map('tool.complete', { name: 'web_search' })).toBe('thinking')
    expect(
      hermesToGenericAgentEvent({ payload: { name: 'web_search' }, session_id: 's1', type: 'tool.complete' })?.scene
    ).toEqual({ label: 'web_search', resourceKind: 'link', target: 'web', taskPhase: 'complete' })
    expect(map('session.info', { running: false })).toBe('idle')
    expect(map('session.info', { running: true })).toBeNull()
  })

  it('preserves genuine tool lifecycle as portable task phases', () => {
    const phase = (type: string) =>
      hermesToGenericAgentEvent({ payload: { name: 'apply_patch' }, session_id: 's1', type })?.scene?.taskPhase

    expect(phase('tool.generating')).toBe('prepare')
    expect(phase('tool.start')).toBe('execute')
    expect(phase('tool.progress')).toBe('inspect')
    expect(phase('tool.complete')).toBe('complete')
  })

  it('preserves privacy-safe session and event-type identity for stable semantic routing', () => {
    const start = hermesToGenericAgentEvent({ payload: {}, session_id: 'session-semantic', type: 'message.start' })

    const permission = hermesToGenericAgentEvent({
      payload: { command: 'ignored content' },
      session_id: 'session-semantic',
      type: 'sudo.request'
    })

    expect(start).toMatchObject({ id: 'session-semantic', label: 'message.start' })
    expect(permission).toMatchObject({ id: 'session-semantic', label: 'sudo.request' })
  })

  it('maps reasoning and compaction to active states', () => {
    expect(map('reasoning.delta', { text: 'considering' })).toBe('thinking')
    expect(map('reasoning.available', { text: 'summary' })).toBe('thinking')
    expect(map('status.update', { kind: 'compacting' })).toBe('reading')
  })
})
