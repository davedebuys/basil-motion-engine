import { clampParameter, normalizedParameter } from './engine'
import type {
  BasilInteractionAccessory,
  BasilParameters,
  BasilSceneTarget,
  BasilState
} from './types'

export type BasilInteractionCategory =
  | 'focus'
  | 'listening'
  | 'permission'
  | 'reading'
  | 'rest'
  | 'results'
  | 'search'
  | 'social'
  | 'tools'
  | 'writing'

export type BasilInteractionTone = 'bright' | 'concerned' | 'curious' | 'focused' | 'gentle' | 'sleepy'

export type BasilMotionMotif =
  | 'breathe'
  | 'celebrate'
  | 'curl'
  | 'double-hop'
  | 'float'
  | 'hop'
  | 'lean'
  | 'listen'
  | 'nod'
  | 'orbit'
  | 'peek'
  | 'polish'
  | 'ponder'
  | 'present'
  | 'scan'
  | 'shake'
  | 'shiver'
  | 'snooze'
  | 'spin'
  | 'stretch'
  | 'sway'
  | 'tap'
  | 'tiptoe'
  | 'type'
  | 'wiggle'

export interface BasilInteractionDefinition {
  accessory: BasilInteractionAccessory
  amplitude: number
  category: BasilInteractionCategory
  durationMs: number
  id: string
  label: string
  loop: boolean
  mirror: -1 | 1
  motif: BasilMotionMotif
  scene: BasilSceneTarget
  state: BasilState
  tone: BasilInteractionTone
}

export interface BasilInteractionSample {
  accessory: BasilInteractionAccessory
  beat: number
  parameters: Partial<BasilParameters>
  progress: number
  rotation: number
  scaleX: number
  scaleY: number
  side: -1 | 1
  x: number
  y: number
}

type InteractionRow = readonly [
  id: string,
  label: string,
  category: BasilInteractionCategory,
  state: BasilState,
  scene: BasilSceneTarget,
  motif: BasilMotionMotif,
  accessory: BasilInteractionAccessory,
  tone: BasilInteractionTone,
  tempo?: number,
  amplitude?: number,
  mirror?: -1 | 1,
  loop?: boolean
]

const ROWS: readonly InteractionRow[] = [
  ['hello-basil', 'Hello, Basil', 'social', 'idle', 'conversation', 'present', 'wave', 'bright', 1.08, 0.9, 1, false],
  ['gentle-wave', 'Gentle Wave', 'social', 'idle', 'conversation', 'sway', 'wave', 'gentle', 0.92, 0.72, -1],
  ['curious-peek', 'Curious Peek', 'social', 'idle', 'conversation', 'peek', 'question', 'curious', 1.05, 0.82, 1],
  ['shy-blush', 'Shy Blush', 'social', 'idle', 'conversation', 'curl', 'heart', 'gentle', 0.84, 0.68, -1, false],
  ['friendly-nod', 'Friendly Nod', 'social', 'idle', 'conversation', 'nod', 'antenna', 'bright', 1.12, 0.75, 1],
  [
    'happy-bounce',
    'Happy Bounce',
    'social',
    'success',
    'conversation',
    'double-hop',
    'spark',
    'bright',
    1.18,
    0.88,
    -1,
    false
  ],
  ['welcome-back', 'Welcome Back', 'social', 'idle', 'conversation', 'hop', 'wave', 'bright', 1.02, 0.82, 1, false],
  ['hover-hello', 'Hover Hello', 'social', 'idle', 'conversation', 'tiptoe', 'antenna', 'curious', 1.16, 0.68, -1],
  [
    'tiny-high-five',
    'Tiny High Five',
    'social',
    'success',
    'conversation',
    'tap',
    'wave',
    'bright',
    1.24,
    0.92,
    1,
    false
  ],
  [
    'heart-pop',
    'Heart Pop',
    'social',
    'success',
    'conversation',
    'celebrate',
    'heart',
    'bright',
    1.08,
    0.82,
    -1,
    false
  ],

  ['all-ears', 'All Ears', 'listening', 'listening', 'conversation', 'listen', 'ear', 'curious', 0.94, 0.86, 1],
  [
    'voice-wake',
    'Voice Wake',
    'listening',
    'listening',
    'conversation',
    'stretch',
    'ear',
    'bright',
    1.02,
    0.78,
    -1,
    false
  ],
  [
    'patient-listen',
    'Patient Listen',
    'listening',
    'listening',
    'conversation',
    'breathe',
    'ear',
    'gentle',
    0.72,
    0.58,
    1
  ],
  [
    'excited-listen',
    'Excited Listen',
    'listening',
    'listening',
    'conversation',
    'wiggle',
    'ear',
    'bright',
    1.28,
    0.86,
    -1
  ],
  [
    'whisper-listen',
    'Whisper Listen',
    'listening',
    'listening',
    'conversation',
    'lean',
    'ear',
    'gentle',
    0.88,
    0.62,
    1
  ],
  ['long-story', 'Long Story', 'listening', 'listening', 'conversation', 'sway', 'speech', 'curious', 0.78, 0.68, -1],
  [
    'question-ready',
    'Question Ready',
    'listening',
    'listening',
    'conversation',
    'peek',
    'question',
    'curious',
    1.06,
    0.74,
    1
  ],
  ['follow-along', 'Follow Along', 'listening', 'listening', 'conversation', 'nod', 'speech', 'focused', 1.1, 0.72, -1],
  ['sound-search', 'Sound Search', 'listening', 'listening', 'conversation', 'scan', 'ear', 'focused', 0.96, 0.76, 1],
  [
    'listening-done',
    'Listening Done',
    'listening',
    'success',
    'conversation',
    'present',
    'check',
    'bright',
    1.14,
    0.8,
    -1,
    false
  ],

  ['deep-thought', 'Deep Thought', 'focus', 'thinking', 'conversation', 'ponder', 'question', 'focused', 0.78, 0.74, 1],
  ['idea-spark', 'Idea Spark', 'focus', 'thinking', 'conversation', 'hop', 'idea', 'bright', 1.18, 0.84, -1, false],
  ['puzzling', 'Puzzling', 'focus', 'thinking', 'conversation', 'sway', 'question', 'concerned', 0.9, 0.68, 1],
  ['compare-options', 'Compare Options', 'focus', 'thinking', 'data', 'scan', 'chart', 'focused', 1.02, 0.72, -1],
  ['memory-search', 'Memory Search', 'focus', 'thinking', 'document', 'orbit', 'book', 'curious', 0.82, 0.7, 1],
  ['focus-lock', 'Focus Lock', 'focus', 'thinking', 'data', 'stretch', 'glasses', 'focused', 0.96, 0.62, -1],
  ['almost-got-it', 'Almost Got It', 'focus', 'thinking', 'conversation', 'tiptoe', 'idea', 'curious', 1.08, 0.78, 1],
  ['mental-math', 'Mental Math', 'focus', 'thinking', 'data', 'tap', 'chart', 'focused', 1.22, 0.78, -1],
  ['brainstorm', 'Brainstorm', 'focus', 'thinking', 'conversation', 'wiggle', 'idea', 'bright', 1.08, 0.82, 1],
  ['plan-ready', 'Plan Ready', 'focus', 'thinking', 'document', 'present', 'check', 'bright', 1.04, 0.76, -1, false],

  ['web-scout', 'Web Scout', 'search', 'searching', 'web', 'scan', 'magnifier', 'focused', 1.06, 0.84, 1],
  ['link-hop', 'Link Hop', 'search', 'searching', 'web', 'double-hop', 'link', 'bright', 1.2, 0.86, -1],
  ['scan-results', 'Scan Results', 'search', 'searching', 'web', 'orbit', 'magnifier', 'focused', 0.92, 0.8, 1],
  ['map-route', 'Map Route', 'search', 'searching', 'web', 'sway', 'compass', 'curious', 0.88, 0.76, -1],
  ['source-check', 'Source Check', 'search', 'searching', 'web', 'nod', 'check', 'focused', 1.12, 0.72, 1],
  ['image-hunt', 'Image Hunt', 'search', 'searching', 'image', 'peek', 'magnifier', 'curious', 1.04, 0.82, -1],
  ['data-hunt', 'Data Hunt', 'search', 'searching', 'data', 'tap', 'chart', 'focused', 1.14, 0.8, 1],
  ['file-hunt', 'File Hunt', 'search', 'searching', 'folder', 'tiptoe', 'folder', 'curious', 1.08, 0.78, -1],
  ['cross-reference', 'Cross Reference', 'search', 'searching', 'document', 'shake', 'link', 'focused', 1.0, 0.72, 1],
  ['found-a-lead', 'Found a Lead', 'search', 'success', 'web', 'celebrate', 'spark', 'bright', 1.16, 0.9, -1, false],

  ['page-scan', 'Page Scan', 'reading', 'reading', 'document', 'scan', 'book', 'focused', 0.9, 0.7, 1],
  ['skim-fast', 'Skim Fast', 'reading', 'reading', 'document', 'type', 'book', 'curious', 1.22, 0.76, -1],
  ['careful-read', 'Careful Read', 'reading', 'reading', 'document', 'breathe', 'glasses', 'focused', 0.68, 0.58, 1],
  [
    'document-open',
    'Document Open',
    'reading',
    'reading',
    'document',
    'present',
    'book',
    'bright',
    0.96,
    0.72,
    -1,
    false
  ],
  ['line-follow', 'Line Follow', 'reading', 'reading', 'document', 'sway', 'glasses', 'focused', 0.96, 0.62, 1],
  ['footnote-peek', 'Footnote Peek', 'reading', 'reading', 'document', 'peek', 'question', 'curious', 1.02, 0.64, -1],
  ['image-inspect', 'Image Inspect', 'reading', 'reading', 'image', 'lean', 'magnifier', 'curious', 0.94, 0.72, 1],
  ['chart-read', 'Chart Read', 'reading', 'reading', 'data', 'tap', 'chart', 'focused', 1.06, 0.7, -1],
  ['code-review', 'Code Review', 'reading', 'reading', 'editor', 'polish', 'code', 'focused', 1.0, 0.7, 1],
  [
    'reading-complete',
    'Reading Complete',
    'reading',
    'success',
    'document',
    'nod',
    'check',
    'bright',
    1.08,
    0.76,
    -1,
    false
  ],

  [
    'pencil-ready',
    'Pencil Ready',
    'writing',
    'writing',
    'composer',
    'present',
    'pencil',
    'bright',
    1.0,
    0.76,
    1,
    false
  ],
  ['compose-reply', 'Compose Reply', 'writing', 'writing', 'composer', 'type', 'pencil', 'focused', 1.08, 0.78, -1],
  ['rapid-type', 'Rapid Type', 'writing', 'writing', 'editor', 'type', 'keyboard', 'bright', 1.34, 0.88, 1],
  ['careful-edit', 'Careful Edit', 'writing', 'writing', 'document', 'polish', 'pencil', 'focused', 0.82, 0.64, -1],
  ['code-scribe', 'Code Scribe', 'writing', 'writing', 'editor', 'type', 'code', 'focused', 1.18, 0.82, 1],
  ['fix-patch', 'Fix Patch', 'writing', 'writing', 'editor', 'tap', 'code', 'focused', 1.1, 0.8, -1],
  ['rename-file', 'Rename File', 'writing', 'writing', 'folder', 'wiggle', 'folder', 'curious', 1.04, 0.7, 1],
  ['save-document', 'Save Document', 'writing', 'writing', 'document', 'nod', 'check', 'gentle', 0.96, 0.7, -1, false],
  ['organize-notes', 'Organize Notes', 'writing', 'writing', 'document', 'sway', 'book', 'focused', 0.92, 0.68, 1],
  [
    'final-polish',
    'Final Polish',
    'writing',
    'writing',
    'document',
    'polish',
    'spark',
    'bright',
    1.04,
    0.76,
    -1,
    false
  ],

  ['tool-belt', 'Tool Belt', 'tools', 'using_tool', 'tool', 'present', 'spark', 'bright', 1.02, 0.82, 1],
  [
    'terminal-command',
    'Terminal Command',
    'tools',
    'using_tool',
    'terminal',
    'type',
    'terminal',
    'focused',
    1.2,
    0.86,
    -1
  ],
  ['folder-open', 'Folder Open', 'tools', 'using_tool', 'folder', 'stretch', 'folder', 'curious', 1.06, 0.78, 1],
  ['file-carry', 'File Carry', 'tools', 'using_tool', 'folder', 'lean', 'folder', 'focused', 0.96, 0.82, -1],
  ['browser-navigate', 'Browser Navigate', 'tools', 'using_tool', 'web', 'orbit', 'compass', 'focused', 1.0, 0.82, 1],
  ['data-crunch', 'Data Crunch', 'tools', 'using_tool', 'data', 'shake', 'chart', 'focused', 1.16, 0.86, -1],
  ['image-process', 'Image Process', 'tools', 'using_tool', 'image', 'spin', 'spark', 'bright', 1.06, 0.82, 1],
  ['settings-adjust', 'Settings Adjust', 'tools', 'using_tool', 'tool', 'tap', 'key', 'focused', 1.12, 0.76, -1],
  [
    'install-package',
    'Install Package',
    'tools',
    'using_tool',
    'terminal',
    'double-hop',
    'terminal',
    'curious',
    1.1,
    0.86,
    1
  ],
  ['tool-complete', 'Tool Complete', 'tools', 'success', 'tool', 'celebrate', 'check', 'bright', 1.18, 0.9, -1, false],

  [
    'permission-please',
    'Permission Please',
    'permission',
    'awaiting_permission',
    'permission',
    'curl',
    'shield',
    'gentle',
    0.78,
    0.62,
    1
  ],
  [
    'shield-wait',
    'Shield Wait',
    'permission',
    'awaiting_permission',
    'permission',
    'breathe',
    'shield',
    'focused',
    0.68,
    0.56,
    -1
  ],
  [
    'key-request',
    'Key Request',
    'permission',
    'awaiting_permission',
    'permission',
    'present',
    'key',
    'curious',
    0.9,
    0.68,
    1
  ],
  [
    'cautious-peek',
    'Cautious Peek',
    'permission',
    'awaiting_permission',
    'permission',
    'peek',
    'shield',
    'concerned',
    0.92,
    0.64,
    -1
  ],
  [
    'confirm-action',
    'Confirm Action',
    'permission',
    'awaiting_permission',
    'permission',
    'nod',
    'question',
    'curious',
    0.94,
    0.66,
    1
  ],
  [
    'review-needed',
    'Review Needed',
    'permission',
    'awaiting_permission',
    'document',
    'scan',
    'warning',
    'focused',
    0.84,
    0.62,
    -1
  ],
  [
    'privacy-guard',
    'Privacy Guard',
    'permission',
    'awaiting_permission',
    'permission',
    'stretch',
    'shield',
    'focused',
    0.76,
    0.62,
    1
  ],
  [
    'risk-warning',
    'Risk Warning',
    'permission',
    'awaiting_permission',
    'error',
    'shiver',
    'warning',
    'concerned',
    1.0,
    0.72,
    -1
  ],
  [
    'patient-wait',
    'Patient Wait',
    'permission',
    'awaiting_permission',
    'permission',
    'float',
    'question',
    'gentle',
    0.62,
    0.52,
    1
  ],
  [
    'permission-granted',
    'Permission Granted',
    'permission',
    'success',
    'permission',
    'hop',
    'check',
    'bright',
    1.12,
    0.82,
    -1,
    false
  ],

  [
    'tiny-success',
    'Tiny Success',
    'results',
    'success',
    'conversation',
    'hop',
    'check',
    'bright',
    1.08,
    0.78,
    1,
    false
  ],
  [
    'mission-complete',
    'Mission Complete',
    'results',
    'success',
    'conversation',
    'celebrate',
    'confetti',
    'bright',
    1.14,
    0.94,
    -1,
    false
  ],
  ['checkmark-pop', 'Checkmark Pop', 'results', 'success', 'tool', 'present', 'check', 'bright', 1.22, 0.88, 1, false],
  ['proud-bow', 'Proud Bow', 'results', 'success', 'conversation', 'nod', 'spark', 'gentle', 0.9, 0.72, -1, false],
  [
    'confetti-orbit',
    'Confetti Orbit',
    'results',
    'success',
    'conversation',
    'orbit',
    'confetti',
    'bright',
    1.08,
    0.92,
    1,
    false
  ],
  ['happy-spin', 'Happy Spin', 'results', 'success', 'conversation', 'spin', 'spark', 'bright', 1.2, 0.88, -1, false],
  [
    'relieved-sigh',
    'Relieved Sigh',
    'results',
    'success',
    'conversation',
    'breathe',
    'heart',
    'gentle',
    0.68,
    0.58,
    1,
    false
  ],
  ['neat-finish', 'Neat Finish', 'results', 'success', 'document', 'polish', 'check', 'focused', 0.96, 0.7, -1, false],
  ['saved-safely', 'Saved Safely', 'results', 'success', 'folder', 'curl', 'shield', 'gentle', 0.86, 0.68, 1, false],
  [
    'victory-pose',
    'Victory Pose',
    'results',
    'success',
    'conversation',
    'stretch',
    'confetti',
    'bright',
    1.08,
    0.9,
    -1,
    false
  ],

  ['speaking-softly', 'Speaking Softly', 'rest', 'speaking', 'conversation', 'sway', 'speech', 'gentle', 0.82, 0.62, 1],
  ['storyteller', 'Storyteller', 'rest', 'speaking', 'conversation', 'present', 'speech', 'bright', 0.96, 0.72, -1],
  ['explain-step', 'Explain a Step', 'rest', 'speaking', 'document', 'tap', 'speech', 'focused', 1.0, 0.68, 1],
  ['read-aloud', 'Read Aloud', 'rest', 'speaking', 'document', 'sway', 'book', 'gentle', 0.88, 0.64, -1],
  ['thinking-aloud', 'Thinking Aloud', 'rest', 'speaking', 'conversation', 'ponder', 'idea', 'curious', 0.92, 0.66, 1],
  ['gentle-oops', 'Gentle Oops', 'rest', 'error', 'error', 'shake', 'question', 'concerned', 0.92, 0.64, -1, false],
  ['error-detected', 'Error Detected', 'rest', 'error', 'error', 'shiver', 'warning', 'concerned', 1.08, 0.76, 1],
  ['retry-ready', 'Retry Ready', 'rest', 'thinking', 'error', 'stretch', 'spark', 'curious', 1.0, 0.72, -1, false],
  ['sleepy-float', 'Sleepy Float', 'rest', 'sleeping', 'rest', 'float', 'moon', 'sleepy', 0.5, 0.52, 1],
  ['good-night', 'Good Night', 'rest', 'sleeping', 'rest', 'snooze', 'moon', 'sleepy', 0.42, 0.58, -1]
]

function fromRow(row: InteractionRow): BasilInteractionDefinition {
  const [id, label, category, state, scene, motif, accessory, tone, tempo = 1, amplitude = 1, mirror = 1, loop = true] =
    row

  return {
    accessory,
    amplitude,
    category,
    durationMs: Math.round(2600 / tempo),
    id,
    label,
    loop,
    mirror,
    motif,
    scene,
    state,
    tone
  }
}

export const BASIL_INTERACTIONS: readonly BasilInteractionDefinition[] = ROWS.map(fromRow)
export const BASIL_INTERACTION_BY_ID = new Map(BASIL_INTERACTIONS.map(interaction => [interaction.id, interaction]))

const TAU = Math.PI * 2

function normalizedProgress(definition: BasilInteractionDefinition, elapsedMs: number): number {
  const raw = Math.max(0, elapsedMs) / definition.durationMs

  return definition.loop ? raw % 1 : Math.min(1, raw)
}

function toneParameters(tone: BasilInteractionTone, progress: number): Partial<BasilParameters> {
  const pulse = Math.sin(progress * TAU)

  if (tone === 'bright') {
    return { energy: 0.74 + pulse * 0.08, glow: 0.28 + Math.max(0, pulse) * 0.18, mouth: 0.56 }
  }

  if (tone === 'curious') {
    return { energy: 0.58 + pulse * 0.06, eyeX: 0.22, eyeY: -0.12, glow: 0.16, mouth: 0.16 }
  }

  if (tone === 'focused') {
    return { energy: 0.68 + pulse * 0.04, eyeY: 0.08, glow: 0.2, mouth: 0.04 }
  }

  if (tone === 'concerned') {
    return { energy: 0.36 + pulse * 0.04, eyeY: 0.12, glow: 0.08, mouth: -0.38 }
  }

  if (tone === 'sleepy') {
    return { blink: 1, energy: 0.08, eyeY: 0.2, glow: 0, mouth: 0.04 }
  }

  return { energy: 0.42 + pulse * 0.04, glow: 0.1, mouth: 0.24 }
}

function motifTransform(motif: BasilMotionMotif, progress: number, amplitude: number, mirror: -1 | 1) {
  const wave = Math.sin(progress * TAU)
  const beat = Math.sin(progress * TAU * 2)
  const hop = Math.max(0, Math.sin(progress * Math.PI))
  const doubleHop = Math.max(0, Math.sin(progress * Math.PI * 2))
  const snap = Math.sin(progress * TAU * 3)
  let x = 0
  let y = 0
  let rotation = 0
  let scaleX = 1
  let scaleY = 1

  switch (motif) {
    case 'breathe':
      scaleX += wave * 0.018
      scaleY += wave * 0.025
      y -= wave * 1.2

      break

    case 'celebrate':
      y -= doubleHop * 8
      rotation = beat * 7
      scaleX += doubleHop * 0.08
      scaleY -= doubleHop * 0.06

      break

    case 'curl':
      y += hop * 4
      rotation = mirror * -hop * 7
      scaleX -= hop * 0.06
      scaleY += hop * 0.04

      break

    case 'double-hop':
      y -= doubleHop * 9
      rotation = mirror * beat * 5

      break

    case 'float':
      y = wave * 4
      rotation = mirror * wave * 2

      break

    case 'hop':
      y -= hop * 10
      scaleX += hop * 0.08
      scaleY -= hop * 0.07

      break

    case 'lean':
      x = mirror * (2 + hop * 4)
      rotation = mirror * (4 + hop * 5)

      break

    case 'listen':
      x = mirror * wave * 1.5
      rotation = mirror * (2 + wave * 3)
      scaleY += Math.max(0, beat) * 0.025

      break

    case 'nod':
      y = Math.max(0, beat) * 3
      rotation = mirror * beat * 2
      scaleY -= Math.max(0, beat) * 0.035

      break

    case 'orbit':
      x = Math.cos(progress * TAU) * 4 * mirror
      y = Math.sin(progress * TAU) * 3
      rotation = wave * 4 * mirror

      break

    case 'peek':
      x = mirror * (4 + wave * 4)
      rotation = mirror * (5 + wave * 4)

      break

    case 'polish':
      x = mirror * snap * 2.2
      rotation = mirror * snap * 2.5

      break

    case 'ponder':
      x = mirror * wave * 2
      y = Math.cos(progress * TAU) * 1.5
      rotation = mirror * (3 + wave * 3)

      break

    case 'present':
      y -= hop * 4
      rotation = mirror * -hop * 3
      scaleX += hop * 0.035

      break

    case 'scan':
      x = mirror * wave * 4
      rotation = mirror * wave * 3

      break

    case 'shake':
      x = snap * 3.2
      rotation = snap * 3.5

      break

    case 'shiver':
      x = snap * 1.8
      rotation = snap * 2.2
      scaleY += Math.abs(snap) * 0.025

      break

    case 'snooze':
      y = wave * 2
      rotation = mirror * (-5 + wave * 1.5)
      scaleY += wave * 0.02

      break

    case 'spin':
      rotation = mirror * progress * 24
      y -= doubleHop * 5

      break

    case 'stretch':
      y -= hop * 4
      scaleX -= hop * 0.055
      scaleY += hop * 0.1

      break

    case 'sway':
      x = mirror * wave * 3
      rotation = mirror * wave * 5

      break

    case 'tap':
      x = mirror * Math.max(0, snap) * 2.5
      rotation = mirror * Math.max(0, snap) * 4

      break

    case 'tiptoe':
      y -= Math.abs(beat) * 4
      x = mirror * wave * 2
      scaleY += Math.abs(beat) * 0.035

      break

    case 'type':
      y = Math.abs(snap) * 1.4
      rotation = mirror * snap * 1.8
      scaleY -= Math.abs(snap) * 0.025

      break

    case 'wiggle':
      x = mirror * snap * 3
      rotation = mirror * snap * 6

      break
  }

  return {
    rotation: rotation * amplitude,
    scaleX: 1 + (scaleX - 1) * amplitude,
    scaleY: 1 + (scaleY - 1) * amplitude,
    x: x * amplitude,
    y: y * amplitude
  }
}

export function sampleBasilInteraction(
  definition: BasilInteractionDefinition,
  elapsedMs: number
): BasilInteractionSample {
  const progress = normalizedProgress(definition, elapsedMs)
  const transform = motifTransform(definition.motif, progress, definition.amplitude, definition.mirror)
  const tone = toneParameters(definition.tone, progress)
  const beat = Math.min(3, Math.floor(Math.min(0.9999, progress) * 4))

  return {
    accessory: definition.accessory,
    beat,
    parameters: {
      ...tone,
      accessoryVisibility: normalizedParameter(0.78 + Math.sin(progress * Math.PI) * 0.22),
      energy: normalizedParameter(tone.energy ?? 0.5),
      eyeX: clampParameter((tone.eyeX ?? 0) * definition.mirror),
      eyeY: clampParameter(tone.eyeY ?? 0),
      glow: normalizedParameter(tone.glow ?? 0),
      mouth: clampParameter(tone.mouth ?? 0),
      particleIntensity: normalizedParameter(
        definition.tone === 'bright' ? 0.36 + Math.max(0, Math.sin(progress * TAU * 2)) * 0.28 : 0.08
      ),
      rotation: clampParameter(transform.rotation / 16),
      squash: clampParameter((transform.scaleX - transform.scaleY) * 2.8)
    },
    progress,
    side: definition.mirror,
    ...transform
  }
}
