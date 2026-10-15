import type { BasilCompanionApi } from './api'

declare global {
  interface Window {
    basilCompanion: BasilCompanionApi
  }
}

export {}
