import {
  domBasilAnchorFromElement,
  type DomBasilAnchorSpec,
  snapshotDomBasilAnchors,
  subscribeDomBasilAnchorLayout
} from '../dom-scene-adapter'
import type { BasilSceneAnchor } from '../spatial-engine'

const HERMES_SCENE_ANCHORS: readonly DomBasilAnchorSpec[] = [
  {
    preferredSide: 'right',
    priority: 11,
    selectors: ['[role="treeitem"]'],
    target: 'folder'
  },
  {
    preferredSide: 'right',
    priority: 12,
    selectors: ['[data-slot="tool-approval-inline"]', '[data-slot="clarify-inline"]', '[data-slot="dialog-content"]'],
    target: 'permission'
  },
  {
    preferredSide: 'left',
    priority: 11,
    selectors: ['[data-terminal]'],
    target: 'terminal'
  },
  {
    preferredSide: 'left',
    priority: 11,
    selectors: ['[data-slot="tool-block"]'],
    target: 'tool'
  },
  {
    preferredSide: 'right',
    priority: 10,
    selectors: [
      '[data-slot="file-diff-panel"]',
      '[data-slot="code-card"]'
    ],
    target: 'editor'
  },
  {
    preferredSide: 'right',
    priority: 12,
    selectors: ['[slot="artifact-media"]', '[data-slot="artifact-image"]', 'img[data-attachment-id]'],
    target: 'image'
  },
  {
    preferredSide: 'right',
    priority: 11,
    selectors: ['[data-slot="data-table"]', '[role="grid"]', 'table'],
    target: 'data'
  },
  {
    preferredSide: 'right',
    priority: 10,
    selectors: ['[data-slot="artifact-file"]'],
    target: 'document'
  },
  {
    preferredSide: 'right',
    priority: 10,
    selectors: ['[data-slot="aui_embed-card"]', 'a[href^="http"]'],
    target: 'web'
  },
  {
    preferredSide: 'above',
    priority: 10,
    selectors: ['[data-slot="composer-surface"]', '[data-slot="composer-root"]'],
    target: 'composer'
  },
  {
    preferredSide: 'right',
    priority: 9,
    selectors: ['[data-slot="aui_assistant-message-root"]', '[data-slot="aui_thread-content"]'],
    target: 'conversation'
  },
  {
    preferredSide: 'right',
    priority: 12,
    selectors: ['[role="alert"]', '[data-slot="aui_system-message-root"]'],
    target: 'error'
  },
  {
    preferredSide: 'above',
    priority: 2,
    selectors: ['[data-slot="profile-rail"]', '[data-slot="statusbar"]'],
    target: 'rest'
  }
]

const HERMES_POINTER_ANCHORS: readonly DomBasilAnchorSpec[] = [
  ...HERMES_SCENE_ANCHORS,
  {
    preferredSide: 'right',
    selectors: ['[data-slot="file-diff-panel"]', '[data-slot="code-card"]'],
    target: 'editor'
  }
]

export function snapshotHermesBasilAnchors(root: ParentNode = document): BasilSceneAnchor[] {
  return snapshotDomBasilAnchors(HERMES_SCENE_ANCHORS, root)
}

export function hermesBasilAnchorFromElement(element: Element): BasilSceneAnchor | null {
  return domBasilAnchorFromElement(element, HERMES_POINTER_ANCHORS)
}

export function subscribeHermesBasilAnchorLayout(callback: () => void): () => void {
  return subscribeDomBasilAnchorLayout(HERMES_SCENE_ANCHORS, callback)
}
