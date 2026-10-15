/**
 * Standalone replacement for the Hermes `@/contrib/events`.
 *
 * The vendored `basil-motion-controller.tsx` subscribes to host gateway events
 * through `onGatewayEvent`. The companion app has no Hermes gateway — it emits
 * its own events via `adapters/companion.ts` — so this returns a no-op
 * unsubscribe to keep the vendored file compiling.
 */

export type BasilGatewayEventHandler = (event: unknown) => void

export function onGatewayEvent(_kind: string, _handler: BasilGatewayEventHandler): () => void {
  return () => {}
}
