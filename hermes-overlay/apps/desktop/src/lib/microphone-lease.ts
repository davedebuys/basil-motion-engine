export interface MicrophoneLeaseRequest {
  id: symbol
  onPreempt: () => void
  priority: number
}

let activeLease: MicrophoneLeaseRequest | null = null

export function acquireMicrophoneLease(request: MicrophoneLeaseRequest): boolean {
  if (activeLease?.id === request.id) {
    return true
  }

  if (activeLease && activeLease.priority >= request.priority) {
    return false
  }

  const previous = activeLease
  activeLease = request
  previous?.onPreempt()

  return true
}

export function releaseMicrophoneLease(id: symbol): void {
  if (activeLease?.id === id) {
    activeLease = null
  }
}

export function microphoneLeasePriority(): number | null {
  return activeLease?.priority ?? null
}

export function ownsMicrophoneLease(id: symbol): boolean {
  return activeLease?.id === id
}

export function resetMicrophoneLeaseForTests(): void {
  activeLease = null
}
