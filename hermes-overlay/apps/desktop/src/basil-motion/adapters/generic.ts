import type { GenericAgentEvent } from '../types'

export function createGenericAgentEvent(
  kind: GenericAgentEvent['kind'],
  payload?: Omit<GenericAgentEvent, 'kind'>
): GenericAgentEvent {
  return { kind, ...payload }
}
