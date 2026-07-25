import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  domBasilAnchorFromElement,
  snapshotDomBasilAnchors,
  subscribeDomBasilAnchorLayout
} from './dom-scene-adapter'

const rect = {
  bottom: 260,
  height: 60,
  left: 100,
  right: 300,
  toJSON: () => ({}),
  top: 200,
  width: 200,
  x: 100,
  y: 200
}

afterEach(() => {
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
})

describe('DOM scene adapter', () => {
  it('measures configured live elements without coupling to Hermes', () => {
    document.body.innerHTML = '<section data-work-surface><button>Open</button></section>'
    const surface = document.querySelector<HTMLElement>('[data-work-surface]')!
    surface.getBoundingClientRect = () => rect
    const specs = [{ preferredSide: 'right' as const, selectors: ['[data-work-surface]'], target: 'document' as const }]

    const anchors = snapshotDomBasilAnchors(specs)
    expect(anchors).toHaveLength(1)
    expect(anchors[0]).toMatchObject({ preferredSide: 'right', rect: { height: 60, width: 200, x: 100, y: 200 } })

    const child = surface.querySelector('button')!
    expect(domBasilAnchorFromElement(child, specs)?.target).toBe('document')
  })

  it('coalesces live scroll, resize, and mutation changes and cleans up', async () => {
    document.body.innerHTML = '<section data-work-surface></section>'

    const observed: Element[] = []

    vi.stubGlobal(
      'ResizeObserver',
      class {
        disconnect = vi.fn()

        observe = (element: Element) => {
          observed.push(element)
        }
      }
    )

    const callback = vi.fn()
    const specs = [{ selectors: ['[data-work-surface]'], target: 'document' as const }]
    const unsubscribe = subscribeDomBasilAnchorLayout(specs, callback)

    expect(observed).toHaveLength(1)

    window.dispatchEvent(new Event('scroll'))
    window.dispatchEvent(new Event('resize'))
    document.querySelector<HTMLElement>('[data-work-surface]')!.style.width = '240px'

    await new Promise(resolve => window.setTimeout(resolve, 40))
    expect(callback).toHaveBeenCalledOnce()

    unsubscribe()
    window.dispatchEvent(new Event('scroll'))
    await new Promise(resolve => window.setTimeout(resolve, 30))
    expect(callback).toHaveBeenCalledOnce()
  })
})
