import { useStore } from '@nanostores/react'
import { useEffect, useState } from 'react'

import {
  dispatchCompanionEvent,
  errorEvent,
  listenEvent,
  successEvent,
  thinkingEvent
} from '../adapters/companion'
import { BasilOrb } from '../basil-motion/basil-orb'
import { BasilPresenceCue } from '../basil-motion/presence-cue'
import { $basilSnapshot } from '../basil-motion/store'
import { useBasilFrame } from '../basil-motion/use-basil-frame'
import { useBasilPresence } from '../basil-motion/use-basil-presence'
import { BASIL_STATE_TARGETS } from '../basil-motion/engine'
import type { ChatMessage, CompanionSettings } from '../types'

const ORB = 64

/**
 * Dashboard: a live read-out of Basil's state plus a small orb preview.
 *
 * The panel is a separate window from the overlay, so it folds the same chat
 * events into the same engine store — both renderers converge on identical
 * state without the main process needing to serialize poses.
 */
export function DashboardView({ messages, settings }: { messages: ChatMessage[]; settings: CompanionSettings }) {
  const snapshot = useStore($basilSnapshot)
  const presence = useBasilPresence()
  const [turns, setTurns] = useState(0)

  const frame = useBasilFrame(snapshot.state, BASIL_STATE_TARGETS[snapshot.state], undefined, snapshot.interaction, false)

  useEffect(() => {
    const api = window.basilCompanion

    if (!api) {
      return
    }

    return api.chat.onEvent(event => {
      setTurns(count => count + 1)

      if (event.type === 'user_message') {
        dispatchCompanionEvent(listenEvent)
      } else if (event.type === 'assistant_start') {
        dispatchCompanionEvent(thinkingEvent)
      } else if (event.type === 'assistant_success') {
        dispatchCompanionEvent(successEvent)
      } else if (event.type === 'assistant_error') {
        dispatchCompanionEvent(errorEvent)
      }
    })
  }, [])

  const userMessages = messages.filter(message => message.role === 'user').length

  return (
    <div className="panel-scroll h-full space-y-4 overflow-y-auto p-3 text-sm">
      <section className="flex items-center gap-3 rounded border border-(--ui-stroke-secondary) bg-(--ui-bg-elevated) p-3">
        <div className="relative shrink-0" style={{ height: ORB, width: ORB }}>
          <BasilPresenceCue pose={presence} size={ORB} />
          <BasilOrb frame={frame} journey={snapshot.journey} size={ORB} taskKind={snapshot.lastEvent?.kind} />
        </div>
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">State</div>
          <div className="truncate font-medium">{snapshot.state}</div>
          <div className="truncate text-xs text-muted-foreground">
            {snapshot.lastEvent?.label || snapshot.lastEvent?.kind || 'idle'}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-2">
        <Stat label="Messages" value={String(messages.length)} />
        <Stat label="Your turns" value={String(userMessages)} />
        <Stat label="Events this session" value={String(turns)} />
        <Stat label="Personality" value={settings.personality} />
      </section>

      <section className="rounded border border-(--ui-stroke-secondary) bg-(--ui-bg-elevated) p-3">
        <div className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Provider</div>
        <div className="truncate font-medium">{settings.provider.id}</div>
        <div className="truncate text-xs text-muted-foreground">{settings.provider.model || 'no model set'}</div>
        <div className="truncate text-xs text-muted-foreground">{settings.provider.baseUrl}</div>
      </section>

      {snapshot.journey && (
        <section className="rounded border border-(--ui-stroke-secondary) bg-(--ui-bg-elevated) p-3">
          <div className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Journey</div>
          <div className="flex flex-wrap gap-1">
            {snapshot.journey.trail.map((target, index) => (
              <span className="rounded bg-(--ui-bg-hover) px-2 py-0.5 text-xs" key={`${target}-${index}`}>
                {target}
              </span>
            ))}
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            {snapshot.journey.status} · {snapshot.journey.stepCount} steps
          </div>
        </section>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-(--ui-stroke-secondary) bg-(--ui-bg-elevated) p-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="truncate font-medium">{value}</div>
    </div>
  )
}
