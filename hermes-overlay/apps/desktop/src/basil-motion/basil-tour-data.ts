import { BASIL_INTERACTIONS, type BasilInteractionCategory } from './interaction-pack'

export interface BasilTourChapter {
  audioSrc: string
  capabilities: readonly string[]
  durationSeconds: number
  id: string
  interactionIds: readonly string[]
  narration: string
  title: string
}

interface CategoryChapter {
  capabilities: readonly string[]
  category: BasilInteractionCategory
  durationSeconds: number
  id: string
  narration: string
  title: string
}

const CATEGORY_CHAPTERS: readonly CategoryChapter[] = [
  {
    capabilities: ['greet', 'wave', 'peek', 'blush', 'celebrate'],
    category: 'social',
    durationSeconds: 16.73,
    id: '01-social',
    narration:
      'Meet Basil. This tour uses the real open-source Basil Motion Engine: procedural SVG only, with no video, GIF, Lottie, Rive, or proprietary animation runtime. Watch ten social interactions: greetings, waves, peeks, blushes, nods, bounces, welcome-backs, tiny high fives, and hearts.',
    title: 'Personality'
  },
  {
    capabilities: ['voice wake', 'patient listening', 'questions', 'sound search'],
    category: 'listening',
    durationSeconds: 17.14,
    id: '02-listening',
    narration:
      'Basil listens in ten distinct ways. He wakes to voice, listens patiently or excitedly, follows long stories, prepares for questions, tracks sound, and acknowledges completion. A shell-edge ear, compact expressions, and the state-aware antenna keep conversation readable and cute.',
    title: 'Listening'
  },
  {
    capabilities: ['ponder', 'compare', 'remember', 'calculate', 'plan'],
    category: 'focus',
    durationSeconds: 15.02,
    id: '03-thinking',
    narration:
      'Thinking and planning cover pondering, ideas, puzzles, comparisons, memory search, focus lock, mental maths, brainstorming, and plan preparation. Eyes, brows, mouth, squash, rotation, energy, glow, and particles interpolate smoothly instead of snapping.',
    title: 'Thinking'
  },
  {
    capabilities: ['web', 'links', 'sources', 'images', 'files'],
    category: 'search',
    durationSeconds: 15.98,
    id: '04-search',
    narration:
      'For research, Basil scouts the web, follows links, scans results, maps routes, checks sources, inspects images, hunts through data and files, cross-references material, and presents a lead. Magnifiers and other tools are held beside the face in reachable poses.',
    title: 'Searching'
  },
  {
    capabilities: ['scan', 'skim', 'documents', 'charts', 'code review'],
    category: 'reading',
    durationSeconds: 15.77,
    id: '05-reading',
    narration:
      'Basil can scan pages, skim, read carefully, open documents, follow lines, check footnotes, inspect images and charts, review code, and mark reading complete. Thin glasses sit around his actual compact eye line, while books and panels stay clear of his face.',
    title: 'Reading'
  },
  {
    capabilities: ['compose', 'type', 'edit', 'code', 'save'],
    category: 'writing',
    durationSeconds: 15.14,
    id: '06-writing',
    narration:
      'Writing and coding include pencil-ready, composing replies, rapid typing, careful editing, code writing, patch fixing, file renaming, saving, note organization, and final polish. Pencils, keyboards, code panels, and folders use natural side-held poses.',
    title: 'Writing & coding'
  },
  {
    capabilities: ['terminal', 'folders', 'browser', 'data', 'settings'],
    category: 'tools',
    durationSeconds: 16.2,
    id: '07-tools',
    narration:
      'For desktop tools, Basil runs terminals, opens folders, carries files, navigates browsers, crunches data, processes images, adjusts settings, installs packages, and reports completion. Genuine agent and desktop events select these animations; timers never fake work.',
    title: 'Tools & files'
  },
  {
    capabilities: ['request', 'protect', 'review', 'confirm', 'privacy'],
    category: 'permission',
    durationSeconds: 18.17,
    id: '08-permission',
    narration:
      'Safety behavior includes permission requests, protected waiting, key requests, cautious review, confirmation, privacy guarding, risk warnings, patient waiting, and permission granted. The circular character remains inside a separate protection field, and safety states override casual reactions.',
    title: 'Permission & safety'
  },
  {
    capabilities: ['success', 'checkmarks', 'confetti', 'finish', 'recover'],
    category: 'results',
    durationSeconds: 14.11,
    id: '09-results',
    narration:
      'Results and recovery include tiny successes, mission completion, checkmarks, bows, confetti, spins, relieved sighs, neat finishes, safe saves, and victory poses. Basil celebrates without enlarging his small eyes or restrained smile.',
    title: 'Results'
  },
  {
    capabilities: ['speak', 'explain', 'read aloud', 'retry', 'sleep'],
    category: 'rest',
    durationSeconds: 15.84,
    id: '10-speaking-rest',
    narration:
      'Basil speaks softly, tells stories, explains steps, reads aloud, thinks aloud, notices errors, retries, becomes sleepy, floats, and says good night. Procedural phonemes animate the compact mouth, while speaking, error, and sleep expressions remain authoritative.',
    title: 'Speaking & rest'
  }
]

const POINTER_INTERACTIONS = [
  'curious-peek',
  'hover-hello',
  'patient-listen',
  'tiny-high-five',
  'happy-bounce',
  'gentle-wave',
  'shy-blush',
  'welcome-back',
  'hello-basil',
  'heart-pop'
] as const

const DESKTOP_INTERACTIONS = [
  'file-hunt',
  'document-open',
  'code-scribe',
  'terminal-command',
  'browser-navigate',
  'settings-adjust',
  'file-carry',
  'save-document',
  'privacy-guard',
  'tool-complete'
] as const

export const BASIL_TOUR_CHAPTERS: readonly BasilTourChapter[] = [
  ...CATEGORY_CHAPTERS.map(chapter => ({
    ...chapter,
    audioSrc: `./basil-motion/${chapter.id}.mp3`,
    interactionIds: BASIL_INTERACTIONS.filter(interaction => interaction.category === chapter.category).map(
      interaction => interaction.id
    )
  })),
  {
    audioSrc: './basil-motion/11-pointer.mp3',
    capabilities: ['gaze', 'approach', 'dwell', 'boop', 'tickle', 'pet', 'orbit', 'swipe', 'pick up', 'release'],
    durationSeconds: 16.73,
    id: '11-pointer',
    interactionIds: POINTER_INTERACTIONS,
    narration:
      'Basil reacts directly to you. His face follows the real pointer. He notices approach, shares attention with objects, reaches toward a stationary cursor, responds to boops and wheel tickles, recognizes petting, orbit, and swipe gestures, and can be picked up and released.',
    title: 'Pointer reactions'
  },
  {
    audioSrc: './basil-motion/12-desktop.mp3',
    capabilities: ['path planning', 'object contact', 'scroll', 'resize', 'surf', 'drag', 'yield', 'task journey'],
    durationSeconds: 18.41,
    id: '12-desktop',
    interactionIds: DESKTOP_INTERACTIONS,
    narration:
      'Across the desktop, Basil routes around obstacles, works with folders, editors, terminals, links, controls, and collections, follows scrolling and resizing surfaces, surfs moving windows, assists file dragging, yields workspace, and remembers a privacy-safe task journey without storing screen content.',
    title: 'Desktop intelligence'
  }
]

export const BASIL_TOUR_INTERACTION_COUNT = CATEGORY_CHAPTERS.reduce(
  (count, chapter) =>
    count + BASIL_INTERACTIONS.filter(interaction => interaction.category === chapter.category).length,
  0
)
