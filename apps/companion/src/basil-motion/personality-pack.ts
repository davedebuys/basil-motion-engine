import type { BasilState } from './types'

export type BasilPersonalityId =
  | 'window-peekaboo'
  | 'folder-fort'
  | 'caught-hiding'
  | 'cursor-chase'
  | 'scroll-elevator'
  | 'tab-surfing'
  | 'window-surfing'
  | 'typing-mimic'
  | 'copy-paste-courier'
  | 'drag-assistant'
  | 'download-watch'
  | 'loading-hypnosis'
  | 'thinking-detective'
  | 'error-first-aid'
  | 'permission-guardian'
  | 'success-high-five'
  | 'welcome-back-ambush'
  | 'focus-companion'
  | 'desktop-tidy-up'
  | 'bedtime-negotiation'

export type BasilPersonalityMotif =
  | 'ambush'
  | 'bandage'
  | 'bedtime'
  | 'chase'
  | 'courier'
  | 'detective'
  | 'download'
  | 'drag'
  | 'elevator'
  | 'folder'
  | 'fort'
  | 'guardian'
  | 'high-five'
  | 'hypnosis'
  | 'peek'
  | 'surf'
  | 'tabs'
  | 'tea'
  | 'tidy'
  | 'typing'

export type BasilPersonalitySignalKind =
  | 'actor_discovered'
  | 'copy'
  | 'drag'
  | 'error'
  | 'focus_session'
  | 'folder_active'
  | 'late_activity'
  | 'loading'
  | 'paste'
  | 'permission'
  | 'pointer_chase'
  | 'research'
  | 'scroll'
  | 'success'
  | 'surface_move'
  | 'tab_change'
  | 'typing'
  | 'user_return'
  | 'window_edge'
  | 'workspace_busy'

export interface BasilPersonalityDefinition {
  allowedStates: readonly BasilState[]
  durationMs: number
  id: BasilPersonalityId
  label: string
  motif: BasilPersonalityMotif
  priority: number
  signal: BasilPersonalitySignalKind
}

const WORK_STATES: readonly BasilState[] = ['idle', 'thinking', 'searching', 'reading', 'writing', 'using_tool']
const SOCIAL_STATES: readonly BasilState[] = ['idle', 'listening', 'success']

export const BASIL_PERSONALITY_BEHAVIORS: readonly BasilPersonalityDefinition[] = [
  {
    allowedStates: WORK_STATES,
    durationMs: 4300,
    id: 'window-peekaboo',
    label: 'Window Peekaboo',
    motif: 'peek',
    priority: 4,
    signal: 'window_edge'
  },
  {
    allowedStates: WORK_STATES,
    durationMs: 4800,
    id: 'folder-fort',
    label: 'Folder Fort',
    motif: 'fort',
    priority: 4,
    signal: 'folder_active'
  },
  {
    allowedStates: SOCIAL_STATES,
    durationMs: 2500,
    id: 'caught-hiding',
    label: 'Caught Hiding',
    motif: 'folder',
    priority: 7,
    signal: 'actor_discovered'
  },
  {
    allowedStates: SOCIAL_STATES,
    durationMs: 3300,
    id: 'cursor-chase',
    label: 'Cursor Chase',
    motif: 'chase',
    priority: 2,
    signal: 'pointer_chase'
  },
  {
    allowedStates: WORK_STATES,
    durationMs: 3600,
    id: 'scroll-elevator',
    label: 'Scroll Elevator',
    motif: 'elevator',
    priority: 5,
    signal: 'scroll'
  },
  {
    allowedStates: WORK_STATES,
    durationMs: 3900,
    id: 'tab-surfing',
    label: 'Tab Surfing',
    motif: 'tabs',
    priority: 4,
    signal: 'tab_change'
  },
  {
    allowedStates: WORK_STATES,
    durationMs: 3700,
    id: 'window-surfing',
    label: 'Window Surfing',
    motif: 'surf',
    priority: 5,
    signal: 'surface_move'
  },
  {
    allowedStates: ['idle', 'thinking', 'writing'],
    durationMs: 4200,
    id: 'typing-mimic',
    label: 'Typing Mimic',
    motif: 'typing',
    priority: 3,
    signal: 'typing'
  },
  {
    allowedStates: WORK_STATES,
    durationMs: 4100,
    id: 'copy-paste-courier',
    label: 'Copy & Paste Courier',
    motif: 'courier',
    priority: 6,
    signal: 'copy'
  },
  {
    allowedStates: ['idle', 'thinking', 'reading', 'writing', 'using_tool'],
    durationMs: 3600,
    id: 'drag-assistant',
    label: 'Drag Assistant',
    motif: 'drag',
    priority: 7,
    signal: 'drag'
  },
  {
    allowedStates: ['thinking', 'searching', 'reading', 'using_tool'],
    durationMs: 5200,
    id: 'download-watch',
    label: 'Download Watch',
    motif: 'download',
    priority: 4,
    signal: 'loading'
  },
  {
    allowedStates: ['thinking', 'searching', 'reading', 'using_tool'],
    durationMs: 3900,
    id: 'loading-hypnosis',
    label: 'Loading Hypnosis',
    motif: 'hypnosis',
    priority: 3,
    signal: 'loading'
  },
  {
    allowedStates: ['thinking', 'searching', 'reading'],
    durationMs: 4500,
    id: 'thinking-detective',
    label: 'Thinking Detective',
    motif: 'detective',
    priority: 4,
    signal: 'research'
  },
  {
    allowedStates: ['error'],
    durationMs: 4300,
    id: 'error-first-aid',
    label: 'Error First Aid',
    motif: 'bandage',
    priority: 10,
    signal: 'error'
  },
  {
    allowedStates: ['awaiting_permission'],
    durationMs: 5200,
    id: 'permission-guardian',
    label: 'Permission Guardian',
    motif: 'guardian',
    priority: 10,
    signal: 'permission'
  },
  {
    allowedStates: ['success'],
    durationMs: 4200,
    id: 'success-high-five',
    label: 'Success High Five',
    motif: 'high-five',
    priority: 9,
    signal: 'success'
  },
  {
    allowedStates: SOCIAL_STATES,
    durationMs: 3300,
    id: 'welcome-back-ambush',
    label: 'Welcome-back Ambush',
    motif: 'ambush',
    priority: 8,
    signal: 'user_return'
  },
  {
    allowedStates: WORK_STATES,
    durationMs: 5600,
    id: 'focus-companion',
    label: 'Focus Companion',
    motif: 'tea',
    priority: 2,
    signal: 'focus_session'
  },
  {
    allowedStates: WORK_STATES,
    durationMs: 5000,
    id: 'desktop-tidy-up',
    label: 'Desktop Tidy-up',
    motif: 'tidy',
    priority: 2,
    signal: 'workspace_busy'
  },
  {
    allowedStates: ['idle', 'thinking', 'reading', 'writing', 'using_tool'],
    durationMs: 6000,
    id: 'bedtime-negotiation',
    label: 'Bedtime Negotiation',
    motif: 'bedtime',
    priority: 3,
    signal: 'late_activity'
  }
]

export const BASIL_PERSONALITY_BY_ID = new Map(
  BASIL_PERSONALITY_BEHAVIORS.map(behavior => [behavior.id, behavior] as const)
)

export const BASIL_PERSONALITY_BY_SIGNAL = new Map<BasilPersonalitySignalKind, BasilPersonalityDefinition[]>()

for (const behavior of BASIL_PERSONALITY_BEHAVIORS) {
  const existing = BASIL_PERSONALITY_BY_SIGNAL.get(behavior.signal) ?? []

  BASIL_PERSONALITY_BY_SIGNAL.set(behavior.signal, [...existing, behavior])
}
