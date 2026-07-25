import { useStore } from '@nanostores/react'
import { useState } from 'react'

import { $basilAmbientWakeEnabled, setBasilAmbientWakeEnabled } from './ambient-wake'
import { BASIL_DEFAULT_PARAMETERS, BASIL_STATES } from './engine'
import { BASIL_INTERACTIONS, type BasilInteractionCategory } from './interaction-pack'
import { BASIL_PERSONALITY_BEHAVIORS, type BasilPersonalityId } from './personality-pack'
import { $basilPresence, hideBasil, summonBasil } from './presence'
import {
  $basilPresenceAudioEnabled,
  setBasilPresenceAudioEnabled
} from './presence-audio'
import { playBasilPresenceAudio } from './presence-audio-web'
import { BASIL_SCENE_TARGETS } from './scene-motion'
import {
  $basilParameterOverrides,
  $basilPersonalityMode,
  $basilSceneOverride,
  $basilSnapshot,
  playBasilInteraction,
  playBasilPersonality,
  resetBasilParameterOverrides,
  setBasilManualState,
  setBasilParameterOverride,
  setBasilPersonalityMode,
  setBasilSceneOverride
} from './store'
import type { BasilParameters } from './types'

const PARAMS: Array<keyof BasilParameters> = [
  'eyeX',
  'eyeY',
  'blink',
  'mouth',
  'squash',
  'float',
  'rotation',
  'energy',
  'glow',
  'accessoryVisibility',
  'particleIntensity'
]

const signed = new Set<keyof BasilParameters>(['eyeX', 'eyeY', 'mouth', 'rotation', 'squash'])

const CATEGORIES: readonly BasilInteractionCategory[] = [
  'social',
  'listening',
  'focus',
  'search',
  'reading',
  'writing',
  'tools',
  'permission',
  'results',
  'rest'
]

export function BasilDevPanel() {
  const snapshot = useStore($basilSnapshot)
  const ambientWakeEnabled = useStore($basilAmbientWakeEnabled)
  const overrides = useStore($basilParameterOverrides)
  const personalityMode = useStore($basilPersonalityMode)
  const presence = useStore($basilPresence)
  const presenceAudioEnabled = useStore($basilPresenceAudioEnabled)
  const sceneOverride = useStore($basilSceneOverride)
  const [interactionId, setInteractionId] = useState(snapshot.interaction?.id ?? BASIL_INTERACTIONS[0].id)
  const [interactionProgress, setInteractionProgress] = useState(0)
  const [personalityId, setPersonalityId] = useState<BasilPersonalityId>(BASIL_PERSONALITY_BEHAVIORS[0].id)

  return (
    <div className="mt-2 grid gap-2 border-t border-(--ui-stroke-secondary) pt-2 text-[11px]">
      <div className="grid grid-cols-2 gap-1">
        <button
          className="h-7 rounded border border-(--ui-stroke-secondary) bg-(--ui-bg-elevated) px-2 text-foreground hover:bg-(--ui-bg-hover)"
          onClick={summonBasil}
          type="button"
        >
          Summon
        </button>
        <button
          className="h-7 rounded border border-(--ui-stroke-secondary) bg-(--ui-bg-elevated) px-2 text-foreground hover:bg-(--ui-bg-hover)"
          onClick={hideBasil}
          type="button"
        >
          Hide
        </button>
      </div>
      <div className="font-mono text-[9px] uppercase text-muted-foreground">presence: {presence.phase}</div>
      <label className="flex items-center justify-between gap-2">
        <span className="text-muted-foreground">local wake listener</span>
        <input
          checked={ambientWakeEnabled}
          onChange={event => setBasilAmbientWakeEnabled(event.target.checked)}
          type="checkbox"
        />
      </label>
      <label className="flex items-center justify-between gap-2">
        <span className="text-muted-foreground">summon sounds</span>
        <input
          aria-label="Basil summon sounds"
          checked={presenceAudioEnabled}
          onChange={event => setBasilPresenceAudioEnabled(event.target.checked)}
          type="checkbox"
        />
      </label>
      <div className="grid grid-cols-2 gap-1">
        <button
          className="h-7 rounded border border-(--ui-stroke-secondary) bg-(--ui-bg-elevated) px-2 text-foreground hover:bg-(--ui-bg-hover)"
          onClick={() => void playBasilPresenceAudio('summon')}
          type="button"
        >
          Hear summon
        </button>
        <button
          className="h-7 rounded border border-(--ui-stroke-secondary) bg-(--ui-bg-elevated) px-2 text-foreground hover:bg-(--ui-bg-hover)"
          onClick={() => void playBasilPresenceAudio('hide')}
          type="button"
        >
          Hear hide
        </button>
      </div>
      <select
        className="h-7 rounded border border-(--ui-stroke-secondary) bg-(--ui-bg-elevated) px-2 text-foreground outline-none"
        onChange={event => setBasilManualState(event.target.value as (typeof BASIL_STATES)[number])}
        value={snapshot.state}
      >
        {BASIL_STATES.map(state => (
          <option key={state} value={state}>
            {state}
          </option>
        ))}
      </select>
      <div className="grid grid-cols-[1fr_2rem] gap-1">
        <select
          aria-label="Basil interaction"
          className="h-7 min-w-0 rounded border border-(--ui-stroke-secondary) bg-(--ui-bg-elevated) px-2 text-foreground outline-none"
          onChange={event => setInteractionId(event.target.value)}
          value={interactionId}
        >
          {CATEGORIES.map(category => (
            <optgroup key={category} label={category}>
              {BASIL_INTERACTIONS.filter(interaction => interaction.category === category).map(interaction => (
                <option key={interaction.id} value={interaction.id}>
                  {interaction.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <button
          aria-label="Play Basil interaction"
          className="grid h-7 place-items-center rounded border border-(--ui-stroke-secondary) bg-(--ui-bg-elevated) text-foreground hover:bg-(--ui-bg-hover)"
          onClick={() => playBasilInteraction(interactionId, interactionProgress)}
          title="Play interaction"
          type="button"
        >
          &#9654;
        </button>
      </div>
      <label className="grid grid-cols-[5.5rem_1fr_2.5rem] items-center gap-2">
        <span className="truncate text-muted-foreground">cue phase</span>
        <input
          aria-label="Basil interaction phase"
          max="0.99"
          min="0"
          onChange={event => setInteractionProgress(Number(event.target.value))}
          step="0.01"
          type="range"
          value={interactionProgress}
        />
        <span className="font-mono text-muted-foreground">{interactionProgress.toFixed(2)}</span>
      </label>
      <div className="font-mono text-[9px] uppercase text-muted-foreground">
        {BASIL_INTERACTIONS.length} interaction pack
      </div>
      <div className="grid grid-cols-[1fr_2rem] gap-1">
        <select
          aria-label="Basil personality behaviour"
          className="h-7 min-w-0 rounded border border-(--ui-stroke-secondary) bg-(--ui-bg-elevated) px-2 text-foreground outline-none"
          onChange={event => setPersonalityId(event.target.value as BasilPersonalityId)}
          value={personalityId}
        >
          {BASIL_PERSONALITY_BEHAVIORS.map(behavior => (
            <option key={behavior.id} value={behavior.id}>
              {behavior.label}
            </option>
          ))}
        </select>
        <button
          aria-label="Play Basil personality behaviour"
          className="grid h-7 place-items-center rounded border border-(--ui-stroke-secondary) bg-(--ui-bg-elevated) text-foreground hover:bg-(--ui-bg-hover)"
          onClick={() => playBasilPersonality(personalityId)}
          title="Play personality behaviour"
          type="button"
        >
          &#9654;
        </button>
      </div>
      <select
        aria-label="Basil personality frequency"
        className="h-7 rounded border border-(--ui-stroke-secondary) bg-(--ui-bg-elevated) px-2 text-foreground outline-none"
        onChange={event => setBasilPersonalityMode(event.target.value as typeof personalityMode)}
        value={personalityMode}
      >
        <option value="quiet">quiet personality</option>
        <option value="balanced">balanced personality</option>
        <option value="playful">playful personality</option>
      </select>
      <div className="font-mono text-[9px] uppercase text-muted-foreground">
        {BASIL_PERSONALITY_BEHAVIORS.length} personality behaviours
      </div>
      <select
        aria-label="Basil scene target"
        className="h-7 rounded border border-(--ui-stroke-secondary) bg-(--ui-bg-elevated) px-2 text-foreground outline-none"
        onChange={event =>
          setBasilSceneOverride((event.target.value || null) as (typeof BASIL_SCENE_TARGETS)[number] | null)
        }
        value={sceneOverride ?? ''}
      >
        <option value="">automatic target</option>
        {BASIL_SCENE_TARGETS.map(target => (
          <option key={target} value={target}>
            {target}
          </option>
        ))}
      </select>
      <div className="grid max-h-48 gap-1 overflow-auto pr-1">
        {PARAMS.map(param => {
          const min = signed.has(param) ? -1 : 0
          const value = overrides[param] ?? BASIL_DEFAULT_PARAMETERS[param]

          return (
            <label className="grid grid-cols-[8.5rem_1fr_2.5rem] items-center gap-2" key={param}>
              <span className="truncate text-muted-foreground">{param}</span>
              <input
                max="1"
                min={min}
                onChange={event => setBasilParameterOverride(param, Number(event.target.value))}
                step="0.01"
                type="range"
                value={value}
              />
              <span className="font-mono text-muted-foreground">{value.toFixed(2)}</span>
            </label>
          )
        })}
      </div>
      <button
        className="h-7 rounded border border-(--ui-stroke-secondary) bg-(--ui-bg-elevated) px-2 text-left text-muted-foreground hover:text-foreground"
        onClick={resetBasilParameterOverrides}
        type="button"
      >
        Reset parameters
      </button>
    </div>
  )
}
