import type { BasilAnchorSide, BasilRect, BasilSceneAnchor } from './spatial-engine'
import type { BasilSceneTarget } from './types'

export interface DomBasilAnchorSpec {
  preferredSide?: BasilAnchorSide
  priority?: number
  selectors: readonly string[]
  target: BasilSceneTarget
}

export type DomBasilLayoutUnsubscribe = () => void

function elementRect(element: Element): BasilRect | null {
  const rect = element.getBoundingClientRect()
  const view = element.ownerDocument.defaultView
  const style = view?.getComputedStyle(element)

  if (
    rect.width < 2 ||
    rect.height < 2 ||
    rect.bottom <= 0 ||
    rect.right <= 0 ||
    rect.top >= (view?.innerHeight ?? 0) ||
    rect.left >= (view?.innerWidth ?? 0) ||
    style?.display === 'none' ||
    style?.visibility === 'hidden'
  ) {
    return null
  }

  return { height: rect.height, width: rect.width, x: rect.left, y: rect.top }
}

export function snapshotDomBasilAnchors(
  specs: readonly DomBasilAnchorSpec[],
  root: ParentNode = document
): BasilSceneAnchor[] {
  const anchors: BasilSceneAnchor[] = []

  specs.forEach((spec, specIndex) => {
    spec.selectors.forEach((selector, selectorIndex) => {
      const elements = root.querySelectorAll(selector)

      elements.forEach((element, elementIndex) => {
        const rect = elementRect(element)

        if (rect) {
          anchors.push({
            id: `${spec.target}:${specIndex}:${selectorIndex}:${elementIndex}`,
            preferredSide: spec.preferredSide,
            priority: (spec.priority ?? 0) + selectorIndex * -0.01,
            rect,
            target: spec.target
          })
        }
      })
    })
  })

  return anchors
}

export function domBasilAnchorFromElement(
  element: Element,
  specs: readonly DomBasilAnchorSpec[]
): BasilSceneAnchor | null {
  for (const [specIndex, spec] of specs.entries()) {
    for (const [selectorIndex, selector] of spec.selectors.entries()) {
      const matched = element.closest(selector)

      if (!matched) {
        continue
      }

      const rect = elementRect(matched)

      if (rect) {
        return {
          id: `pointer:${spec.target}:${specIndex}:${selectorIndex}`,
          preferredSide: spec.preferredSide,
          priority: spec.priority,
          rect,
          target: spec.target
        }
      }
    }
  }

  return null
}

export function subscribeDomBasilAnchorLayout(
  specs: readonly DomBasilAnchorSpec[],
  callback: () => void,
  root: ParentNode = document
): DomBasilLayoutUnsubscribe {
  const ownerDocument = root instanceof Document ? root : root.ownerDocument
  const view = ownerDocument?.defaultView

  if (!ownerDocument || !view) {
    return () => {}
  }

  let frame = 0
  let disposed = false
  const observed = new Set<Element>()

  const schedule = () => {
    if (disposed || frame) {
      return
    }

    frame = view.requestAnimationFrame(() => {
      frame = 0

      if (!disposed) {
        refreshObservedElements()
        callback()
      }
    })
  }

  const resizeObserver =
    typeof view.ResizeObserver === 'function'
      ? new view.ResizeObserver(() => {
          schedule()
        })
      : null

  const refreshObservedElements = () => {
    if (!resizeObserver) {
      return
    }

    specs.forEach(spec => {
      spec.selectors.forEach(selector => {
        root.querySelectorAll(selector).forEach(element => {
          if (!observed.has(element)) {
            observed.add(element)
            resizeObserver.observe(element)
          }
        })
      })
    })
  }

  const mutationObserver = new view.MutationObserver(schedule)

  refreshObservedElements()
  mutationObserver.observe(root, {
    attributeFilter: ['class', 'hidden', 'style'],
    attributes: true,
    childList: true,
    subtree: true
  })
  view.addEventListener('resize', schedule)
  view.addEventListener('scroll', schedule, true)

  return () => {
    disposed = true

    if (frame) {
      view.cancelAnimationFrame(frame)
    }

    mutationObserver.disconnect()
    resizeObserver?.disconnect()
    view.removeEventListener('resize', schedule)
    view.removeEventListener('scroll', schedule, true)
  }
}
