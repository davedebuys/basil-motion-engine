import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { setBasilAmbientWakeEnabled } from './ambient-wake'
import { BasilMotionStage } from './basil-motion-stage'
import { $basilOverlayActive } from './basil-overlay'
import { $basilPresence } from './presence'
import { routeBasilNearAnchor } from './spatial-engine'
import { $basilParameterOverrides, $basilSceneOverride, $basilSnapshot } from './store'
import { BASIL_ACTOR_SIZE } from './use-basil-spatial'

const anchorRect = {
  bottom: 410,
  height: 110,
  left: 680,
  right: 840,
  toJSON: () => ({}),
  top: 300,
  width: 160,
  x: 680,
  y: 300
}

const surfaceRect = {
  bottom: 650,
  height: 500,
  left: 520,
  right: 820,
  toJSON: () => ({}),
  top: 150,
  width: 300,
  x: 520,
  y: 150
}

describe('BasilMotionStage interaction', () => {
  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) =>
      window.setTimeout(() => callback(performance.now()), 16)
    )
    vi.stubGlobal('cancelAnimationFrame', (handle: number) => window.clearTimeout(handle))
    $basilSnapshot.set({ state: 'idle' })
    setBasilAmbientWakeEnabled(false)
    $basilOverlayActive.set(false)
    $basilParameterOverrides.set({})
    $basilPresence.set({ nonce: 0, phase: 'visible', startedAt: Date.now() })
    $basilSceneOverride.set(null)
    window.localStorage.removeItem('basil.motion.position.v1')
  })

  afterEach(() => {
    cleanup()
    $basilOverlayActive.set(false)
    window.document.querySelectorAll('[data-basil-test-anchor]').forEach(element => element.remove())
    vi.unstubAllGlobals()
  })

  it('renders the wake privacy badge only on the active Basil surface', () => {
    setBasilAmbientWakeEnabled(true)
    const { container } = render(<BasilMotionStage devPanel={false} />)

    expect(container.querySelector('[data-basil-ambient-wake-indicator]')).toBeTruthy()

    act(() => $basilOverlayActive.set(true))
    expect(container.querySelector('[data-basil-ambient-wake-indicator]')).toBeNull()
    expect(container.querySelector('[data-basil-actor]')).toBeNull()
  })

  it('follows the pointer and travels beside a clicked code editor', async () => {
    const { container } = render(<BasilMotionStage devPanel={false} />)
    const actor = container.querySelector<HTMLElement>('[data-basil-actor]')!
    const leftEye = () => container.querySelector<SVGEllipseElement>('[data-basil-eye="left"] ellipse')!

    fireEvent.pointerMove(window, { clientX: 960, clientY: 100 })

    await waitFor(() => expect(Number(leftEye().getAttribute('cx'))).toBeGreaterThan(-12.5))

    const documentObject = window.document.createElement('div')
    documentObject.dataset.slot = 'code-card'
    documentObject.dataset.basilTestAnchor = ''
    documentObject.getBoundingClientRect = () => anchorRect
    window.document.body.append(documentObject)

    const previewLeft = actor.style.left
    const previewTop = actor.style.top

    fireEvent.pointerMove(documentObject, { clientX: 720, clientY: 320 })
    await waitFor(() => expect(container.querySelector('svg')?.getAttribute('data-basil-engagement')).toBe('notice'), {
      timeout: 1400
    })
    expect(container.querySelector('[data-basil-hand="editor"]')?.getAttribute('data-basil-limb-intent')).toBe(
      'consider'
    )
    expect(container.querySelector('[data-basil-transition="anticipation"]')).toBeTruthy()
    expect(actor.style.left).toBe(previewLeft)
    expect(actor.style.top).toBe(previewTop)

    fireEvent.click(documentObject, { clientX: 800, clientY: 390 })

    await waitFor(() => expect(Number.parseFloat(actor.style.left)).toBeGreaterThan(840), { timeout: 4000 })
    await waitFor(() => expect(container.querySelector('svg')?.getAttribute('data-basil-engagement')).toBe('act'))
    expect(container.querySelector('[data-basil-context="editor"]')).toBeTruthy()
    expect(container.querySelector('svg')?.getAttribute('data-basil-object-contact')).toBe('0.500,0.636')
    expect(container.querySelector('svg')?.getAttribute('data-basil-object-shape')).toBe('compact')
    expect(container.querySelector('[data-basil-hand="editor"]')?.getAttribute('data-basil-limb-intent')).toBe('type')
    expect(container.querySelector('[data-basil-transition="anticipation"]')).toBeNull()

    fireEvent.pointerMove(documentObject, { clientX: 802, clientY: 392 })
    await new Promise(resolve => window.setTimeout(resolve, 700))
    expect(container.querySelector('svg')?.getAttribute('data-basil-engagement')).toBe('act')

    fireEvent.click(actor)
    await waitFor(() =>
      expect(Number(container.querySelector('svg')?.getAttribute('data-basil-affection'))).toBeGreaterThan(0.5)
    )
    expect(container.querySelector('[data-basil-pointer-reaction="affection"]')).toBeTruthy()
  })

  it('looks toward a visible Hermes point of interest before direct interaction', async () => {
    const composer = window.document.createElement('div')
    composer.dataset.slot = 'composer-surface'
    composer.dataset.basilTestAnchor = ''
    composer.getBoundingClientRect = () => ({
      ...anchorRect,
      bottom: 780,
      left: 560,
      right: 1040,
      top: 700,
      width: 480,
      x: 560,
      y: 700
    })
    window.document.body.append(composer)

    const { container } = render(<BasilMotionStage devPanel={false} />)

    await waitFor(() =>
      expect(container.querySelector('svg')?.getAttribute('data-basil-point-of-interest')).toBe('composer')
    )

    const svg = container.querySelector('svg')!
    const [faceX, faceY] = svg.getAttribute('data-basil-face-vector')!.split(',').map(Number)

    expect(svg.getAttribute('data-basil-point-of-interest-source')).toBe('ambient')
    expect(svg.getAttribute('data-basil-gaze-source')).toBe('object')
    expect(faceX).toBeGreaterThan(0.1)
    expect(faceY).toBeGreaterThan(0.1)
  })

  it('collaborates with a genuine DOM asset drag and releases at its destination', async () => {
    const documentObject = window.document.createElement('div')
    documentObject.dataset.slot = 'code-card'
    documentObject.dataset.basilTestAnchor = ''
    documentObject.getBoundingClientRect = () => anchorRect
    window.document.body.append(documentObject)

    const { container } = render(<BasilMotionStage devPanel={false} />)
    const actor = container.querySelector<HTMLElement>('[data-basil-actor]')!
    const startX = Number.parseFloat(actor.style.left)

    fireEvent.pointerDown(documentObject, {
      button: 0,
      buttons: 1,
      clientX: 700,
      clientY: 330,
      pointerId: 17
    })
    fireEvent.pointerMove(documentObject, {
      buttons: 1,
      clientX: 770,
      clientY: 350,
      pointerId: 17
    })
    fireEvent.pointerMove(documentObject, {
      buttons: 1,
      clientX: 930,
      clientY: 390,
      pointerId: 17
    })

    await waitFor(() => expect(container.querySelector('svg')?.getAttribute('data-basil-drag-assist')).toBe('carry'))
    expect(container.querySelector('svg')?.getAttribute('data-basil-drag-grip')).toBe('1.000')
    expect(container.querySelector('g[data-basil-drag-assist="carry"]')).toBeTruthy()
    expect(container.querySelector('[data-basil-context="editor"]')).toBeTruthy()
    await waitFor(() => expect(Number.parseFloat(actor.style.left)).toBeGreaterThan(startX + 30))

    fireEvent.pointerUp(documentObject, {
      button: 0,
      buttons: 0,
      clientX: 930,
      clientY: 390,
      pointerId: 17
    })

    await waitFor(() => expect(container.querySelector('svg')?.getAttribute('data-basil-drag-assist')).toBe('release'))
    expect(container.querySelector('svg')?.getAttribute('data-basil-drag-release')).toBe('1.000')
    expect(container.querySelector('svg')?.getAttribute('data-basil-drag-grip')).toBe('0.180')
    await waitFor(() => expect(container.querySelector('g[data-basil-drag-assist]')).toBeNull(), {
      timeout: 1500
    })
  })

  it('reacts to a genuine direct double-click with a boop instead of affection', async () => {
    const { container } = render(<BasilMotionStage devPanel={false} />)
    const actor = container.querySelector<HTMLButtonElement>('[data-basil-actor]')!

    fireEvent.doubleClick(actor)

    await waitFor(() =>
      expect(Number(container.querySelector('svg')?.getAttribute('data-basil-pointer-boop'))).toBeGreaterThan(0.5)
    )
    expect(container.querySelector('[data-basil-pointer-reaction="boop"]')).toBeTruthy()
    expect(container.querySelector('svg')?.getAttribute('data-basil-affection')).toBe('0.000')
  })

  it('reacts to genuine wheel input over Basil with a directional tickle', async () => {
    const { container } = render(<BasilMotionStage devPanel={false} />)
    const actor = container.querySelector<HTMLButtonElement>('[data-basil-actor]')!

    fireEvent.wheel(actor, { deltaY: -120 })

    await waitFor(() =>
      expect(Number(container.querySelector('svg')?.getAttribute('data-basil-pointer-tickle'))).toBeGreaterThan(0.4)
    )
    expect(container.querySelector('[data-basil-pointer-reaction="tickle"]')).toBeTruthy()
    expect(container.querySelector('svg')?.getAttribute('data-basil-pointer-tickle-direction')).toBe('-1.000')
  })

  it('uses a held pose instead of locomotion while the user drags Basil', async () => {
    const { container } = render(<BasilMotionStage devPanel={false} />)
    const actor = container.querySelector<HTMLElement>('[data-basil-actor]')!

    actor.setPointerCapture = vi.fn()
    actor.releasePointerCapture = vi.fn()

    fireEvent.pointerDown(actor, {
      button: 0,
      clientX: 700,
      clientY: 420,
      pointerId: 31
    })
    fireEvent.pointerMove(actor, {
      buttons: 1,
      clientX: 860,
      clientY: 500,
      pointerId: 31
    })

    await waitFor(() => expect(container.querySelector('svg')?.getAttribute('data-basil-actor-drag')).toBe('held'))
    expect(container.querySelector('svg')?.getAttribute('data-basil-locomotion')).toBe('grounded')
    expect(container.querySelector('[data-basil-actor-drag-cue="held"]')).toBeTruthy()
    expect(container.querySelector('[data-basil-transition="travel"]')).toBeNull()

    fireEvent.pointerUp(actor, {
      button: 0,
      clientX: 860,
      clientY: 500,
      pointerId: 31
    })
    fireEvent.click(actor)

    await waitFor(() => expect(container.querySelector('svg')?.getAttribute('data-basil-actor-drag')).toBe('release'))
    expect(container.querySelector('[data-basil-actor-drag-cue="release"]')).toBeTruthy()
    expect(Number(container.querySelector('svg')?.getAttribute('data-basil-actor-drag-release'))).toBeGreaterThan(0.5)
    expect(container.querySelector('svg')?.getAttribute('data-basil-affection')).toBe('0.000')

    await act(async () => new Promise(resolve => window.setTimeout(resolve, 1)))
    fireEvent.click(actor)
    await waitFor(() =>
      expect(Number(container.querySelector('svg')?.getAttribute('data-basil-affection'))).toBeGreaterThan(0.5)
    )
  })

  it('yields around an active DOM asset when the real pointer obstructs the actor', async () => {
    const editor = window.document.createElement('div')

    editor.dataset.slot = 'code-card'
    editor.dataset.basilTestAnchor = ''
    editor.getBoundingClientRect = () => surfaceRect
    window.document.body.append(editor)

    const { container } = render(<BasilMotionStage devPanel={false} />)
    const actor = container.querySelector<HTMLElement>('[data-basil-actor]')!

    fireEvent.click(editor, { clientX: 780, clientY: 420 })

    await waitFor(() => expect(container.querySelector('svg')?.getAttribute('data-basil-engagement')).toBe('act'), {
      timeout: 4000
    })
    await waitFor(() => expect(Number.parseFloat(actor.style.left)).toBeGreaterThanOrEqual(surfaceRect.right + 9.5), {
      timeout: 4000
    })

    const landed = {
      x: Number.parseFloat(actor.style.left),
      y: Number.parseFloat(actor.style.top)
    }

    const samples: Array<{ x: number; y: number }> = []

    const sampler = window.setInterval(() => {
      samples.push({
        x: Number.parseFloat(actor.style.left),
        y: Number.parseFloat(actor.style.top)
      })
    }, 8)

    fireEvent.pointerMove(actor, {
      clientX: landed.x + BASIL_ACTOR_SIZE.width / 2,
      clientY: landed.y + BASIL_ACTOR_SIZE.height / 2
    })

    try {
      await waitFor(() =>
        expect(container.querySelector('svg')?.getAttribute('data-basil-workspace-coordination')).toBe('yield')
      )
      expect(container.querySelector('[data-basil-workspace-cue="after-you"]')).toBeTruthy()
      expect(
        Number(container.querySelector('svg')?.getAttribute('data-basil-workspace-pointer-clearance'))
      ).toBeGreaterThan(
        Number(container.querySelector('svg')?.getAttribute('data-basil-workspace-current-clearance')) + 22
      )
      await waitFor(
        () =>
          expect(
            Math.hypot(Number.parseFloat(actor.style.left) - landed.x, Number.parseFloat(actor.style.top) - landed.y)
          ).toBeGreaterThan(40),
        { timeout: 4000 }
      )
    } finally {
      window.clearInterval(sampler)
    }

    expect(samples.length).toBeGreaterThan(0)
    samples.forEach(sample => {
      const overlaps =
        sample.x < surfaceRect.right &&
        sample.x + BASIL_ACTOR_SIZE.width > surfaceRect.left &&
        sample.y < surfaceRect.bottom &&
        sample.y + BASIL_ACTOR_SIZE.height > surfaceRect.top

      expect(overlaps, JSON.stringify(sample)).toBe(false)
    })
  })

  it('derives anticipatory gaze from genuine pointer velocity and settles after movement stops', async () => {
    const { container } = render(<BasilMotionStage devPanel={false} />)

    fireEvent.pointerMove(window, { clientX: 360, clientY: 80 })
    await new Promise(resolve => window.setTimeout(resolve, 70))
    fireEvent.pointerMove(window, { clientX: 760, clientY: 80 })

    await waitFor(
      () => expect(container.querySelector('svg')?.getAttribute('data-basil-pointer-intent')).toBe('anticipate'),
      { timeout: 1600 }
    )

    const velocity = Number(container.querySelector('svg')?.getAttribute('data-basil-pointer-velocity')?.split(',')[0])

    expect(velocity).toBeGreaterThan(0.2)
    expect(Number(container.querySelector('svg')?.getAttribute('data-basil-pointer-intent-lead'))).toBeGreaterThan(0)

    await waitFor(
      () => expect(container.querySelector('svg')?.getAttribute('data-basil-pointer-intent')).toBe('settle'),
      { timeout: 1600 }
    )

    expect(container.querySelector('svg')?.getAttribute('data-basil-pointer-intent-lead')).toBe('0.000')
  })

  it('holds a decaying edge glance after a genuine top-level pointer departure', async () => {
    const { container } = render(<BasilMotionStage devPanel={false} />)

    fireEvent.pointerMove(window, { clientX: 980, clientY: 80 })

    await waitFor(() =>
      expect(
        Number(container.querySelector('svg')?.getAttribute('data-basil-gaze-vector')?.split(',')[0])
      ).toBeGreaterThan(0.35)
    )

    fireEvent.pointerOut(window, { relatedTarget: null })

    await waitFor(() =>
      expect(Number(container.querySelector('svg')?.getAttribute('data-basil-pointer-departure'))).toBeGreaterThan(0.6)
    )

    expect(container.querySelector('[data-basil-pointer-reaction="departure"]')).toBeTruthy()
    expect(container.querySelector('svg')?.getAttribute('data-basil-gaze-brow')).toBe('curious')

    fireEvent.pointerMove(window, { clientX: 540, clientY: 360 })

    await waitFor(() =>
      expect(container.querySelector('svg')?.getAttribute('data-basil-pointer-departure')).toBe('0.000')
    )
    expect(container.querySelector('[data-basil-pointer-reaction="departure"]')).toBeNull()
    expect(Number(container.querySelector('svg')?.getAttribute('data-basil-pointer-return'))).toBeGreaterThan(0.5)
    expect(container.querySelector('[data-basil-pointer-reaction="return"]')).toBeTruthy()

    await waitFor(
      () =>
        expect(Number(container.querySelector('svg')?.getAttribute('data-basil-pointer-return'))).toBeLessThan(0.15),
      { timeout: 2600 }
    )
  })

  it('recognizes genuine crown petting in the embedded Hermes renderer', async () => {
    const { container } = render(<BasilMotionStage devPanel={false} />)
    const actor = container.querySelector<HTMLElement>('[data-basil-actor]')!

    const center = {
      x: Number.parseFloat(actor.style.left) + BASIL_ACTOR_SIZE.width / 2,
      y: Number.parseFloat(actor.style.top) + BASIL_ACTOR_SIZE.height / 2
    }

    let peakPet = 0

    let sawCue = false

    for (const x of [-30, 30, -28, 32, -26, 29, -24, 27]) {
      fireEvent.pointerMove(window, { clientX: center.x + x, clientY: center.y - 35 })
      await act(async () => new Promise(resolve => window.setTimeout(resolve, 70)))
      peakPet = Math.max(peakPet, Number(container.querySelector('svg')?.getAttribute('data-basil-pointer-pet')))
      sawCue ||= Boolean(container.querySelector('[data-basil-pointer-reaction="petting"]'))
    }

    expect(peakPet).toBeGreaterThan(0.25)
    expect(sawCue).toBe(true)
  })

  it('passes a genuine task phase from the generic snapshot into the actor', async () => {
    const editor = window.document.createElement('div')
    editor.dataset.slot = 'code-card'
    editor.dataset.basilTestAnchor = ''
    editor.getBoundingClientRect = () => surfaceRect
    window.document.body.append(editor)

    $basilSnapshot.set({
      lastEvent: {
        kind: 'writing' as const,
        scene: { resourceKind: 'code', target: 'editor', taskPhase: 'inspect' },
        source: 'generic-test'
      },
      state: 'writing'
    })

    const { container } = render(<BasilMotionStage devPanel={false} />)
    const actor = container.querySelector<HTMLElement>('[data-basil-actor]')!

    await waitFor(() => expect(container.querySelector('svg')?.getAttribute('data-basil-task-action')).toBe('review'))
    await waitFor(() => expect(container.querySelector('svg')?.getAttribute('data-basil-engagement')).toBe('act'), {
      timeout: 4000
    })
    await waitFor(() => expect(container.querySelector('svg')?.getAttribute('data-basil-landing')).toBe('0.000'), {
      timeout: 4000
    })
    expect(container.querySelector('[data-basil-task-phase-cue="inspect"]')).toBeTruthy()
    await waitFor(() => expect(Number.parseFloat(actor.style.left)).toBeGreaterThanOrEqual(surfaceRect.right + 9.5))

    const inspectTop = Number.parseFloat(actor.style.top)
    const inspectContact = container.querySelector('svg')?.getAttribute('data-basil-object-contact')

    act(() => {
      $basilSnapshot.set({
        lastEvent: {
          kind: 'tool_complete',
          scene: { resourceKind: 'code', target: 'editor', taskPhase: 'complete' },
          source: 'generic-test'
        },
        state: 'thinking'
      })
    })

    await waitFor(() => expect(container.querySelector('svg')?.getAttribute('data-basil-task-action')).toBe('save'))
    await waitFor(() => expect(Number.parseFloat(actor.style.top)).toBeGreaterThan(inspectTop + 40), { timeout: 4000 })
    await waitFor(() => expect(container.querySelector('svg')?.getAttribute('data-basil-engagement')).toBe('act'))

    const completeContact = container.querySelector('svg')?.getAttribute('data-basil-object-contact')

    expect(completeContact).not.toBe(inspectContact)
    expect(Number.parseFloat(actor.style.left)).toBeGreaterThanOrEqual(surfaceRect.right + 9.5)
    await waitFor(() => expect(container.querySelector('svg')?.getAttribute('data-basil-landing')).toBe('0.000'), {
      timeout: 4000
    })

    const expectedCompleteTop = routeBasilNearAnchor(
      { id: 'editor', preferredSide: 'right', rect: surfaceRect, target: 'editor' },
      BASIL_ACTOR_SIZE,
      { height: window.innerHeight, width: window.innerWidth },
      'complete'
    ).destination.y

    await waitFor(() => expect(Number.parseFloat(actor.style.top)).toBeCloseTo(expectedCompleteTop, 1), {
      timeout: 4000
    })

    act(() => {
      $basilSnapshot.set({
        lastEvent: {
          kind: 'tool_complete',
          scene: { resourceKind: 'code', target: 'editor', taskPhase: 'complete' },
          source: 'generic-test'
        },
        state: 'thinking'
      })
    })

    await act(async () => new Promise(resolve => window.setTimeout(resolve, 80)))
    expect(Number.parseFloat(actor.style.top)).toBeCloseTo(expectedCompleteTop, 1)
    expect(container.querySelector('svg')?.getAttribute('data-basil-landing')).toBe('0.000')
  }, 30_000)

  it('follows a live work surface through layout changes without falling back when it disappears', async () => {
    let liveRect = { ...surfaceRect }
    const editor = window.document.createElement('div')

    editor.dataset.slot = 'code-card'
    editor.dataset.basilTestAnchor = ''
    editor.getBoundingClientRect = () => liveRect
    window.document.body.append(editor)

    const snapshot = {
      lastEvent: {
        kind: 'writing' as const,
        scene: { resourceKind: 'code' as const, target: 'editor' as const, taskPhase: 'execute' as const },
        source: 'generic-test'
      },
      state: 'writing' as const
    }

    $basilSnapshot.set(snapshot)

    const { container } = render(<BasilMotionStage devPanel={false} />)
    const actor = container.querySelector<HTMLElement>('[data-basil-actor]')!

    await waitFor(() => expect(Number.parseFloat(actor.style.left)).toBeGreaterThanOrEqual(surfaceRect.right + 9.5), {
      timeout: 4000
    })

    const initialContact = container.querySelector('svg')?.getAttribute('data-basil-object-contact')

    liveRect = {
      bottom: 640,
      height: 420,
      left: 240,
      right: 540,
      toJSON: () => ({}),
      top: 220,
      width: 300,
      x: 240,
      y: 220
    }

    act(() => window.dispatchEvent(new Event('scroll')))

    const expected = routeBasilNearAnchor(
      { id: 'editor', preferredSide: 'right', rect: liveRect, target: 'editor' },
      BASIL_ACTOR_SIZE,
      { height: window.innerHeight, width: window.innerWidth },
      'execute'
    )

    await waitFor(() => expect(Number.parseFloat(actor.style.left)).toBeCloseTo(expected.destination.x, 1), {
      timeout: 4000
    })
    await waitFor(() => expect(Number.parseFloat(actor.style.top)).toBeCloseTo(expected.destination.y, 1), {
      timeout: 4000
    })

    expect(container.querySelector('svg')?.getAttribute('data-basil-task-action')).toBe('compose')
    expect(container.querySelector('svg')?.getAttribute('data-basil-object-contact')).not.toBe(initialContact)
    expect(Number.parseFloat(actor.style.left)).toBeGreaterThanOrEqual(liveRect.right + 9.5)
    expect($basilSnapshot.get()).toBe(snapshot)

    const held = {
      left: Number.parseFloat(actor.style.left),
      top: Number.parseFloat(actor.style.top)
    }

    liveRect = {
      ...liveRect,
      bottom: -40,
      top: -460,
      y: -460
    }

    act(() => window.dispatchEvent(new Event('scroll')))
    await act(async () => new Promise(resolve => window.setTimeout(resolve, 260)))

    expect(Number.parseFloat(actor.style.left)).toBeCloseTo(held.left, 1)
    expect(Number.parseFloat(actor.style.top)).toBeCloseTo(held.top, 1)
    expect($basilSnapshot.get()).toBe(snapshot)
  })

  it('moves an idle Basil after a deliberate swipe but protects active work', async () => {
    const { container } = render(<BasilMotionStage devPanel={false} />)
    const actor = container.querySelector<HTMLElement>('[data-basil-actor]')!

    const performSwipe = async () => {
      let peakSwipe = 0

      const center = {
        x: Number.parseFloat(actor.style.left) + BASIL_ACTOR_SIZE.width / 2,
        y: Number.parseFloat(actor.style.top) + BASIL_ACTOR_SIZE.height / 2
      }

      for (const [index, offset] of [-170, -90, -10, 70, 150, 230].entries()) {
        fireEvent.pointerMove(window, { clientX: center.x + offset, clientY: center.y + 4 })
        await act(async () => new Promise(resolve => window.setTimeout(resolve, index === 0 ? 20 : 35)))
        peakSwipe = Math.max(
          peakSwipe,
          Number(container.querySelector('svg')?.getAttribute('data-basil-pointer-swipe'))
        )
      }

      await act(async () => new Promise(resolve => window.requestAnimationFrame(() => resolve(undefined))))
      peakSwipe = Math.max(peakSwipe, Number(container.querySelector('svg')?.getAttribute('data-basil-pointer-swipe')))

      return peakSwipe
    }

    const startLeft = Number.parseFloat(actor.style.left)

    await performSwipe()
    await waitFor(() => expect(Number.parseFloat(actor.style.left)).toBeGreaterThan(startLeft + 70), {
      timeout: 4000
    })

    const saved = JSON.parse(window.localStorage.getItem('basil.motion.position.v1') ?? '{}') as {
      x?: number
      y?: number
    }

    expect(saved.x).toBeGreaterThan(startLeft + 70)
    await waitFor(() => expect(Number.parseFloat(actor.style.left)).toBeCloseTo(saved.x ?? 0, 1), { timeout: 4000 })
    await waitFor(() => expect(container.querySelector('svg')?.getAttribute('data-basil-landing')).toBe('0.000'), {
      timeout: 4000
    })

    act(() => {
      $basilSnapshot.set({ state: 'writing' })
    })
    await act(async () => new Promise(resolve => window.setTimeout(resolve, 520)))

    const workingLeft = Number.parseFloat(actor.style.left)
    const workingTop = Number.parseFloat(actor.style.top)

    const protectedSwipePeak = await performSwipe()
    expect(protectedSwipePeak).toBeGreaterThan(0.3)
    await act(async () => new Promise(resolve => window.setTimeout(resolve, 240)))

    expect(Number.parseFloat(actor.style.left)).toBeCloseTo(workingLeft, 1)
    expect(Number.parseFloat(actor.style.top)).toBeCloseTo(workingTop, 1)
  })

  it('travels around an unrelated work surface before reaching the active editor', async () => {
    window.localStorage.setItem('basil.motion.position.v1', JSON.stringify({ x: 40, y: 320 }))

    const obstacleRect = {
      bottom: 500,
      height: 400,
      left: 320,
      right: 550,
      toJSON: () => ({}),
      top: 100,
      width: 230,
      x: 320,
      y: 100
    }

    const targetRect = {
      bottom: 620,
      height: 440,
      left: 740,
      right: 940,
      toJSON: () => ({}),
      top: 180,
      width: 200,
      x: 740,
      y: 180
    }

    const obstacle = window.document.createElement('div')
    const target = window.document.createElement('div')

    obstacle.dataset.slot = 'aui_embed-card'
    obstacle.dataset.basilTestAnchor = ''
    obstacle.getBoundingClientRect = () => obstacleRect
    target.dataset.slot = 'code-card'
    target.dataset.basilTestAnchor = ''
    target.getBoundingClientRect = () => targetRect
    window.document.body.append(obstacle, target)

    $basilSnapshot.set({
      lastEvent: {
        kind: 'writing',
        scene: { resourceKind: 'code', target: 'editor', taskPhase: 'execute' },
        source: 'generic-test'
      },
      state: 'writing'
    })

    const { container } = render(<BasilMotionStage devPanel={false} />)
    const actor = container.querySelector<HTMLElement>('[data-basil-actor]')!
    const samples: Array<{ x: number; y: number }> = []

    const sampler = window.setInterval(() => {
      samples.push({
        x: Number.parseFloat(actor.style.left),
        y: Number.parseFloat(actor.style.top)
      })
    }, 8)

    try {
      await waitFor(() => expect(container.querySelector('svg')?.getAttribute('data-basil-engagement')).toBe('act'), {
        timeout: 6000
      })
    } finally {
      window.clearInterval(sampler)
    }

    expect(samples.length).toBeGreaterThan(20)
    expect(samples.some(sample => sample.y > obstacleRect.bottom + 10)).toBe(true)

    samples.forEach(sample => {
      const overlaps =
        sample.x < obstacleRect.right &&
        sample.x + BASIL_ACTOR_SIZE.width > obstacleRect.left &&
        sample.y < obstacleRect.bottom &&
        sample.y + BASIL_ACTOR_SIZE.height > obstacleRect.top

      expect(overlaps).toBe(false)
    })

    const expected = routeBasilNearAnchor(
      { id: 'editor', preferredSide: 'right', rect: targetRect, target: 'editor' },
      BASIL_ACTOR_SIZE,
      { height: window.innerHeight, width: window.innerWidth },
      'execute'
    ).destination

    await waitFor(
      () => {
        expect(Number.parseFloat(actor.style.left)).toBeCloseTo(expected.x, 1)
        expect(Number.parseFloat(actor.style.top)).toBeCloseTo(expected.y, 1)
      },
      { timeout: 2000 }
    )
  })
})
