import { app, BrowserWindow } from 'electron'

import { CompanionIpc } from './ipc'
import { SettingsStore } from './settings'
import { boundsOf, createOverlayWindow } from './windows'

const store = new SettingsStore()
const ipc = new CompanionIpc(store)

let isQuitting = false

const hasLock = app.requestSingleInstanceLock()

if (!hasLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    const win = BrowserWindow.getAllWindows()[0]

    if (win) {
      if (win.isMinimized()) {
        win.restore()
      }

      win.show()
      win.focus()
    }
  })

  app.whenReady().then(async () => {
    await store.load()

    const overlay = createOverlayWindow(store.overlayBounds)

    ipc.attachOverlay(overlay)
    ipc.register()

    overlay.on('moved', () => store.setOverlayBounds(boundsOf(overlay)))
    overlay.on('close', () => {
      if (!isQuitting) {
        store.setOverlayBounds(boundsOf(overlay))
      }
    })

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        const next = createOverlayWindow(store.overlayBounds)

        ipc.attachOverlay(next)
      }
    })
  })

  app.on('before-quit', () => {
    isQuitting = true
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })
}
