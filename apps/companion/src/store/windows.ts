/**
 * Standalone replacement for the Hermes `@/store/windows`.
 *
 * The companion app has exactly one renderer instance per window, so the
 * "is this a secondary window" question is always no.
 */

export function isSecondaryWindow(): boolean {
  return false
}
