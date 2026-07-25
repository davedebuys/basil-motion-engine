import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { BasilOverlayExternalTarget } from './basil-overlay'
import { BasilOverlayApp } from './basil-overlay-app'
import { $basilParameterOverrides, $basilSceneOverride, $basilSnapshot } from './store'

describe('BasilOverlayApp', () => {
  let dispatchExternalTarget: (payload: BasilOverlayExternalTarget) => void
  let propertyRestorers: Array<() => void>

  beforeEach(() => {
    propertyRestorers = []
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) =>
      window.setTimeout(() => callback(performance.now()), 16)
    )
    vi.stubGlobal('cancelAnimationFrame', (handle: number) => window.clearTimeout(handle))
    $basilSnapshot.set({ state: 'idle' })
    $basilParameterOverrides.set({})
    $basilSceneOverride.set(null)

    const basilOverlay = {
      control: vi.fn(),
      onExternalTarget: vi.fn((callback: (payload: BasilOverlayExternalTarget) => void) => {
        dispatchExternalTarget = callback

        return () => {}
      }),
      onState: vi.fn(() => () => {}),
      setIgnoreMouse: vi.fn()
    }

    Object.defineProperty(window, 'hermesDesktop', {
      configurable: true,
      value: { basilOverlay }
    })
  })

  afterEach(() => {
    cleanup()
    propertyRestorers.reverse().forEach(restore => restore())
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  const stubProperty = (target: object, key: PropertyKey, value: unknown) => {
    const descriptor = Object.getOwnPropertyDescriptor(target, key)

    Object.defineProperty(target, key, { configurable: true, value })
    propertyRestorers.push(() => {
      if (descriptor) {
        Object.defineProperty(target, key, descriptor)
      } else {
        Reflect.deleteProperty(target, key)
      }
    })
  }

  const installCursorOverlay = (
    points: Array<{ x: number; y: number }>,
    geometry = { availLeft: 0, availTop: 0, screenX: 300, screenY: 200 }
  ) => {
    let sampleIndex = 0
    const control = vi.fn()
    const setBounds = vi.fn()
    const setIgnoreMouse = vi.fn()
    const getCursorPoint = vi.fn(async () => points[Math.min(sampleIndex++, points.length - 1)]!)

    const nudge = vi.fn(async ({ destination }: { destination: { x: number; y: number } }) => ({
      bounds: { height: 196, width: 196, x: destination.x, y: destination.y },
      ok: true
    }))

    const basilOverlay = {
      cancelNudge: vi.fn(),
      control,
      getCursorPoint,
      nudge,
      onExternalTarget: vi.fn((callback: (payload: BasilOverlayExternalTarget) => void) => {
        dispatchExternalTarget = callback

        return () => {}
      }),
      onState: vi.fn(() => () => {}),
      setBounds,
      setIgnoreMouse
    }

    Object.defineProperty(window, 'hermesDesktop', {
      configurable: true,
      value: { basilOverlay }
    })

    stubProperty(window, 'outerHeight', 196)
    stubProperty(window, 'outerWidth', 196)
    stubProperty(window, 'screenX', geometry.screenX)
    stubProperty(window, 'screenY', geometry.screenY)
    stubProperty(window.screen, 'availHeight', 800)
    stubProperty(window.screen, 'availLeft', geometry.availLeft)
    stubProperty(window.screen, 'availTop', geometry.availTop)
    stubProperty(window.screen, 'availWidth', 1200)
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
      () =>
        ({
          bottom: 158,
          height: 120,
          left: 38,
          right: 158,
          toJSON: () => ({}),
          top: 38,
          width: 120,
          x: 38,
          y: 38
        }) as DOMRect
    )

    return { control, getCursorPoint, nudge, setBounds, setIgnoreMouse }
  }

  it('previews a hovered object, engages it after activation, and clears it on dismissal', async () => {
    const { container } = render(<BasilOverlayApp />)

    const target = {
      bounds: { height: 80, width: 120, x: 500, y: 300 },
      className: 'ExplorerListView',
      controlType: 'ListItem',
      intent: 'preview' as const,
      isKeyboardFocusable: false,
      point: { x: 540, y: 330 },
      processId: 99,
      source: 'windows-uia' as const,
      supportsInvoke: false,
      target: 'document' as const
    }

    act(() => dispatchExternalTarget({ ...target, phase: 'preview' }))
    await waitFor(() => expect(container.querySelector('[data-basil-context="document"]')).toBeTruthy())
    expect(container.querySelector('main')?.getAttribute('data-basil-external-phase')).toBe('preview')
    expect(container.querySelector('svg')?.getAttribute('data-basil-focus-intensity')).toBe('0.560')
    expect(container.querySelector('svg')?.getAttribute('data-basil-engagement')).toBe('notice')
    expect(container.querySelector('[data-basil-hand="document"]')?.getAttribute('data-basil-limb-intent')).toBe(
      'consider'
    )
    expect(container.querySelector('[data-basil-transition="anticipation"]')).toBeTruthy()
    expect(container.querySelector('svg')?.getAttribute('data-basil-object-contact')).toBe('-0.333,-0.250')
    expect(container.querySelector('svg')?.getAttribute('data-basil-object-shape')).toBe('compact')

    act(() => dispatchExternalTarget({ ...target, intent: 'activate', phase: 'landed' }))
    await waitFor(() =>
      expect(container.querySelector('svg')?.getAttribute('data-basil-focus-intensity')).toBe('1.000')
    )
    await waitFor(() => expect(container.querySelector('svg')?.getAttribute('data-basil-locomotion')).toBe('land'))
    expect(container.querySelector('main')?.getAttribute('data-basil-external-phase')).toBe('engaged')
    expect(container.querySelector('svg')?.getAttribute('data-basil-engagement')).toBe('act')
    expect(container.querySelector('[data-basil-locomotion-impact]')).toBeTruthy()
    expect(container.querySelector('[data-basil-hand="document"]')?.getAttribute('data-basil-limb-intent')).toBe('hold')

    act(() => dispatchExternalTarget({ ...target, intent: 'activate', phase: 'traverse' }))
    await waitFor(() =>
      expect(container.querySelector('main')?.getAttribute('data-basil-external-phase')).toBe('traverse')
    )
    expect(container.querySelector('[data-basil-context="document"]')).toBeTruthy()

    act(() => dispatchExternalTarget({ ...target, phase: 'dismissed' }))
    await waitFor(() => expect(container.querySelector('[data-basil-context="document"]')).toBeNull())
    expect(container.querySelector('main')?.getAttribute('data-basil-external-phase')).toBe('none')
    expect(container.querySelector('svg')?.getAttribute('data-basil-object-shape')).toBe('')
  })

  it('renders genuine surface scroll progress as target-following contact', async () => {
    const { container } = render(<BasilOverlayApp />)

    const target = {
      activationSource: 'pointer' as const,
      bounds: { height: 520, width: 620, x: 300, y: 120 },
      className: 'TextBox',
      controlType: 'Edit',
      intent: 'scroll' as const,
      isKeyboardFocusable: true,
      movementReason: 'follow' as const,
      point: { x: 920, y: 224 },
      processId: 99,
      scrollDeltaY: 0.2,
      scrollY: 0.2,
      source: 'windows-uia' as const,
      supportsInvoke: false,
      target: 'editor' as const
    }

    act(() => dispatchExternalTarget({ ...target, phase: 'landed' }))
    await waitFor(() =>
      expect(container.querySelector('main')?.getAttribute('data-basil-surface-progress')).toBe('0.2')
    )
    const initialContact = container.querySelector('svg')?.getAttribute('data-basil-object-contact')

    act(() =>
      dispatchExternalTarget({
        ...target,
        phase: 'follow',
        point: { x: 920, y: 510 },
        scrollDeltaY: 0.55,
        scrollY: 0.75
      })
    )

    await waitFor(() =>
      expect(container.querySelector('main')?.getAttribute('data-basil-external-phase')).toBe('approach')
    )
    expect(container.querySelector('main')?.getAttribute('data-basil-focus-target')).toBe('editor')
    expect(container.querySelector('main')?.getAttribute('data-basil-surface-progress')).toBe('0.75')
    expect(container.querySelector('main')?.getAttribute('data-basil-surface-scroll-direction')).toBe('0.55')
    expect(container.querySelector('svg')?.getAttribute('data-basil-object-contact')).not.toBe(initialContact)
    expect(container.querySelector('[data-basil-context="editor"]')).toBeTruthy()
  })

  it('renders privacy-safe keyboard focus as follow movement without agent task semantics', async () => {
    const { container } = render(<BasilOverlayApp />)

    act(() =>
      dispatchExternalTarget({
        activationSource: 'keyboard',
        bounds: { height: 36, width: 120, x: 760, y: 500 },
        className: 'Button',
        controlType: 'Button',
        intent: 'focus',
        isKeyboardFocusable: true,
        movementReason: 'follow',
        phase: 'follow',
        point: { x: 820, y: 518 },
        processId: 99,
        source: 'windows-uia',
        supportsInvoke: true,
        target: 'tool'
      })
    )

    await waitFor(() =>
      expect(container.querySelector('main')?.getAttribute('data-basil-external-phase')).toBe('approach')
    )
    expect(container.querySelector('main')?.getAttribute('data-basil-external-activation')).toBe('keyboard')
    expect(container.querySelector('main')?.getAttribute('data-basil-external-movement')).toBe('follow')
    expect(container.querySelector('main')?.getAttribute('data-basil-focus-target')).toBe('tool')
    expect(container.querySelector('svg')?.getAttribute('data-basil-task-action')).toBe('idle')
  })

  it('renders a real external edit as procedural typing without an agent task phase', async () => {
    const { container } = render(<BasilOverlayApp />)

    act(() =>
      dispatchExternalTarget({
        activationSource: 'content',
        activityIntensity: 0.75,
        bounds: { height: 280, width: 480, x: 420, y: 180 },
        className: 'TextBox',
        controlType: 'Edit',
        intent: 'input',
        isKeyboardFocusable: true,
        movementReason: 'activity',
        phase: 'activity',
        point: { x: 500, y: 260 },
        processId: 99,
        source: 'windows-uia',
        supportsInvoke: false,
        target: 'editor'
      })
    )

    await waitFor(() =>
      expect(container.querySelector('main')?.getAttribute('data-basil-external-activity')).toBe('typing')
    )
    expect(container.querySelector('main')?.getAttribute('data-basil-external-activation')).toBe('content')
    expect(container.querySelector('main')?.getAttribute('data-basil-external-movement')).toBe('activity')
    expect(container.querySelector('svg')?.getAttribute('data-basil-external-activity')).toBe('typing')
    expect(container.querySelector('svg')?.getAttribute('data-basil-external-activity-intensity')).toBe('0.750')
    expect(container.querySelector('svg')?.getAttribute('data-basil-task-action')).toBe('idle')
    expect(container.querySelector('svg')?.getAttribute('data-basil-task-phase')).toBe('idle')

    await waitFor(
      () => expect(container.querySelector('main')?.getAttribute('data-basil-external-activity')).toBe('none'),
      { timeout: 1200 }
    )
  })

  it('renders a real structural selection as a cute confirmation without agent task work', async () => {
    const { container } = render(<BasilOverlayApp />)

    act(() =>
      dispatchExternalTarget({
        activationSource: 'selection',
        activityIntensity: 0.5,
        bounds: { height: 42, width: 260, x: 420, y: 222 },
        className: 'ListBoxItem',
        controlType: 'ListItem',
        intent: 'selection',
        isKeyboardFocusable: true,
        movementReason: 'follow',
        phase: 'follow',
        point: { x: 550, y: 243 },
        processId: 99,
        source: 'windows-uia',
        supportsInvoke: false,
        target: 'document'
      })
    )

    await waitFor(() =>
      expect(container.querySelector('main')?.getAttribute('data-basil-external-activity')).toBe('selecting')
    )
    expect(container.querySelector('main')?.getAttribute('data-basil-external-activation')).toBe('selection')
    expect(container.querySelector('svg')?.getAttribute('data-basil-external-activity')).toBe('selecting')
    expect(container.querySelector('svg')?.getAttribute('data-basil-external-activity-intensity')).toBe('0.500')
    expect(container.querySelector('[data-basil-selection-cue]')).toBeTruthy()
    expect(container.querySelector('svg')?.getAttribute('data-basil-task-action')).toBe('idle')
    expect(container.querySelector('svg')?.getAttribute('data-basil-task-phase')).toBe('idle')

    await waitFor(
      () => expect(container.querySelector('main')?.getAttribute('data-basil-external-activity')).toBe('none'),
      { timeout: 1400 }
    )
  })

  it('renders a real structural control change without reading a value or creating task work', async () => {
    const { container } = render(<BasilOverlayApp />)

    act(() =>
      dispatchExternalTarget({
        activationSource: 'control',
        activityIntensity: 0.5,
        bounds: { height: 44, width: 360, x: 420, y: 300 },
        className: 'Slider',
        controlType: 'Slider',
        intent: 'adjustment',
        isKeyboardFocusable: true,
        movementReason: 'activity',
        phase: 'activity',
        point: { x: 600, y: 322 },
        processId: 99,
        source: 'windows-uia',
        supportsInvoke: false,
        target: 'tool'
      })
    )

    await waitFor(() =>
      expect(container.querySelector('main')?.getAttribute('data-basil-external-activity')).toBe('adjusting')
    )
    expect(container.querySelector('main')?.getAttribute('data-basil-external-activation')).toBe('control')
    expect(container.querySelector('svg')?.getAttribute('data-basil-external-activity')).toBe('adjusting')
    expect(container.querySelector('[data-basil-adjustment-cue]')).toBeTruthy()
    expect(container.querySelector('svg')?.getAttribute('data-basil-task-action')).toBe('idle')
    expect(container.querySelector('svg')?.getAttribute('data-basil-task-phase')).toBe('idle')

    await waitFor(
      () => expect(container.querySelector('main')?.getAttribute('data-basil-external-activity')).toBe('none'),
      { timeout: 1400 }
    )
  })

  it('renders a real collection insertion as organizing motion without agent task work', async () => {
    const { container } = render(<BasilOverlayApp />)

    act(() =>
      dispatchExternalTarget({
        activationSource: 'collection',
        activityIntensity: 0.5,
        activityVariant: 'add',
        bounds: { height: 240, width: 360, x: 420, y: 180 },
        className: 'ListBox',
        controlType: 'ListItem',
        intent: 'structure',
        isKeyboardFocusable: true,
        movementReason: 'activity',
        phase: 'activity',
        point: { x: 600, y: 300 },
        processId: 99,
        source: 'windows-uia',
        supportsInvoke: false,
        target: 'document'
      })
    )

    await waitFor(() =>
      expect(container.querySelector('main')?.getAttribute('data-basil-external-activity')).toBe('organizing')
    )
    expect(container.querySelector('main')?.getAttribute('data-basil-external-activation')).toBe('collection')
    expect(container.querySelector('svg')?.getAttribute('data-basil-external-activity')).toBe('organizing')
    expect(container.querySelector('[data-basil-organizing-cue="add"]')).toBeTruthy()
    expect(container.querySelector('svg')?.getAttribute('data-basil-task-action')).toBe('idle')
    expect(container.querySelector('svg')?.getAttribute('data-basil-task-phase')).toBe('idle')

    await waitFor(
      () => expect(container.querySelector('main')?.getAttribute('data-basil-external-activity')).toBe('none'),
      { timeout: 1400 }
    )
  })

  it('renders a genuine native control invocation without creating agent task work', async () => {
    const { container } = render(<BasilOverlayApp />)

    act(() =>
      dispatchExternalTarget({
        activationSource: 'invocation',
        activityIntensity: 0.25,
        bounds: { height: 44, width: 180, x: 420, y: 300 },
        className: 'Button',
        controlType: 'Button',
        intent: 'invocation',
        isKeyboardFocusable: true,
        movementReason: 'activity',
        phase: 'activity',
        point: { x: 510, y: 322 },
        processId: 99,
        source: 'windows-uia',
        supportsInvoke: true,
        target: 'tool'
      })
    )

    await waitFor(() =>
      expect(container.querySelector('main')?.getAttribute('data-basil-external-activity')).toBe('invoking')
    )
    expect(container.querySelector('main')?.getAttribute('data-basil-external-activation')).toBe('invocation')
    expect(container.querySelector('svg')?.getAttribute('data-basil-external-activity')).toBe('invoking')
    expect(container.querySelector('[data-basil-invocation-cue]')).toBeTruthy()
    expect(container.querySelector('svg')?.getAttribute('data-basil-task-action')).toBe('idle')
    expect(container.querySelector('svg')?.getAttribute('data-basil-task-phase')).toBe('idle')

    await waitFor(
      () => expect(container.querySelector('main')?.getAttribute('data-basil-external-activity')).toBe('none'),
      { timeout: 1400 }
    )
  })

  it('waves goodbye when a genuine external surface disappears, then releases it', async () => {
    const { container } = render(<BasilOverlayApp />)

    act(() =>
      dispatchExternalTarget({
        activationSource: 'pointer',
        bounds: { height: 44, width: 180, x: 420, y: 300 },
        className: 'Button',
        controlType: 'Button',
        intent: 'dismiss',
        isKeyboardFocusable: true,
        movementReason: 'activity',
        phase: 'dismissed',
        point: { x: 510, y: 322 },
        processId: 99,
        source: 'windows-uia',
        supportsInvoke: true,
        target: 'tool'
      })
    )

    await waitFor(() =>
      expect(container.querySelector('main')?.getAttribute('data-basil-external-activity')).toBe('departing')
    )
    expect(container.querySelector('main')?.getAttribute('data-basil-external-activation')).toBe('pointer')
    expect(container.querySelector('[data-basil-departing-cue]')).toBeTruthy()
    expect(container.querySelector('svg')?.getAttribute('data-basil-task-action')).toBe('idle')
    expect(container.querySelector('svg')?.getAttribute('data-basil-task-phase')).toBe('idle')

    await waitFor(
      () => {
        expect(container.querySelector('main')?.getAttribute('data-basil-external-activity')).toBe('none')
        expect(container.querySelector('main')?.getAttribute('data-basil-focus-target')).toBe('rest')
      },
      { timeout: 1400 }
    )
  })

  it('balances during a genuine approved surface resize without creating agent task work', async () => {
    const { container } = render(<BasilOverlayApp />)

    act(() =>
      dispatchExternalTarget({
        activationSource: 'pointer',
        bounds: { height: 300, width: 540, x: 420, y: 240 },
        className: 'TextBox',
        controlType: 'Edit',
        intent: 'resize',
        isKeyboardFocusable: true,
        movementReason: 'follow',
        phase: 'follow',
        point: { x: 690, y: 390 },
        processId: 99,
        source: 'windows-uia',
        supportsInvoke: false,
        target: 'editor'
      })
    )

    await waitFor(() =>
      expect(container.querySelector('main')?.getAttribute('data-basil-external-activity')).toBe('resizing')
    )
    expect(container.querySelector('main')?.getAttribute('data-basil-external-activation')).toBe('pointer')
    expect(container.querySelector('[data-basil-resizing-cue]')).toBeTruthy()
    expect(container.querySelector('svg')?.getAttribute('data-basil-external-activity')).toBe('resizing')
    expect(container.querySelector('svg')?.getAttribute('data-basil-task-action')).toBe('idle')
    expect(container.querySelector('svg')?.getAttribute('data-basil-task-phase')).toBe('idle')

    await waitFor(
      () => expect(container.querySelector('main')?.getAttribute('data-basil-external-activity')).toBe('none'),
      { timeout: 1500 }
    )
  })

  it('surfs a genuine approved surface translation using its live route direction', async () => {
    const { container } = render(<BasilOverlayApp />)

    act(() =>
      dispatchExternalTarget({
        activationSource: 'pointer',
        bounds: { height: 300, width: 540, x: 620, y: 240 },
        className: 'TextBox',
        controlType: 'Edit',
        intent: 'move',
        isKeyboardFocusable: true,
        movementReason: 'follow',
        phase: 'follow',
        point: { x: 890, y: 390 },
        processId: 99,
        routeDirection: { x: 0.9, y: -0.2 },
        source: 'windows-uia',
        supportsInvoke: false,
        target: 'editor'
      })
    )

    await waitFor(() =>
      expect(container.querySelector('main')?.getAttribute('data-basil-external-activity')).toBe('surfing')
    )
    expect(container.querySelector('[data-basil-surfing-cue]')).toBeTruthy()
    expect(container.querySelector('svg')?.getAttribute('data-basil-external-activity')).toBe('surfing')
    expect(container.querySelector('svg')?.getAttribute('data-basil-task-action')).toBe('idle')
    expect(container.querySelector('svg')?.getAttribute('data-basil-task-phase')).toBe('idle')

    await waitFor(
      () => expect(container.querySelector('main')?.getAttribute('data-basil-external-activity')).toBe('none'),
      { timeout: 1500 }
    )
  })

  it('renders acquire, carry, and release from genuine external drag events', async () => {
    const { setBounds, setIgnoreMouse } = installCursorOverlay([{ x: 420, y: 260 }])
    const { container } = render(<BasilOverlayApp />)
    const actor = container.querySelector<HTMLButtonElement>('[data-basil-overlay-actor]')

    expect(actor).toBeTruthy()
    fireEvent.mouseMove(window, { clientX: 80, clientY: 80 })
    await waitFor(() => expect(setIgnoreMouse).toHaveBeenLastCalledWith(false))
    setIgnoreMouse.mockClear()

    const target = {
      activationSource: 'pointer' as const,
      bounds: { height: 48, width: 180, x: 420, y: 260 },
      className: 'ExplorerListView',
      controlType: 'ListItem',
      dragDistance: 160,
      dragVelocity: { x: 0.9, y: 0.1 },
      intent: 'drag_move' as const,
      isKeyboardFocusable: false,
      movementReason: 'assist' as const,
      point: { x: 920, y: 420 },
      processId: 99,
      source: 'windows-uia' as const,
      supportsInvoke: false,
      target: 'document' as const
    }

    const carry = {
      active: true,
      bodyLean: 5.2,
      destination: { height: 196, width: 196, x: 700, y: 340 },
      effort: 0.72,
      gazeX: 0.82,
      gazeY: 0.14,
      grip: 1,
      lift: -8,
      phase: 'carry' as const,
      release: 0,
      side: -1 as const,
      strength: 0.91,
      velocity: { x: 0.9, y: 0.1 }
    }

    act(() => dispatchExternalTarget({ ...target, collaboration: carry, phase: 'dragging' }))

    expect(setIgnoreMouse).toHaveBeenLastCalledWith(true)
    await waitFor(() => expect(container.querySelector('svg')?.getAttribute('data-basil-drag-assist')).toBe('carry'))
    expect(container.querySelector('main')?.getAttribute('data-basil-external-movement')).toBe('assist')
    expect(container.querySelector('main')?.getAttribute('data-basil-collaboration-phase')).toBe('carry')
    expect(container.querySelector('svg')?.getAttribute('data-basil-drag-strength')).toBe('0.910')
    expect(container.querySelector('svg')?.getAttribute('data-basil-drag-grip')).toBe('1.000')
    expect(container.querySelector('[data-basil-drag-assist="carry"]')).toBeTruthy()
    expect(container.querySelector('[data-basil-context="document"]')).toBeTruthy()
    fireEvent.pointerDown(actor!, { button: 0, pointerId: 1, screenX: 920, screenY: 420 })
    fireEvent.pointerMove(actor!, { pointerId: 1, screenX: 1100, screenY: 520 })
    expect(setBounds).not.toHaveBeenCalled()

    const release = { ...carry, effort: 0.2, grip: 0.18, phase: 'release' as const, release: 1, strength: 0.56 }

    act(() =>
      dispatchExternalTarget({
        ...target,
        collaboration: release,
        intent: 'drag_end',
        phase: 'dropped'
      })
    )

    await waitFor(() => expect(container.querySelector('svg')?.getAttribute('data-basil-drag-assist')).toBe('release'))
    expect(container.querySelector('svg')?.getAttribute('data-basil-drag-release')).toBe('1.000')
    expect(container.querySelector('[data-basil-drag-assist="release"]')).toBeTruthy()

    act(() =>
      dispatchExternalTarget({
        ...target,
        collaboration: release,
        intent: 'drag_end',
        phase: 'dismissed'
      })
    )
    await waitFor(() => expect(container.querySelector('g[data-basil-drag-assist]')).toBeNull())
  })

  it('composes a recalled desktop surface with the genuine agent task phase', async () => {
    $basilSnapshot.set({
      lastEvent: {
        id: 'patch-execute',
        kind: 'tool_start',
        label: 'apply_patch',
        scene: { target: 'editor', taskPhase: 'execute' },
        source: 'hermes'
      },
      state: 'writing'
    })

    const { container } = render(<BasilOverlayApp />)

    const target = {
      bounds: { height: 500, width: 700, x: 800, y: 120 },
      className: 'EditorSurface',
      controlType: 'Edit',
      intent: 'activate' as const,
      isKeyboardFocusable: true,
      phase: 'landed' as const,
      point: { x: 960, y: 260 },
      processId: 99,
      source: 'windows-uia' as const,
      supportsInvoke: false,
      target: 'editor' as const
    }

    act(() => dispatchExternalTarget({ ...target, activationSource: 'pointer' }))
    await waitFor(() => expect(container.querySelector('[data-basil-context="editor"]')).toBeTruthy())
    expect(container.querySelector('svg')?.getAttribute('data-basil-task-phase')).toBe('idle')

    act(() => dispatchExternalTarget({ ...target, activationSource: 'agent-event' }))
    await waitFor(() => expect(container.querySelector('svg')?.getAttribute('data-basil-task-phase')).toBe('execute'))
    expect(container.querySelector('svg')?.getAttribute('data-basil-task-action')).toBe('compose')
    expect(container.querySelector('[data-basil-hand="editor"]')?.getAttribute('data-basil-limb-intent')).toBe('type')
  })

  it('follows an actively worked surface without replaying attention or losing the task phase', async () => {
    $basilSnapshot.set({
      lastEvent: {
        id: 'patch-follow',
        kind: 'tool_start',
        label: 'apply_patch',
        scene: { target: 'editor', taskPhase: 'execute' },
        source: 'hermes'
      },
      state: 'writing'
    })

    const { container } = render(<BasilOverlayApp />)

    const target = {
      activationSource: 'agent-event' as const,
      bounds: { height: 500, width: 700, x: 800, y: 120 },
      className: 'EditorSurface',
      controlType: 'Edit',
      intent: 'activate' as const,
      isKeyboardFocusable: true,
      movementReason: 'visit' as const,
      phase: 'landed' as const,
      point: { x: 960, y: 260 },
      processId: 99,
      source: 'windows-uia' as const,
      supportsInvoke: false,
      target: 'editor' as const
    }

    act(() => dispatchExternalTarget(target))
    await waitFor(() => expect(container.querySelector('svg')?.getAttribute('data-basil-task-action')).toBe('compose'))

    act(() =>
      dispatchExternalTarget({
        ...target,
        bounds: { ...target.bounds, x: 420, y: 220 },
        movementReason: 'follow',
        phase: 'follow',
        point: { x: 580, y: 360 },
        routeDirection: { x: -1, y: 0 },
        routeStep: 0
      })
    )

    await waitFor(() =>
      expect(container.querySelector('main')?.getAttribute('data-basil-external-phase')).toBe('approach')
    )
    expect(container.querySelector('main')?.getAttribute('data-basil-external-movement')).toBe('follow')
    expect(container.querySelector('svg')?.getAttribute('data-basil-task-phase')).toBe('execute')
    expect(container.querySelector('svg')?.getAttribute('data-basil-task-action')).toBe('compose')
    expect(container.querySelector('svg')?.getAttribute('data-basil-familiarity')).toBe('0.000')
    expect(container.querySelector('svg')?.getAttribute('data-basil-handoff-target')).toBe('')

    act(() =>
      dispatchExternalTarget({
        ...target,
        bounds: { ...target.bounds, x: 420, y: 220 },
        movementReason: 'follow',
        point: { x: 580, y: 360 }
      })
    )

    await waitFor(() =>
      expect(container.querySelector('main')?.getAttribute('data-basil-external-phase')).toBe('engaged')
    )
    expect(container.querySelector('main')?.getAttribute('data-basil-external-movement')).toBe('follow')
    expect(container.querySelector('svg')?.getAttribute('data-basil-task-action')).toBe('compose')
    expect(container.querySelector('svg')?.getAttribute('data-basil-handoff-target')).toBe('')
  })

  it('carries the previous surface work into the next genuine target', async () => {
    const { container } = render(<BasilOverlayApp />)

    const base = {
      bounds: { height: 260, width: 420, x: 300, y: 180 },
      className: 'Editor',
      controlType: 'Edit',
      intent: 'activate' as const,
      isKeyboardFocusable: true,
      point: { x: 500, y: 260 },
      processId: 99,
      source: 'windows-uia' as const,
      supportsInvoke: false
    }

    act(() => dispatchExternalTarget({ ...base, phase: 'travel', target: 'editor' }))
    await waitFor(() => expect(container.querySelector('[data-basil-context="editor"]')).toBeTruthy())
    expect(container.querySelector('svg')?.getAttribute('data-basil-engagement')).toBe('prepare')
    expect(container.querySelector('[data-basil-hand="editor"]')?.getAttribute('data-basil-limb-intent')).toBe('reach')

    act(() =>
      dispatchExternalTarget({
        ...base,
        bounds: { height: 260, width: 500, x: 820, y: 180 },
        className: 'CASCADIA_HOSTING_WINDOW_CLASS',
        controlType: 'Pane',
        phase: 'travel',
        point: { x: 900, y: 260 },
        target: 'terminal'
      })
    )

    await waitFor(() => expect(container.querySelector('[data-basil-carried-work="code"]')).toBeTruthy())
    expect(container.querySelector('[data-basil-carried-work="code"]')?.getAttribute('data-basil-handoff-route')).toBe(
      'editor:terminal'
    )
    expect(container.querySelector('svg')?.getAttribute('data-basil-handoff-target')).toBe('terminal')
    expect(container.querySelector('svg')?.getAttribute('data-basil-object-contact')).toBe('-0.680,-0.385')
    expect(container.querySelector('svg')?.getAttribute('data-basil-object-shape')).toBe('wide')
  })

  it('mirrors a genuine multi-object journey into the detached renderer', async () => {
    $basilSnapshot.set({
      journey: {
        currentTarget: 'terminal',
        eventKey: 'opaque-event',
        previousTarget: 'editor',
        sessionKey: 'opaque-session',
        status: 'active',
        stepCount: 3,
        trail: ['document', 'editor', 'terminal'],
        transition: 'advance',
        visitedTargets: ['document', 'editor', 'terminal']
      },
      lastEvent: {
        id: 'journey',
        kind: 'tool_start',
        scene: { target: 'terminal', taskPhase: 'execute' },
        source: 'hermes'
      },
      state: 'using_tool'
    })

    const { container } = render(<BasilOverlayApp />)

    act(() =>
      dispatchExternalTarget({
        activationSource: 'agent-event',
        bounds: { height: 320, width: 620, x: 720, y: 160 },
        className: 'CASCADIA_HOSTING_WINDOW_CLASS',
        controlType: 'Pane',
        intent: 'activate',
        isKeyboardFocusable: true,
        phase: 'landed',
        point: { x: 900, y: 260 },
        processId: 77,
        source: 'windows-uia',
        supportsInvoke: false,
        target: 'terminal'
      })
    )

    await waitFor(() => expect(container.querySelector('svg')?.getAttribute('data-basil-journey-step-count')).toBe('3'))
    expect(container.querySelector('svg')?.getAttribute('data-basil-journey-status')).toBe('active')
    expect(container.querySelectorAll('[data-basil-journey-target]')).toHaveLength(3)
    expect(container.querySelector('svg')?.getAttribute('data-basil-task-action')).toBe('run')
  })

  it('turns at native route waypoints without recording duplicate attention visits', async () => {
    const { container } = render(<BasilOverlayApp />)

    const target = {
      bounds: { height: 420, width: 520, x: 760, y: 160 },
      className: 'Editor',
      controlType: 'Edit',
      intent: 'activate' as const,
      isKeyboardFocusable: true,
      phase: 'travel' as const,
      point: { x: 900, y: 260 },
      processId: 99,
      source: 'windows-uia' as const,
      supportsInvoke: false,
      target: 'editor' as const
    }

    act(() =>
      dispatchExternalTarget({
        ...target,
        routeDirection: { x: 1, y: 0 },
        routeStep: 0
      })
    )

    await waitFor(() =>
      expect(container.querySelector('svg')?.getAttribute('data-basil-attention-direction')).toBe('1.000,0.000')
    )
    expect(container.querySelector('svg')?.getAttribute('data-basil-familiarity')).toBe('0.000')

    act(() =>
      dispatchExternalTarget({
        ...target,
        routeDirection: { x: 0, y: -1 },
        routeStep: 1
      })
    )

    await waitFor(() =>
      expect(container.querySelector('svg')?.getAttribute('data-basil-attention-direction')).toBe('0.000,-1.000')
    )
    expect(container.querySelector('svg')?.getAttribute('data-basil-familiarity')).toBe('0.000')
    expect(container.querySelector('svg')?.getAttribute('data-basil-engagement')).toBe('prepare')
  })

  it('requests one multi-monitor-safe window move after a deliberate desktop swipe', async () => {
    const centerY = 298
    const points = [-1672, -1592, -1512, -1432, -1352].map(x => ({ x, y: centerY }))

    const { getCursorPoint, nudge, setBounds } = installCursorOverlay(points, {
      availLeft: -1920,
      availTop: 0,
      screenX: -1600,
      screenY: 200
    })

    render(<BasilOverlayApp />)

    await waitFor(() => expect(getCursorPoint).toHaveBeenCalledTimes(5), { timeout: 1500 })
    await waitFor(
      () =>
        expect(nudge).toHaveBeenCalledWith({
          destination: { x: -1420, y: 200 }
        }),
      { timeout: 1500 }
    )

    expect(nudge).toHaveBeenCalledOnce()
    expect(setBounds).not.toHaveBeenCalled()
  })

  it('renders held and release poses while the user repositions the detached actor', async () => {
    const points = Array.from({ length: 20 }, () => ({ x: 720, y: 560 }))
    const { control, setBounds } = installCursorOverlay(points)
    const { container } = render(<BasilOverlayApp />)
    const actor = container.querySelector<HTMLButtonElement>('[data-basil-overlay-actor]')!

    actor.setPointerCapture = vi.fn()
    actor.releasePointerCapture = vi.fn()

    fireEvent.pointerDown(actor, { button: 0, pointerId: 41, screenX: 390, screenY: 270 })
    fireEvent.pointerMove(actor, { buttons: 1, pointerId: 41, screenX: 540, screenY: 360 })

    await waitFor(() => expect(container.querySelector('svg')?.getAttribute('data-basil-actor-drag')).toBe('held'))
    expect(container.querySelector('svg')?.getAttribute('data-basil-locomotion')).toBe('grounded')
    expect(container.querySelector('[data-basil-actor-drag-cue="held"]')).toBeTruthy()
    expect(setBounds).toHaveBeenCalledWith({
      height: 196,
      width: 196,
      x: 450,
      y: 290
    })

    fireEvent.pointerUp(actor, { button: 0, pointerId: 41, screenX: 540, screenY: 360 })

    await waitFor(() => expect(container.querySelector('svg')?.getAttribute('data-basil-actor-drag')).toBe('release'))
    expect(container.querySelector('[data-basil-actor-drag-cue="release"]')).toBeTruthy()
    expect(control).toHaveBeenCalledWith({
      bounds: {
        height: 196,
        width: 196,
        x: 450,
        y: 290
      },
      type: 'bounds'
    })
  })

  it('boops on a genuine double-click while preserving the overlay app toggle', async () => {
    const points = Array.from({ length: 12 }, () => ({ x: 720, y: 560 }))
    const { control } = installCursorOverlay(points)
    const { container } = render(<BasilOverlayApp />)
    const actor = container.querySelector<HTMLButtonElement>('[data-basil-overlay-actor]')!

    fireEvent.doubleClick(actor)

    await waitFor(() =>
      expect(Number(container.querySelector('svg')?.getAttribute('data-basil-pointer-boop'))).toBeGreaterThan(0.5)
    )
    expect(container.querySelector('[data-basil-pointer-reaction="boop"]')).toBeTruthy()
    expect(control).toHaveBeenCalledWith({ type: 'toggle-app' })
  })

  it('tickles from genuine wheel input in the detached renderer', async () => {
    const points = Array.from({ length: 12 }, () => ({ x: 720, y: 560 }))
    installCursorOverlay(points)
    const { container } = render(<BasilOverlayApp />)
    const actor = container.querySelector<HTMLButtonElement>('[data-basil-overlay-actor]')!

    fireEvent.wheel(actor, { deltaY: 100 })

    await waitFor(() =>
      expect(Number(container.querySelector('svg')?.getAttribute('data-basil-pointer-tickle'))).toBeGreaterThan(0.4)
    )
    expect(container.querySelector('[data-basil-pointer-reaction="tickle"]')).toBeTruthy()
    expect(container.querySelector('svg')?.getAttribute('data-basil-pointer-tickle-direction')).toBe('1.000')
  })

  it('recognizes genuine crown petting in the detached desktop renderer', async () => {
    const strokes = [370, 430, 372, 432, 374, 429, 376, 426]
    const points = strokes.flatMap(x => Array.from({ length: 2 }, () => ({ x, y: 263 })))
    const { getCursorPoint, nudge } = installCursorOverlay(points)
    const { container } = render(<BasilOverlayApp />)

    await waitFor(
      () => expect(Number(container.querySelector('svg')?.getAttribute('data-basil-pointer-pet'))).toBeGreaterThan(0.32),
      { timeout: 4000 }
    )

    expect(container.querySelector('[data-basil-pointer-reaction="petting"]')).toBeTruthy()
    expect(getCursorPoint.mock.calls.length).toBeGreaterThanOrEqual(8)
    expect(nudge).not.toHaveBeenCalled()
  })

  it('keeps active work anchored when the same desktop swipe crosses Basil', async () => {
    $basilSnapshot.set({ state: 'writing' })

    const centerY = 298
    const points = [228, 308, 388, 468, 548].map(x => ({ x, y: centerY }))
    const { getCursorPoint, nudge, setBounds } = installCursorOverlay(points)

    render(<BasilOverlayApp />)

    await waitFor(() => expect(getCursorPoint.mock.calls.length).toBeGreaterThanOrEqual(8), { timeout: 4000 })

    expect(setBounds).not.toHaveBeenCalled()
    expect(nudge).not.toHaveBeenCalled()
  })

  it('yields the native overlay when the real desktop pointer obstructs active work', async () => {
    const points = Array.from({ length: 12 }, () => ({ x: 400, y: 300 }))
    const { nudge, setIgnoreMouse } = installCursorOverlay(points)
    const { container } = render(<BasilOverlayApp />)

    act(() =>
      dispatchExternalTarget({
        activationSource: 'pointer',
        bounds: { height: 420, width: 300, x: 500, y: 160 },
        className: 'EditorSurface',
        controlType: 'Edit',
        intent: 'activate',
        isKeyboardFocusable: true,
        phase: 'landed',
        point: { x: 620, y: 320 },
        processId: 99,
        source: 'windows-uia',
        supportsInvoke: false,
        target: 'editor'
      })
    )

    await waitFor(() => expect(nudge).toHaveBeenCalled(), { timeout: 1800 })
    expect(nudge.mock.calls[0]?.[0].destination).not.toEqual({ x: 300, y: 200 })
    expect(setIgnoreMouse).toHaveBeenLastCalledWith(true)
    expect(container.querySelector('main')?.getAttribute('data-basil-workspace-coordination')).toBe('yield')
    expect(container.querySelector('[data-basil-workspace-cue="after-you"]')).toBeTruthy()
    expect(
      Number(container.querySelector('svg')?.getAttribute('data-basil-workspace-pointer-clearance'))
    ).toBeGreaterThan(
      Number(container.querySelector('svg')?.getAttribute('data-basil-workspace-current-clearance')) + 22
    )
  })

  it('lets an explicit swipe dismiss passive object preview attention', async () => {
    const centerY = 298
    const points = [228, 308, 388, 468, 548].map(x => ({ x, y: centerY }))
    const { getCursorPoint, nudge } = installCursorOverlay(points)
    const { container } = render(<BasilOverlayApp />)

    act(() =>
      dispatchExternalTarget({
        bounds: { height: 280, width: 420, x: 500, y: 180 },
        className: 'ExplorerListView',
        controlType: 'ListItem',
        intent: 'preview',
        isKeyboardFocusable: false,
        phase: 'preview',
        point: { x: 620, y: 260 },
        processId: 99,
        source: 'windows-uia',
        supportsInvoke: false,
        target: 'document'
      })
    )

    expect(container.querySelector('main')?.getAttribute('data-basil-external-phase')).toBe('preview')
    await waitFor(() => expect(getCursorPoint).toHaveBeenCalledTimes(5), { timeout: 1500 })
    await waitFor(() => expect(nudge).toHaveBeenCalledOnce(), { timeout: 1500 })
    await waitFor(() => expect(container.querySelector('main')?.getAttribute('data-basil-external-phase')).toBe('none'))
  })
})
