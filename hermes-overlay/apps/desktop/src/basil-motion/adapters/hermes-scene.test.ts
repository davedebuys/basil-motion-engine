import { afterEach, describe, expect, it } from 'vitest'

import { hermesBasilAnchorFromElement, snapshotHermesBasilAnchors } from './hermes-scene'

afterEach(() => {
  document.body.innerHTML = ''
})

describe('Hermes Basil scene anchors', () => {
  it('distinguishes image artifacts from structured data surfaces', () => {
    document.body.innerHTML = `
      <article><img slot="artifact-media" /></article>
      <div role="grid"><div role="row">data</div></div>
    `
    const image = document.querySelector('img')!
    const grid = document.querySelector('[role="grid"]')!
    image.getBoundingClientRect = () => new DOMRect(40, 50, 120, 90)
    grid.getBoundingClientRect = () => new DOMRect(220, 50, 240, 140)

    expect(hermesBasilAnchorFromElement(image)?.target).toBe('image')
    expect(hermesBasilAnchorFromElement(grid)?.target).toBe('data')
    expect(snapshotHermesBasilAnchors().map(anchor => anchor.target)).toEqual(expect.arrayContaining(['image', 'data']))
  })
})
