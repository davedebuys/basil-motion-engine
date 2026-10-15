import { BrowserWindow, app, screen } from 'electron'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

import type { WindowBounds } from '../src/types'

export const OVERLAY_SIZE = 196
export const PANEL_WIDTH = 380
export const PANEL_HEIGHT = 560

export type RendererKind = 'overlay' | 'panel'

function preloadPath(): string {
  return join(app.getAppPath(), 'dist/electron/preload.cjs')
}

/** Resolves the renderer URL for the given `?win=` route in dev and prod. */
export function rendererUrl(kind: RendererKind): string {
  const devBase = process.env.ELECTRON_RENDERER_URL

  if (devBase) {
    return `${devBase.replace(/\/+$/, '')}/?win=${kind}`
  }

  const index = join(app.getAppPath(), 'dist/renderer/index.html')

  return `${pathToFileURL(index).toString()}?win=${kind}`
}

function defaultOverlayBounds(): WindowBounds {
  const workArea = screen.getPrimaryDisplay().workArea

  return {
    height: OVERLAY_SIZE,
    width: OVERLAY_SIZE,
    x: workArea.x + workArea.width - OVERLAY_SIZE - 32,
    y: workArea.y + workArea.height - OVERLAY_SIZE - 32
  }
}

function clampToBounds(bounds: WindowBounds, width: number, height: number): WindowBounds {
  const workArea = screen.getDisplayNearestPoint({ x: bounds.x, y: bounds.y }).workArea

  return {
    height,
    width,
    x: Math.min(Math.max(bounds.x, workArea.x), Math.max(workArea.x, workArea.x + workArea.width - width)),
    y: Math.min(Math.max(bounds.y, workArea.y), Math.max(workArea.y, workArea.y + workArea.height - height))
  }
}

export function createOverlayWindow(bounds: WindowBounds | null): BrowserWindow {
  const target = bounds ?? defaultOverlayBounds()
  const clamped = clampToBounds(target, OVERLAY_SIZE, OVERLAY_SIZE)

  const win = new BrowserWindow({
    alwaysOnTop: true,
    backgroundColor: '#00000000',
    frame: false,
    hasShadow: false,
    height: clamped.height,
    resizable: false,
    skipTaskbar: true,
    title: 'Basil',
    transparent: true,
    width: clamped.width,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: preloadPath()
    },
    x: clamped.x,
    y: clamped.y
  })

  void win.loadURL(rendererUrl('overlay'))

  return win
}

export function createPanelWindow(bounds: WindowBounds | null, alwaysOnTop: boolean): BrowserWindow {
  const fallback = defaultOverlayBounds()
  const target = bounds ?? {
    height: PANEL_HEIGHT,
    width: PANEL_WIDTH,
    x: fallback.x - PANEL_WIDTH - 16,
    y: fallback.y
  }
  const clamped = clampToBounds(target, PANEL_WIDTH, PANEL_HEIGHT)

  const win = new BrowserWindow({
    alwaysOnTop,
    backgroundColor: '#0d0f12',
    frame: false,
    height: clamped.height,
    maximizable: false,
    minimizable: true,
    resizable: false,
    show: false,
    title: 'Basil',
    width: clamped.width,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: preloadPath()
    },
    x: clamped.x,
    y: clamped.y
  })

  win.once('ready-to-show', () => win.show())

  void win.loadURL(rendererUrl('panel'))

  return win
}

export function boundsOf(win: BrowserWindow): WindowBounds {
  const bounds = win.getBounds()

  return { height: bounds.height, width: bounds.width, x: bounds.x, y: bounds.y }
}
