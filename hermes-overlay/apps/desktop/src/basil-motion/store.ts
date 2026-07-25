import { atom } from 'nanostores'

import { BASIL_DEFAULT_PARAMETERS, reduceBasilState } from './engine'
import { BASIL_INTERACTION_BY_ID, BASIL_INTERACTIONS } from './interaction-pack'
import { interactionForGenericAgentEvent } from './interaction-router'
import { BASIL_PERSONALITY_BY_ID, type BasilPersonalityId } from './personality-pack'
import type { BasilPersonalityMode } from './personality-scheduler'
import { advanceBasilTaskJourney } from './task-journey-engine'
import type { BasilParameters, BasilSceneTarget, BasilStateSnapshot, GenericAgentEvent } from './types'

export const $basilSnapshot = atom<BasilStateSnapshot>({ state: 'idle' })
export const $basilParameterOverrides = atom<Partial<BasilParameters>>({})
export const $basilSceneOverride = atom<BasilSceneTarget | null>(null)
export const $basilPersonalityMode = atom<BasilPersonalityMode>('balanced')
export const $basilPersonalityPreview = atom<{ id: BasilPersonalityId; nonce: number; side: -1 | 1 } | null>(null)

let interactionNonce = 0
let personalityNonce = 0

function nextInteraction(id: string, startProgress?: number) {
  interactionNonce += 1

  return { id, nonce: interactionNonce, startProgress }
}

export function applyBasilAgentEvent(event: GenericAgentEvent): void {
  const previous = $basilSnapshot.get()

  $basilSnapshot.set({
    ...reduceBasilState(previous, event),
    journey: advanceBasilTaskJourney(previous.journey, event),
    interaction: nextInteraction(interactionForGenericAgentEvent(event))
  })
}

export function setBasilManualState(state: BasilStateSnapshot['state']): void {
  const interaction = BASIL_INTERACTIONS.find(candidate => candidate.state === state)

  $basilSnapshot.set({
    interaction: interaction ? nextInteraction(interaction.id) : undefined,
    state,
    lastEvent: { kind: 'agent_idle', label: 'manual', source: 'dev-control' }
  })
}

export function playBasilInteraction(id: string, startProgress = 0): void {
  const interaction = BASIL_INTERACTION_BY_ID.get(id)

  if (!interaction) {
    return
  }

  $basilSceneOverride.set(interaction.scene)
  $basilSnapshot.set({
    interaction: nextInteraction(interaction.id, Math.max(0, Math.min(1, startProgress))),
    lastEvent: { kind: 'agent_idle', label: interaction.label, source: 'dev-control' },
    state: interaction.state
  })
}

export function setBasilParameterOverride(key: keyof BasilParameters, value: number): void {
  $basilParameterOverrides.set({ ...$basilParameterOverrides.get(), [key]: value })
}

export function setBasilSceneOverride(target: BasilSceneTarget | null): void {
  $basilSceneOverride.set(target)
}

export function setBasilPersonalityMode(mode: BasilPersonalityMode): void {
  $basilPersonalityMode.set(mode)
}

export function playBasilPersonality(id: BasilPersonalityId, side: -1 | 1 = 1): void {
  const behavior = BASIL_PERSONALITY_BY_ID.get(id)

  if (!behavior) {
    return
  }

  personalityNonce += 1
  $basilSnapshot.set({
    lastEvent: { kind: 'agent_idle', label: behavior.label, source: 'dev-control' },
    state: behavior.allowedStates[0]
  })
  $basilPersonalityPreview.set({ id, nonce: personalityNonce, side })
}

export function resetBasilParameterOverrides(): void {
  $basilParameterOverrides.set({})
}

export function basilParameterValue(key: keyof BasilParameters): number {
  return $basilParameterOverrides.get()[key] ?? BASIL_DEFAULT_PARAMETERS[key]
}
