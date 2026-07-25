import { describe, expect, it } from 'vitest'

import {
  basilExternalTargetsShareSurface,
  clampOverlayDestination,
  classifyWindowsControl,
  classifyWindowsControlType,
  externalTargetBelongsToApp,
  overlaySurfaceTraversalFrame,
  overlayTravelFrame,
  parseWindowsAutomationLine,
  placeOverlayBesideTarget,
  planOverlayTravelRoute,
  sampleOverlayTravelRoute,
  shouldFollowBasilExternalFocus,
  shouldFollowBasilExternalSelection,
  shouldSuppressBasilExternalPreview,
  surfaceProgressDestination,
  surfaceTraversalDestination
} from './basil-external-scene'

describe('Basil external scene adapter', () => {
  it('maps Windows UI controls to generic Basil scene targets', () => {
    expect(classifyWindowsControlType('ControlType.Hyperlink')).toBe('web')
    expect(classifyWindowsControlType('ControlType.TreeItem')).toBe('folder')
    expect(classifyWindowsControlType('ControlType.Edit')).toBe('editor')
    expect(classifyWindowsControlType('ControlType.Image')).toBe('image')
    expect(classifyWindowsControlType('ControlType.DataItem')).toBe('data')
    expect(classifyWindowsControlType('ControlType.Button')).toBe('tool')
    expect(classifyWindowsControlType('ControlType.Pane')).toBe('conversation')
    expect(classifyWindowsControl('ControlType.Pane', 'WindowsForms10.SysTreeView32.app')).toBe('folder')
    expect(classifyWindowsControl('ControlType.Pane', 'WindowsForms10.BUTTON.app')).toBe('tool')
    expect(classifyWindowsControl('ControlType.Pane', 'WindowsForms10.STATIC.app', true)).toBe('web')
    expect(classifyWindowsControl('ControlType.Pane', 'WindowsForms10.STATIC.app', false, true)).toBe('web')
    expect(classifyWindowsControl('ControlType.Pane', 'CASCADIA_HOSTING_WINDOW_CLASS')).toBe('terminal')
    expect(classifyWindowsControl('ControlType.Pane', 'EXCEL7')).toBe('data')
    expect(classifyWindowsControl('ControlType.Pane', 'PhotoThumbnailHost')).toBe('image')
  })

  it('accepts geometry-only UIA messages without requiring desktop text', () => {
    expect(
      parseWindowsAutomationLine(
        JSON.stringify({
          controlType: 'ControlType.ListItem',
          className: 'ExplorerListView',
          height: 48,
          intent: 'preview',
          isKeyboardFocusable: false,
          left: 120,
          processId: 44,
          supportsInvoke: false,
          top: 240,
          width: 180,
          x: 150,
          y: 260
        })
      )
    ).toEqual({
      bounds: { height: 48, width: 180, x: 120, y: 240 },
      className: 'ExplorerListView',
      controlType: 'ListItem',
      isKeyboardFocusable: false,
      intent: 'preview',
      obstacles: [],
      point: { x: 150, y: 260 },
      processId: 44,
      source: 'windows-uia',
      supportsInvoke: false,
      target: 'document'
    })
    expect(parseWindowsAutomationLine('{bad json')).toBeNull()
  })

  it('parses refresh geometry without treating it as a new activation', () => {
    expect(
      parseWindowsAutomationLine(
        JSON.stringify({
          className: 'EditorSurface',
          controlType: 'ControlType.Edit',
          height: 520,
          intent: 'refresh',
          isKeyboardFocusable: true,
          left: 940,
          processId: 42,
          supportsInvoke: false,
          top: 160,
          width: 720,
          x: 1040,
          y: 260
        })
      )
    ).toMatchObject({
      bounds: { height: 520, width: 720, x: 940, y: 160 },
      intent: 'refresh',
      target: 'editor'
    })
  })

  it('normalizes privacy-safe UIA scroll percentages and direction', () => {
    expect(
      parseWindowsAutomationLine(
        JSON.stringify({
          className: 'TextBox',
          controlType: 'ControlType.Edit',
          height: 520,
          intent: 'scroll',
          isKeyboardFocusable: true,
          left: 940,
          processId: 42,
          scrollDeltaX: 0,
          scrollDeltaY: 12.5,
          scrollX: -1,
          scrollY: 64.25,
          supportsInvoke: false,
          top: 160,
          width: 720,
          x: 1040,
          y: 260
        })
      )
    ).toMatchObject({
      intent: 'scroll',
      scrollDeltaX: 0,
      scrollDeltaY: 0.125,
      scrollY: 0.6425,
      target: 'editor'
    })

    expect(
      parseWindowsAutomationLine(
        JSON.stringify({
          className: 'TextBox',
          controlType: 'ControlType.Edit',
          height: 520,
          intent: 'scroll',
          left: 940,
          processId: 42,
          scrollDeltaY: -140,
          scrollY: 180,
          top: 160,
          width: 720,
          x: 1040,
          y: 260
        })
      )
    ).toMatchObject({ scrollDeltaY: -1, scrollY: 1 })
  })

  it('parses structural keyboard focus without desktop content', () => {
    expect(
      parseWindowsAutomationLine(
        JSON.stringify({
          className: 'Button',
          controlType: 'ControlType.Button',
          height: 36,
          intent: 'focus',
          isKeyboardFocusable: true,
          left: 760,
          processId: 42,
          supportsInvoke: true,
          top: 220,
          width: 120,
          x: 820,
          y: 238
        })
      )
    ).toMatchObject({
      bounds: { height: 36, width: 120, x: 760, y: 220 },
      intent: 'focus',
      point: { x: 820, y: 238 },
      target: 'tool'
    })
  })

  it('normalizes aggregate structural edit activity without changed text', () => {
    expect(
      parseWindowsAutomationLine(
        JSON.stringify({
          activityCount: 3,
          className: 'TextBox',
          controlType: 'ControlType.Edit',
          height: 280,
          intent: 'input',
          isKeyboardFocusable: true,
          left: 420,
          processId: 42,
          top: 180,
          width: 480,
          x: 500,
          y: 260
        })
      )
    ).toMatchObject({
      activityIntensity: 0.75,
      intent: 'input',
      target: 'editor'
    })
  })

  it('normalizes aggregate control activity without old or new values', () => {
    expect(
      parseWindowsAutomationLine(
        JSON.stringify({
          activityCount: 2,
          className: 'Slider',
          controlType: 'ControlType.Slider',
          height: 44,
          intent: 'adjustment',
          isKeyboardFocusable: true,
          left: 420,
          processId: 42,
          top: 300,
          width: 360,
          x: 600,
          y: 322
        })
      )
    ).toMatchObject({
      activityIntensity: 0.5,
      intent: 'adjustment',
      point: { x: 600, y: 322 },
      target: 'tool'
    })
  })

  it('normalizes a genuine structural control invocation without a label', () => {
    expect(
      parseWindowsAutomationLine(
        JSON.stringify({
          activityCount: 1,
          className: 'Button',
          controlType: 'ControlType.Button',
          height: 44,
          intent: 'invocation',
          isKeyboardFocusable: true,
          left: 420,
          processId: 42,
          top: 300,
          width: 180,
          x: 510,
          y: 322
        })
      )
    ).toMatchObject({
      activityIntensity: 0.25,
      intent: 'invocation',
      point: { x: 510, y: 322 },
      target: 'tool'
    })
  })

  it('parses cached structural dismissal without desktop content', () => {
    expect(
      parseWindowsAutomationLine(
        JSON.stringify({
          className: 'Button',
          controlType: 'ControlType.Button',
          height: 44,
          intent: 'dismiss',
          isKeyboardFocusable: true,
          left: 420,
          processId: 42,
          top: 300,
          width: 180,
          x: 510,
          y: 322
        })
      )
    ).toMatchObject({
      bounds: { height: 44, width: 180, x: 420, y: 300 },
      intent: 'dismiss',
      processId: 42,
      target: 'tool'
    })
  })

  it('maps privacy-safe collection structure categories to organizing variants', () => {
    const variants = [
      ['ChildAdded', 'add'],
      ['ChildrenBulkAdded', 'add'],
      ['ChildRemoved', 'remove'],
      ['ChildrenBulkRemoved', 'remove'],
      ['ChildrenReordered', 'reorder']
    ] as const

    for (const [structureKind, activityVariant] of variants) {
      expect(
        parseWindowsAutomationLine(
          JSON.stringify({
            activityCount: 2,
            className: 'ListBox',
            controlType: 'ControlType.ListItem',
            height: 240,
            intent: 'structure',
            isKeyboardFocusable: true,
            left: 420,
            processId: 42,
            structureKind,
            top: 180,
            width: 360,
            x: 600,
            y: 300
          })
        )
      ).toMatchObject({
        activityIntensity: 0.5,
        activityVariant,
        intent: 'structure',
        target: 'document'
      })
    }
  })

  it('normalizes structural selection activity without selected item content', () => {
    expect(
      parseWindowsAutomationLine(
        JSON.stringify({
          activityCount: 2,
          className: 'ListBoxItem',
          controlType: 'ControlType.ListItem',
          height: 42,
          intent: 'selection',
          isKeyboardFocusable: true,
          left: 420,
          processId: 42,
          top: 222,
          width: 260,
          x: 550,
          y: 243
        })
      )
    ).toMatchObject({
      activityIntensity: 0.5,
      bounds: { height: 42, width: 260, x: 420, y: 222 },
      intent: 'selection',
      point: { x: 550, y: 243 },
      target: 'document'
    })
  })

  it('follows only changed keyboard-focusable controls in the active process', () => {
    const active = parseWindowsAutomationLine(
      JSON.stringify({
        className: 'TextBox',
        controlType: 'ControlType.Edit',
        height: 280,
        intent: 'activate',
        isKeyboardFocusable: true,
        left: 420,
        processId: 42,
        top: 180,
        width: 480,
        x: 500,
        y: 260
      })
    )

    const focused = parseWindowsAutomationLine(
      JSON.stringify({
        className: 'Button',
        controlType: 'ControlType.Button',
        height: 36,
        intent: 'focus',
        isKeyboardFocusable: true,
        left: 760,
        processId: 42,
        top: 500,
        width: 120,
        x: 820,
        y: 518
      })
    )

    expect(shouldFollowBasilExternalFocus(active, focused)).toBe(true)
    expect(shouldFollowBasilExternalFocus(active, focused && { ...focused, processId: 9 })).toBe(false)
    expect(shouldFollowBasilExternalFocus(active, focused && { ...focused, isKeyboardFocusable: false })).toBe(false)
    expect(
      shouldFollowBasilExternalFocus(
        active,
        active && {
          ...active,
          intent: 'focus'
        }
      )
    ).toBe(false)
  })

  it('follows changed structural selections only inside the active process', () => {
    const active = parseWindowsAutomationLine(
      JSON.stringify({
        className: 'ListBox',
        controlType: 'ControlType.List',
        height: 320,
        intent: 'activate',
        isKeyboardFocusable: true,
        left: 420,
        processId: 42,
        top: 180,
        width: 300,
        x: 500,
        y: 220
      })
    )

    const selected = parseWindowsAutomationLine(
      JSON.stringify({
        activityCount: 1,
        className: 'ListBoxItem',
        controlType: 'ControlType.ListItem',
        height: 42,
        intent: 'selection',
        isKeyboardFocusable: true,
        left: 430,
        processId: 42,
        top: 250,
        width: 280,
        x: 570,
        y: 271
      })
    )

    expect(shouldFollowBasilExternalSelection(active, selected)).toBe(true)
    expect(shouldFollowBasilExternalSelection(active, selected && { ...selected, processId: 9 })).toBe(false)
    expect(shouldFollowBasilExternalSelection(selected, selected && { ...selected, target: 'conversation' })).toBe(
      false
    )
  })

  it('parses visible-window geometry without desktop titles or content', () => {
    const target = parseWindowsAutomationLine(
      JSON.stringify({
        className: 'Editor',
        controlType: 'ControlType.Edit',
        height: 420,
        intent: 'activate',
        left: 900,
        obstacles: [
          { height: 320, left: 420, processId: 77, top: 180, width: 300 },
          { height: 8, left: 10, processId: 88, top: 10, width: 8 },
          { height: 'bad', left: 10, processId: 99, top: 10, width: 80 }
        ],
        processId: 66,
        top: 140,
        width: 420,
        x: 980,
        y: 260
      })
    )

    expect(target?.obstacles).toEqual([
      {
        bounds: { height: 320, width: 300, x: 420, y: 180 },
        processId: 77
      }
    ])
  })

  it('defaults older click messages to activation intent', () => {
    const target = parseWindowsAutomationLine(
      JSON.stringify({
        className: 'Button',
        controlType: 'ControlType.Button',
        height: 32,
        left: 10,
        processId: 90,
        top: 20,
        width: 90,
        x: 20,
        y: 30
      })
    )

    expect(target?.intent).toBe('activate')
  })

  it('parses bounded privacy-safe drag geometry and velocity', () => {
    const target = parseWindowsAutomationLine(
      JSON.stringify({
        className: 'ExplorerListView',
        controlType: 'ControlType.ListItem',
        dragDistance: 184.5,
        dragVelocityX: 1.8,
        dragVelocityY: -0.42,
        height: 42,
        intent: 'drag_move',
        left: 200,
        processId: 90,
        top: 240,
        width: 180,
        x: 820,
        y: 420
      })
    )

    expect(target).toMatchObject({
      dragDistance: 184.5,
      dragVelocity: { x: 1, y: -0.42 },
      intent: 'drag_move',
      point: { x: 820, y: 420 },
      target: 'document'
    })
  })

  it('uses process ownership instead of overlapping window rectangles', () => {
    expect(externalTargetBelongsToApp(91, [12, 91, 120])).toBe(true)
    expect(externalTargetBelongsToApp(77, [12, 91, 120])).toBe(false)
  })

  it('recognizes only the exact active structural surface for redundant-preview suppression', () => {
    const active = {
      bounds: { height: 520, width: 620, x: 300, y: 120 },
      processId: 42,
      target: 'editor' as const
    }

    expect(basilExternalTargetsShareSurface({ ...active, bounds: { ...active.bounds, x: 301 } }, active)).toBe(true)
    expect(basilExternalTargetsShareSurface({ ...active, bounds: { ...active.bounds, x: 310 } }, active)).toBe(false)
    expect(basilExternalTargetsShareSurface({ ...active, processId: 43 }, active)).toBe(false)
    expect(basilExternalTargetsShareSurface({ ...active, target: 'document' }, active)).toBe(false)
  })

  it('requires genuine pointer movement before previewing a surface revealed by workspace yield', () => {
    const yieldedAt = { x: 1171.2, y: 271.2 }

    expect(shouldSuppressBasilExternalPreview(yieldedAt, yieldedAt)).toBe(true)
    expect(shouldSuppressBasilExternalPreview({ x: 1174.2, y: 275.2 }, yieldedAt)).toBe(true)
    expect(shouldSuppressBasilExternalPreview({ x: 1177.2, y: 271.2 }, yieldedAt)).toBe(false)
    expect(shouldSuppressBasilExternalPreview(yieldedAt, null)).toBe(false)
  })

  it('places Basil beside the object and flips at the screen edge', () => {
    const overlay = { height: 196, width: 196, x: 0, y: 0 }
    const workArea = { height: 900, width: 1440, x: 0, y: 0 }

    expect(placeOverlayBesideTarget({ height: 80, width: 120, x: 200, y: 300 }, overlay, workArea).x).toBe(298)
    expect(placeOverlayBesideTarget({ height: 80, width: 120, x: 1320, y: 300 }, overlay, workArea).x).toBe(1146)
  })

  it('clamps a nudged overlay inside a negative-coordinate monitor work area', () => {
    const overlay = { height: 196, width: 196, x: -1600, y: 200 }
    const workArea = { height: 900, width: 1600, x: -1600, y: 0 }

    expect(clampOverlayDestination({ x: -1810, y: 940 }, overlay, workArea)).toEqual({
      height: 196,
      width: 196,
      x: -1600,
      y: 704
    })
    expect(clampOverlayDestination({ x: -420, y: 120 }, overlay, workArea).x).toBe(-420)
  })

  it('maps genuine scroll progress along Basil existing safe surface edge', () => {
    const target = { height: 520, width: 620, x: 300, y: 120 }
    const workArea = { height: 900, width: 1440, x: 0, y: 0 }
    const rightSide = { height: 220, width: 220, x: 946, y: 150 }

    const start = surfaceProgressDestination(target, rightSide, workArea, 0)
    const middle = surfaceProgressDestination(target, rightSide, workArea, 0.5)
    const end = surfaceProgressDestination(target, rightSide, workArea, 1)

    expect(start.side).toBe('right')
    expect(start.destination.x).toBe(middle.destination.x)
    expect(middle.destination.x).toBe(end.destination.x)
    expect([start.point.y, middle.point.y, end.point.y]).toEqual([120, 380, 640])
    expect(start.destination.y).toBeLessThan(middle.destination.y)
    expect(middle.destination.y).toBeLessThan(end.destination.y)
  })

  it('preserves an above-surface placement while horizontal progress advances', () => {
    const target = { height: 300, width: 700, x: 260, y: 280 }
    const workArea = { height: 900, width: 1440, x: 0, y: 0 }
    const above = { height: 220, width: 220, x: 520, y: 20 }
    const result = surfaceProgressDestination(target, above, workArea, 0.75)

    expect(result.side).toBe('above')
    expect(result.point).toEqual({ x: 785, y: 280 })
    expect(result.destination.y).toBe(94)
  })

  it('uses vertical placement for a wide object and avoids crowding the click point', () => {
    const overlay = { height: 196, width: 196, x: 0, y: 0 }
    const workArea = { height: 900, width: 1000, x: 0, y: 0 }

    const wide = placeOverlayBesideTarget({ height: 60, width: 1000, x: 0, y: 300 }, overlay, workArea, 120, 16, {
      x: 500,
      y: 330
    })

    expect(wide.y).toBeLessThan(164)

    const pointerOnRight = placeOverlayBesideTarget(
      { height: 80, width: 100, x: 400, y: 300 },
      overlay,
      workArea,
      120,
      16,
      { x: 576, y: 340 }
    )

    expect(pointerOnRight.x).toBeLessThan(400)
  })

  it('travels on a smooth lifted arc and lands exactly', () => {
    const start = { height: 196, width: 196, x: 100, y: 400 }
    const destination = { height: 196, width: 196, x: 700, y: 400 }
    const middle = overlayTravelFrame(start, destination, 0.5)

    expect(middle.x).toBe(400)
    expect(middle.y).toBeLessThan(400)
    expect(overlayTravelFrame(start, destination, 1)).toEqual(destination)
  })

  it('routes the visible overlay actor around another desktop window', () => {
    const start = { height: 196, width: 196, x: 30, y: 330 }
    const destination = { height: 196, width: 196, x: 1120, y: 340 }

    const obstacle = {
      bounds: { height: 360, width: 320, x: 470, y: 170 },
      processId: 77
    }

    const route = planOverlayTravelRoute(start, destination, { height: 900, width: 1440, x: 0, y: 0 }, [obstacle])

    expect(route.obstructed).toBe(true)
    expect(route.points.length).toBeGreaterThan(2)
    expect(route.obstacleIds).toEqual(['77:0'])

    for (let frame = 0; frame <= 1000; frame += 1) {
      const sample = sampleOverlayTravelRoute(route, frame / 1000)

      const actor = {
        bottom: sample.bounds.y + 38 + 120,
        left: sample.bounds.x + 38,
        right: sample.bounds.x + 38 + 120,
        top: sample.bounds.y + 38
      }

      const overlaps =
        actor.left < obstacle.bounds.x + obstacle.bounds.width &&
        actor.right > obstacle.bounds.x &&
        actor.top < obstacle.bounds.y + obstacle.bounds.height &&
        actor.bottom > obstacle.bounds.y

      expect(overlaps).toBe(false)
    }

    expect(sampleOverlayTravelRoute(route, 1).bounds).toEqual(destination)
  })

  it('routes a workspace yield around the active asset instead of crossing its content', () => {
    const target = { height: 400, width: 300, x: 400, y: 180 }
    const start = { height: 196, width: 196, x: 678, y: 282 }
    const destination = { height: 196, width: 196, x: 228, y: 282 }
    const inset = 6

    const route = planOverlayTravelRoute(
      start,
      destination,
      { height: 900, width: 1440, x: 0, y: 0 },
      [
        {
          bounds: {
            height: target.height - inset * 2,
            width: target.width - inset * 2,
            x: target.x + inset,
            y: target.y + inset
          },
          processId: 66
        }
      ],
      120,
      16
    )

    expect(route.obstructed).toBe(true)
    expect(route.points.length).toBeGreaterThan(2)

    for (let frame = 0; frame <= 1000; frame += 1) {
      const sample = sampleOverlayTravelRoute(route, frame / 1000)

      const actor = {
        bottom: sample.bounds.y + 38 + 120,
        left: sample.bounds.x + 38,
        right: sample.bounds.x + 38 + 120,
        top: sample.bounds.y + 38
      }

      const overlaps =
        actor.left < target.x + target.width &&
        actor.right > target.x &&
        actor.top < target.y + target.height &&
        actor.bottom > target.y

      expect(overlaps).toBe(false)
    }

    expect(sampleOverlayTravelRoute(route, 1).bounds).toEqual(destination)
  })

  it('routes a large saved overlay around a resized active surface from a near-edge start', () => {
    const target = { height: 190, width: 378, x: 655, y: 250 }
    const start = { height: 373, width: 373, x: 394, y: 110 }
    const destination = { height: 373, width: 373, x: 922, y: 159 }

    const route = planOverlayTravelRoute(
      start,
      destination,
      { height: 864, width: 1536, x: 0, y: 0 },
      [{ bounds: target, processId: 91 }],
      120,
      12
    )

    expect(route.obstructed).toBe(true)
    expect(route.points.length).toBeGreaterThan(2)

    const padding = (start.width - 120) / 2

    for (let frame = 0; frame <= 1000; frame += 1) {
      const sample = sampleOverlayTravelRoute(route, frame / 1000)

      const actor = {
        bottom: sample.bounds.y + padding + 120,
        left: sample.bounds.x + padding,
        right: sample.bounds.x + padding + 120,
        top: sample.bounds.y + padding
      }

      expect(
        actor.left < target.x + target.width &&
          actor.right > target.x &&
          actor.top < target.y + target.height &&
          actor.bottom > target.y
      ).toBe(false)
    }
  })

  it('routes an adjacent selection around the selected row before landing beside it', () => {
    const target = { height: 44, width: 500, x: 400, y: 350 }
    const start = { height: 196, width: 196, x: 600, y: 170 }
    const workArea = { height: 900, width: 1440, x: 0, y: 0 }

    const destination = placeOverlayBesideTarget(target, start, workArea, 120, 16, {
      x: target.x + target.width / 2,
      y: target.y + target.height / 2
    })

    const route = planOverlayTravelRoute(start, destination, workArea, [{ bounds: target, processId: 88 }], 120, 16)

    expect(route.obstructed).toBe(true)
    expect(route.points.length).toBeGreaterThan(2)

    for (let frame = 0; frame <= 1000; frame += 1) {
      const sample = sampleOverlayTravelRoute(route, frame / 1000)

      const actor = {
        bottom: sample.bounds.y + 38 + 120,
        left: sample.bounds.x + 38,
        right: sample.bounds.x + 38 + 120,
        top: sample.bounds.y + 38
      }

      const overlaps =
        actor.left < target.x + target.width &&
        actor.right > target.x &&
        actor.top < target.y + target.height &&
        actor.bottom > target.y

      expect(overlaps).toBe(false)
    }

    expect(sampleOverlayTravelRoute(route, 1).bounds).toEqual(destination)
  })

  it('reports real waypoint direction changes without changing the destination', () => {
    const route = planOverlayTravelRoute(
      { height: 196, width: 196, x: -1840, y: 300 },
      { height: 196, width: 196, x: -620, y: 310 },
      { height: 900, width: 1600, x: -1920, y: 0 },
      [
        {
          bounds: { height: 360, width: 340, x: -1420, y: 170 },
          processId: 44
        }
      ]
    )

    const directions = new Set<string>()

    for (let frame = 0; frame <= 1000; frame += 1) {
      const direction = sampleOverlayTravelRoute(route, frame / 1000).direction
      directions.add(`${direction.x.toFixed(2)},${direction.y.toFixed(2)}`)
    }

    expect(directions.size).toBeGreaterThan(2)
    expect(sampleOverlayTravelRoute(route, 1).bounds).toEqual({
      height: 196,
      width: 196,
      x: -620,
      y: 310
    })
  })

  it('plans a far-edge traversal for large work surfaces but not compact tools', () => {
    const target = { height: 480, width: 420, x: 220, y: 100 }
    const workArea = { height: 900, width: 1440, x: 0, y: 0 }
    const landing = placeOverlayBesideTarget(target, { height: 196, width: 196, x: 900, y: 600 }, workArea)

    const destination = surfaceTraversalDestination(target, landing, workArea, 'editor', { x: 400, y: 150 })

    expect(destination).not.toBeNull()
    expect(destination?.x).toBe(landing.x)
    expect(destination!.y).toBeGreaterThan(landing.y + 80)
    expect(surfaceTraversalDestination(target, landing, workArea, 'tool', { x: 400, y: 150 })).toBeNull()
  })

  it('curves surface traversal away from content and lands exactly', () => {
    const target = { height: 480, width: 420, x: 220, y: 100 }
    const start = { height: 196, width: 196, x: 658, y: 210 }
    const destination = { ...start, y: 390 }
    const middle = overlaySurfaceTraversalFrame(start, destination, target, 0.5)

    expect(middle.x).toBeGreaterThan(start.x)
    expect(middle.y).toBe(300)
    expect(overlaySurfaceTraversalFrame(start, destination, target, 1)).toEqual(destination)
  })
})
