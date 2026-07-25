import type { RpcEvent } from '@/types/hermes'

import type { AgentEventAdapter, BasilSceneHint, BasilTaskPhase, GenericAgentEvent } from '../types'

const SEARCH_TOOL_HINTS = ['search', 'web_search', 'web.extract', 'web_extract', 'browser', 'crawl', 'scrape']
const READ_TOOL_HINTS = ['read', 'list', 'open_file', 'cat', 'view', 'inspect', 'grep', 'rg']
const WRITE_TOOL_HINTS = ['write', 'edit', 'patch', 'apply_patch', 'save', 'create', 'delete', 'move', 'rename']
const TERMINAL_TOOL_HINTS = ['bash', 'command', 'exec', 'powershell', 'shell', 'terminal']
const IMAGE_TOOL_HINTS = ['image', 'photo', 'screenshot', 'vision', 'ocr']
const DATA_TOOL_HINTS = ['spreadsheet', 'excel', 'csv', 'table', 'chart', 'plot', 'dataframe']

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

export function hermesToolName(event: RpcEvent): string {
  const payload = asRecord(event.payload)

  return text(payload.name) || text(payload.tool) || text(payload.tool_name) || ''
}

function toolKind(name: string): GenericAgentEvent['kind'] {
  const lower = name.toLowerCase()

  if (SEARCH_TOOL_HINTS.some(hint => lower.includes(hint))) {
    return 'searching'
  }

  if (WRITE_TOOL_HINTS.some(hint => lower.includes(hint))) {
    return 'writing'
  }

  if (READ_TOOL_HINTS.some(hint => lower.includes(hint))) {
    return 'reading'
  }

  return 'tool_start'
}

function toolScene(kind: GenericAgentEvent['kind'], name: string): BasilSceneHint {
  const lower = name.toLowerCase()

  if (IMAGE_TOOL_HINTS.some(hint => lower.includes(hint))) {
    return { resourceKind: 'image', target: 'image' }
  }

  if (DATA_TOOL_HINTS.some(hint => lower.includes(hint))) {
    return { resourceKind: 'data', target: 'data' }
  }

  if (kind === 'searching') {
    return { resourceKind: 'link', target: 'web' }
  }

  if (kind === 'reading') {
    return { resourceKind: 'file', target: 'document' }
  }

  if (kind === 'writing') {
    return { resourceKind: 'code', target: 'editor' }
  }

  if (TERMINAL_TOOL_HINTS.some(hint => lower.includes(hint))) {
    return { resourceKind: 'terminal', target: 'terminal' }
  }

  return { resourceKind: 'control', target: 'tool' }
}

function toolTaskPhase(eventType: string): BasilTaskPhase {
  if (eventType === 'tool.generating') {
    return 'prepare'
  }

  if (eventType === 'tool.progress') {
    return 'inspect'
  }

  if (eventType === 'tool.complete') {
    return 'complete'
  }

  return 'execute'
}

export const hermesToGenericAgentEvent: AgentEventAdapter<RpcEvent> = event => {
  const payload = asRecord(event.payload)
  const id = event.session_id

  if (event.type === 'message.start') {
    return { id, kind: 'assistant_start', label: event.type, payload, scene: { target: 'conversation' }, source: 'hermes' }
  }

  if (event.type === 'message.delta' || event.type === 'message.interim') {
    return { id, kind: 'assistant_delta', label: event.type, payload, scene: { target: 'conversation' }, source: 'hermes' }
  }

  if (event.type === 'message.complete') {
    return {
      id,
      kind: 'assistant_success',
      label: event.type,
      payload,
      scene: { target: 'conversation' },
      source: 'hermes'
    }
  }

  if (event.type === 'reasoning.delta' || event.type === 'reasoning.available' || event.type === 'moa.aggregating') {
    return { id, kind: 'thinking', label: event.type, payload, scene: { target: 'conversation' }, source: 'hermes' }
  }

  if (event.type === 'tool.start' || event.type === 'tool.progress' || event.type === 'tool.generating') {
    const name = hermesToolName(event)
    const kind = toolKind(name)

    return {
      id,
      kind,
      label: name || undefined,
      payload,
      scene: { ...toolScene(kind, name), label: name || undefined, taskPhase: toolTaskPhase(event.type) },
      source: 'hermes'
    }
  }

  if (event.type === 'tool.complete') {
    const name = hermesToolName(event)

    const scene = name
      ? { ...toolScene(toolKind(name), name), label: name, taskPhase: toolTaskPhase(event.type) }
      : { target: 'conversation' as const }

    return {
      id,
      kind: 'tool_complete',
      label: name || undefined,
      payload,
      scene,
      source: 'hermes'
    }
  }

  if (
    event.type === 'approval.request' ||
    event.type === 'clarify.request' ||
    event.type === 'secret.request' ||
    event.type === 'sudo.request'
  ) {
    return {
      id,
      kind: 'awaiting_permission',
      label: event.type,
      payload,
      scene: { resourceKind: 'control', target: 'permission' },
      source: 'hermes'
    }
  }

  if (event.type === 'status.update' && text(payload.kind) === 'compacting') {
    return {
      id,
      kind: 'reading',
      label: 'compacting',
      payload,
      scene: { resourceKind: 'document', target: 'document' },
      source: 'hermes'
    }
  }

  if (event.type === 'session.info' && payload.running === false) {
    return { id, kind: 'agent_idle', label: event.type, payload, scene: { target: 'rest' }, source: 'hermes' }
  }

  if (event.type === 'error') {
    return { id, kind: 'agent_error', label: event.type, payload, scene: { target: 'error' }, source: 'hermes' }
  }

  return null
}
