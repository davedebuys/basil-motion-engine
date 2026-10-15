import type { AgentEventAdapter, GenericAgentEvent } from '../basil-motion/types'
import { applyBasilAgentEvent } from '../basil-motion/store'

/**
 * Host-neutral bridge between companion chat activity and Basil's state
 * reducer.
 *
 * The overlay window receives chat events from the Electron main process (which
 * owns the provider call) and folds them through this adapter into a
 * `GenericAgentEvent`. The vendored engine then does exactly what it does for
 * Hermes gateway events — no companion-specific logic lives in the engine.
 *
 * The mapping is intentionally thin and mirrors the Hermes adapter's intent:
 * - a user message begins a turn (listening)
 * - streaming/working is thinking or writing
 * - completion is success
 * - failure is an error
 */
export type CompanionEventKind =
  | 'agent_error'
  | 'agent_idle'
  | 'assistant_start'
  | 'assistant_success'
  | 'listening'
  | 'thinking'
  | 'writing'

export interface CompanionAgentEvent {
  kind: CompanionEventKind
  label?: string
}

export const companionAgentEventAdapter: AgentEventAdapter<CompanionAgentEvent> = (
  event: CompanionAgentEvent
): GenericAgentEvent => ({
  id: `companion-${Date.now()}`,
  kind: event.kind,
  label: event.label,
  scene: { target: 'conversation' },
  source: 'companion'
})

/**
 * Convenience wrapper: the adapter contract is `(event) => GenericAgentEvent |
 * null`, so fold a companion event straight into the engine store, ignoring a
 * null result.
 */
export function dispatchCompanionEvent(event: CompanionAgentEvent): void {
  const generic = companionAgentEventAdapter(event)

  if (generic) {
    applyBasilAgentEvent(generic)
  }
}

export const listenEvent: CompanionAgentEvent = { kind: 'listening', label: 'You' }
export const thinkingEvent: CompanionAgentEvent = { kind: 'thinking', label: 'Basil' }
export const successEvent: CompanionAgentEvent = { kind: 'assistant_success', label: 'Basil' }
export const errorEvent: CompanionAgentEvent = { kind: 'agent_error', label: 'Provider' }
export const idleEvent: CompanionAgentEvent = { kind: 'agent_idle' }
