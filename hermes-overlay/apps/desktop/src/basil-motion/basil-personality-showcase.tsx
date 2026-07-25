import {
  IconArrowLeft,
  IconArrowRight,
  IconPlayerPause,
  IconPlayerPlay,
  IconRefresh
} from '@tabler/icons-react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { BasilOrb } from './basil-orb'
import { BASIL_STATE_TARGETS } from './engine'
import { applyBasilPersonalityToFrame, sampleBasilPersonality } from './personality-engine'
import { BASIL_PERSONALITY_BEHAVIORS } from './personality-pack'

const ICON_SIZE = 18

export function BasilPersonalityShowcase() {
  const [behaviorIndex, setBehaviorIndex] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [progress, setProgress] = useState(0)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [side, setSide] = useState<-1 | 1>(1)
  const startedAtRef = useRef(performance.now())
  const behavior = BASIL_PERSONALITY_BEHAVIORS[behaviorIndex]

  useEffect(() => {
    if (!playing) {
      return
    }

    let animationFrame = 0

    const update = (now: number) => {
      setProgress(((now - startedAtRef.current) % behavior.durationMs) / behavior.durationMs)
      animationFrame = window.requestAnimationFrame(update)
    }

    animationFrame = window.requestAnimationFrame(update)

    return () => window.cancelAnimationFrame(animationFrame)
  }, [behavior.durationMs, playing])

  const pose = useMemo(
    () => sampleBasilPersonality(behavior, behavior.durationMs * progress, side, reducedMotion),
    [behavior, progress, reducedMotion, side]
  )

  const frame = useMemo(() => {
    const state = behavior.allowedStates[0]

    return applyBasilPersonalityToFrame(
      {
        ...BASIL_STATE_TARGETS[state],
        motionPhase: progress,
        state
      },
      pose
    )
  }, [behavior.allowedStates, pose, progress])

  const selectBehavior = (index: number) => {
    setBehaviorIndex(index)
    setProgress(0)
    startedAtRef.current = performance.now()
  }

  return (
    <main
      className="flex h-screen min-h-[620px] w-screen flex-col overflow-hidden bg-[#f5f4ef] text-[#111111]"
      data-basil-personality-showcase=""
      data-basil-personality-showcase-id={behavior.id}
    >
      <header className="flex min-h-16 items-center justify-between gap-4 border-b border-black/20 bg-white px-5 py-3">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold tracking-normal">Basil Personality Lab</h1>
          <p className="truncate text-xs text-black/60">Twenty event-driven character behaviours</p>
        </div>
        <div className="shrink-0 font-mono text-[11px] uppercase text-black/60">
          {BASIL_PERSONALITY_BEHAVIORS.length} behaviours
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_190px] lg:grid-cols-[minmax(0,1fr)_330px] lg:grid-rows-1">
        <section className="flex min-h-0 flex-col items-center justify-center overflow-hidden border-b border-black/20 px-5 py-4 lg:border-r lg:border-b-0">
          <div className="flex min-h-0 w-full max-w-[760px] flex-1 items-center justify-center">
            <div className="aspect-square h-full max-h-[520px] min-h-[250px] max-w-full [&_svg]:h-full [&_svg]:w-full">
              <BasilOrb frame={frame} personality={pose} size={420} />
            </div>
          </div>

          <div className="w-full max-w-[760px] border-t border-black/15 pt-3">
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="font-mono text-[10px] uppercase text-black/50">
                  {String(behaviorIndex + 1).padStart(2, '0')} / {BASIL_PERSONALITY_BEHAVIORS.length}
                </div>
                <h2 className="text-lg font-semibold tracking-normal">{behavior.label}</h2>
              </div>
              <div className="text-right font-mono text-[10px] uppercase text-black/50">
                <div>{behavior.signal.replaceAll('_', ' ')}</div>
                <div>{pose.stage}</div>
              </div>
            </div>
            <p className="mt-2 text-sm text-black/65">
              Triggered by genuine <strong>{behavior.signal.replaceAll('_', ' ')}</strong> activity. Agent state remains{' '}
              <strong>{behavior.allowedStates[0]}</strong>.
            </p>
          </div>
        </section>

        <aside aria-label="Personality behaviours" className="min-h-0 overflow-y-auto bg-[#dce8e3]">
          {BASIL_PERSONALITY_BEHAVIORS.map((item, index) => (
            <button
              aria-label={`Show ${item.label}`}
              className={`grid w-full grid-cols-[2.25rem_1fr] gap-2 border-0 border-b border-black/15 px-4 py-3 text-left ${
                index === behaviorIndex ? 'bg-white text-black' : 'bg-transparent text-black/70 hover:bg-white/55'
              }`}
              data-basil-personality-button={item.id}
              key={item.id}
              onClick={() => selectBehavior(index)}
              type="button"
            >
              <span className="font-mono text-[11px] text-black/45">{String(index + 1).padStart(2, '0')}</span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">{item.label}</span>
                <span className="mt-1 block truncate text-[11px] text-black/55">{item.signal.replaceAll('_', ' ')}</span>
              </span>
            </button>
          ))}
        </aside>
      </div>

      <footer className="flex min-h-20 items-center gap-3 border-t border-black/20 bg-white px-4 py-3">
        <button
          aria-label="Previous behaviour"
          className="grid size-9 shrink-0 place-items-center border border-black/25 bg-white hover:bg-black/5 disabled:opacity-30"
          disabled={behaviorIndex === 0}
          onClick={() => selectBehavior(behaviorIndex - 1)}
          type="button"
        >
          <IconArrowLeft size={ICON_SIZE} />
        </button>
        <button
          aria-label={playing ? 'Pause behaviour' : 'Play behaviour'}
          className="grid size-11 shrink-0 place-items-center border border-black bg-black text-white hover:bg-black/80"
          onClick={() => {
            if (!playing) {
              startedAtRef.current = performance.now() - progress * behavior.durationMs
            }

            setPlaying(value => !value)
          }}
          type="button"
        >
          {playing ? <IconPlayerPause size={20} /> : <IconPlayerPlay size={20} />}
        </button>
        <button
          aria-label="Restart behaviour"
          className="grid size-9 shrink-0 place-items-center border border-black/25 bg-white hover:bg-black/5"
          onClick={() => {
            setProgress(0)
            startedAtRef.current = performance.now()
          }}
          type="button"
        >
          <IconRefresh size={ICON_SIZE} />
        </button>

        <input
          aria-label="Behaviour progress"
          className="h-1.5 min-w-0 flex-1 cursor-pointer accent-[#f04f36]"
          max="0.999"
          min="0"
          onChange={event => {
            const next = Number(event.target.value)

            setProgress(next)
            startedAtRef.current = performance.now() - next * behavior.durationMs
          }}
          step="0.001"
          type="range"
          value={progress}
        />

        <button
          aria-label="Mirror behaviour"
          className="grid size-9 shrink-0 place-items-center border border-black/25 bg-white hover:bg-black/5"
          onClick={() => setSide(value => (value === 1 ? -1 : 1))}
          type="button"
        >
          {side === 1 ? <IconArrowRight size={ICON_SIZE} /> : <IconArrowLeft size={ICON_SIZE} />}
        </button>
        <label className="flex shrink-0 items-center gap-2 text-xs">
          <input
            checked={reducedMotion}
            onChange={event => setReducedMotion(event.target.checked)}
            type="checkbox"
          />
          <span className="hidden sm:inline">Reduced motion</span>
        </label>
        <button
          aria-label="Next behaviour"
          className="grid size-9 shrink-0 place-items-center border border-black/25 bg-white hover:bg-black/5 disabled:opacity-30"
          disabled={behaviorIndex === BASIL_PERSONALITY_BEHAVIORS.length - 1}
          onClick={() => selectBehavior(behaviorIndex + 1)}
          type="button"
        >
          <IconArrowRight size={ICON_SIZE} />
        </button>
      </footer>
    </main>
  )
}
