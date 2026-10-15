import { BASIL_INTERACTIONS, type BasilInteractionCategory } from './interaction-pack'
import type { BasilSceneTarget, BasilTaskPhase, GenericAgentEvent } from './types'

const IDS_BY_CATEGORY = BASIL_INTERACTIONS.reduce<Record<BasilInteractionCategory, string[]>>(
  (categories, interaction) => {
    categories[interaction.category].push(interaction.id)

    return categories
  },
  {
    focus: [],
    listening: [],
    permission: [],
    reading: [],
    rest: [],
    results: [],
    search: [],
    social: [],
    tools: [],
    writing: []
  }
)

const STRUCTURAL_PAYLOAD_KEYS = ['action', 'kind', 'name', 'operation', 'status', 'tool', 'tool_name', 'type'] as const
const READ_HINTS = ['cat', 'fetch', 'get', 'grep', 'inspect', 'list', 'open', 'read', 'rg', 'view']
const SEARCH_HINTS = ['browser', 'crawl', 'extract', 'find', 'scrape', 'search', 'web']
const WRITE_HINTS = ['apply', 'create', 'delete', 'edit', 'move', 'patch', 'rename', 'save', 'update', 'write']

function structuralText(event: GenericAgentEvent): string {
  const values = [event.label ?? '']

  for (const key of STRUCTURAL_PAYLOAD_KEYS) {
    const value = event.payload?.[key]

    if (typeof value === 'string') {
      values.push(value)
    }
  }

  return values.join(' ').toLowerCase().replaceAll(/[^a-z0-9]+/g, ' ').trim()
}

function has(text: string, ...hints: string[]): boolean {
  return hints.some(hint => text.includes(hint))
}

function stableHash(value: string): number {
  let hash = 0x811c9dc5

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }

  return hash >>> 0
}

function stablePick(event: GenericAgentEvent, category: BasilInteractionCategory, fallback: string): string {
  return stablePickFrom(event, IDS_BY_CATEGORY[category], fallback)
}

function stablePickFrom(event: GenericAgentEvent, candidates: readonly string[], fallback: string): string {
  if (!event.id) {
    return fallback
  }

  const seed = [event.id, event.kind, event.label ?? '', event.scene?.target ?? '', event.scene?.taskPhase ?? ''].join('|')

  return candidates[stableHash(seed) % candidates.length] ?? fallback
}

function searchInteraction(
  event: GenericAgentEvent,
  text: string,
  target: BasilSceneTarget | undefined,
  phase: BasilTaskPhase | undefined
): string {
  if (target === 'image') {
    return 'image-hunt'
  }

  if (target === 'data') {
    return 'data-hunt'
  }

  if (target === 'folder') {
    return 'file-hunt'
  }

  if (has(text, 'cross reference', 'crossreference', 'compare source')) {
    return 'cross-reference'
  }

  if (has(text, 'route', 'map', 'location')) {
    return 'map-route'
  }

  if (has(text, 'verify', 'source', 'fact check')) {
    return 'source-check'
  }

  if (phase === 'prepare') {
    return 'web-scout'
  }

  if (phase === 'execute') {
    return 'link-hop'
  }

  if (phase === 'inspect' || has(text, 'crawl', 'scrape', 'scan', 'extract')) {
    return 'scan-results'
  }

  if (has(text, 'link', 'url')) {
    return 'link-hop'
  }

  return stablePickFrom(event, IDS_BY_CATEGORY.search.slice(0, 9), 'web-scout')
}

function readingInteraction(
  event: GenericAgentEvent,
  text: string,
  target: BasilSceneTarget | undefined,
  phase: BasilTaskPhase | undefined
): string {
  if (target === 'image') {
    return 'image-inspect'
  }

  if (target === 'data') {
    return 'chart-read'
  }

  if (target === 'editor' || has(text, 'code review', 'diff')) {
    return 'code-review'
  }

  if (has(text, 'memory', 'compact')) {
    return 'memory-search'
  }

  if (phase === 'prepare' || has(text, 'open')) {
    return 'document-open'
  }

  if (phase === 'inspect' || has(text, 'footnote', 'reference')) {
    return 'footnote-peek'
  }

  if (has(text, 'grep', 'rg', 'line', 'find')) {
    return 'line-follow'
  }

  if (has(text, 'skim', 'list')) {
    return 'skim-fast'
  }

  if (has(text, 'careful', 'inspect')) {
    return 'careful-read'
  }

  return stablePickFrom(event, IDS_BY_CATEGORY.reading.slice(0, 9), 'page-scan')
}

function writingInteraction(
  event: GenericAgentEvent,
  text: string,
  target: BasilSceneTarget | undefined,
  phase: BasilTaskPhase | undefined
): string {
  if (phase === 'prepare') {
    return 'pencil-ready'
  }

  if (phase === 'inspect') {
    return target === 'editor' ? 'careful-edit' : 'final-polish'
  }

  if (has(text, 'rename', 'move')) {
    return 'rename-file'
  }

  if (has(text, 'save')) {
    return 'save-document'
  }

  if (has(text, 'organize', 'note')) {
    return 'organize-notes'
  }

  if (has(text, 'patch', 'apply', 'fix', 'edit')) {
    return 'fix-patch'
  }

  if (has(text, 'compose', 'reply', 'message') || target === 'composer') {
    return 'compose-reply'
  }

  if (target === 'editor' || has(text, 'code')) {
    return 'code-scribe'
  }

  if (has(text, 'rapid', 'type', 'write')) {
    return 'rapid-type'
  }

  return stablePick(event, 'writing', 'compose-reply')
}

function toolInteraction(
  event: GenericAgentEvent,
  text: string,
  target: BasilSceneTarget | undefined,
  phase: BasilTaskPhase | undefined
): string {
  if (target === 'terminal') {
    return has(text, 'install', 'package', 'dependency') ? 'install-package' : 'terminal-command'
  }

  if (target === 'folder') {
    return phase === 'prepare' || has(text, ...READ_HINTS) ? 'folder-open' : 'file-carry'
  }

  if (target === 'web') {
    return 'browser-navigate'
  }

  if (target === 'data') {
    return 'data-crunch'
  }

  if (target === 'image') {
    return 'image-process'
  }

  if (target === 'editor') {
    return writingInteraction(event, text, target, phase)
  }

  if (has(text, 'setting', 'config', 'preference', 'adjust')) {
    return 'settings-adjust'
  }

  return stablePickFrom(event, IDS_BY_CATEGORY.tools.slice(0, 9), 'tool-belt')
}

function completionInteraction(event: GenericAgentEvent, text: string, target: BasilSceneTarget | undefined): string {
  if (target === 'web' || has(text, ...SEARCH_HINTS)) {
    return 'found-a-lead'
  }

  if (target === 'document' || has(text, ...READ_HINTS)) {
    return 'reading-complete'
  }

  if (target === 'editor' || has(text, ...WRITE_HINTS)) {
    return has(text, 'save') ? 'save-document' : 'final-polish'
  }

  if (target === 'folder') {
    return 'saved-safely'
  }

  if (target === 'permission') {
    return 'permission-granted'
  }

  return 'tool-complete'
}

function permissionInteraction(event: GenericAgentEvent, text: string): string {
  if (has(text, 'secret', 'credential', 'token', 'key')) {
    return 'key-request'
  }

  if (has(text, 'sudo', 'admin', 'risk', 'danger')) {
    return 'risk-warning'
  }

  if (has(text, 'clarify', 'review', 'question')) {
    return 'review-needed'
  }

  if (has(text, 'privacy', 'personal', 'sensitive')) {
    return 'privacy-guard'
  }

  if (has(text, 'confirm', 'approval')) {
    return 'confirm-action'
  }

  return stablePickFrom(event, IDS_BY_CATEGORY.permission.slice(0, 9), 'permission-please')
}

export function interactionForGenericAgentEvent(event: GenericAgentEvent): string {
  const text = structuralText(event)
  const target = event.scene?.target
  const phase = event.scene?.taskPhase

  if (event.kind === 'agent_idle') {
    return stablePick(event, 'social', 'hello-basil')
  }

  if (event.kind === 'listening') {
    return stablePickFrom(event, IDS_BY_CATEGORY.listening.slice(0, 9), 'all-ears')
  }

  if (event.kind === 'thinking' || event.kind === 'assistant_start') {
    if (has(text, 'memory', 'recall')) {
      return 'memory-search'
    }

    if (has(text, 'plan')) {
      return 'plan-ready'
    }

    if (has(text, 'idea', 'brainstorm')) {
      return 'brainstorm'
    }

    return stablePick(event, 'focus', 'deep-thought')
  }

  if (event.kind === 'searching') {
    return searchInteraction(event, text, target, phase)
  }

  if (event.kind === 'reading') {
    return readingInteraction(event, text, target, phase)
  }

  if (event.kind === 'writing') {
    return writingInteraction(event, text, target, phase)
  }

  if (event.kind === 'tool_start') {
    return toolInteraction(event, text, target, phase)
  }

  if (event.kind === 'tool_complete') {
    return completionInteraction(event, text, target)
  }

  if (event.kind === 'awaiting_permission') {
    return permissionInteraction(event, text)
  }

  if (event.kind === 'assistant_success') {
    if (has(text, 'listening', 'voice')) {
      return 'listening-done'
    }

    if (target === 'folder') {
      return 'saved-safely'
    }

    if (target === 'document') {
      return 'neat-finish'
    }

    if (target === 'permission') {
      return 'permission-granted'
    }

    return stablePick(event, 'results', 'mission-complete')
  }

  if (event.kind === 'agent_error') {
    return has(text, 'retry', 'recover')
      ? 'retry-ready'
      : stablePickFrom(event, ['gentle-oops', 'error-detected'], 'gentle-oops')
  }

  if (event.kind === 'assistant_delta') {
    if (target === 'document') {
      return 'read-aloud'
    }

    if (has(text, 'explain', 'step')) {
      return 'explain-step'
    }

    return stablePickFrom(
      event,
      ['speaking-softly', 'storyteller', 'explain-step', 'read-aloud', 'thinking-aloud'],
      'speaking-softly'
    )
  }

  if (event.kind === 'agent_sleep') {
    return stablePickFrom(event, ['sleepy-float', 'good-night'], 'good-night')
  }

  return 'hello-basil'
}
