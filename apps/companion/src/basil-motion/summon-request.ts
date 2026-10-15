import type { BasilSummonSource } from './summon-presentation-engine'

export interface BasilSummonRequest {
  source: BasilSummonSource
}

export const BASIL_SUMMON_REQUEST_EVENT = 'basil:summon-request'

export function emitBasilSummonRequest(request: BasilSummonRequest): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent<BasilSummonRequest>(BASIL_SUMMON_REQUEST_EVENT, { detail: request }))
  }
}

export function onBasilSummonRequest(listener: (request: BasilSummonRequest) => void): () => void {
  if (typeof window === 'undefined') {
    return () => {}
  }

  const handle = (event: Event) => listener((event as CustomEvent<BasilSummonRequest>).detail)

  window.addEventListener(BASIL_SUMMON_REQUEST_EVENT, handle)

  return () => window.removeEventListener(BASIL_SUMMON_REQUEST_EVENT, handle)
}
