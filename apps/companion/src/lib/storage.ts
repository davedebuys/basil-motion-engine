/**
 * Standalone replacement for the Hermes `@/lib/storage` module.
 *
 * The Basil engine only ever reads/writes booleans and strings through four
 * helpers. Backing them with `localStorage` keeps the renderer self-contained
 * (bounds, overlay-active flag, presence prefs) with no main-process roundtrip.
 *
 * Everything is guarded so the module is safe to import in a worker or under
 * Vitest's jsdom environment.
 */

function getStorage(): Storage | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null
  } catch {
    // Storage can throw in private modes or sandboxed contexts.
    return null
  }
}

export function storedString(key: string): string {
  return getStorage()?.getItem(key) ?? ''
}

export function storedBoolean(key: string, fallback = false): boolean {
  const raw = getStorage()?.getItem(key)

  if (raw === null || raw === undefined || raw === '') {
    return fallback
  }

  return raw === 'true'
}

export function storedNumber(key: string, fallback = 0): number {
  const raw = getStorage()?.getItem(key)
  const parsed = raw === null || raw === undefined ? Number.NaN : Number(raw)

  return Number.isFinite(parsed) ? parsed : fallback
}

export function persistString(key: string, value: string): void {
  getStorage()?.setItem(key, value)
}

export function persistBoolean(key: string, value: boolean): void {
  getStorage()?.setItem(key, String(value))
}

export function persistNumber(key: string, value: number): void {
  getStorage()?.setItem(key, String(value))
}

export function removeStored(key: string): void {
  getStorage()?.removeItem(key)
}
