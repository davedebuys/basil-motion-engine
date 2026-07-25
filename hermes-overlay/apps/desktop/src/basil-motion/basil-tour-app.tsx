import {
  IconChevronLeft,
  IconChevronRight,
  IconPlayerPause,
  IconPlayerPlay,
  IconRefresh,
  IconVolume,
  IconVolumeOff
} from '@tabler/icons-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { BasilOrb } from './basil-orb'
import { BASIL_TOUR_CHAPTERS, BASIL_TOUR_INTERACTION_COUNT } from './basil-tour-data'
import { BASIL_STATE_TARGETS } from './engine'
import { BASIL_INTERACTION_BY_ID, sampleBasilInteraction } from './interaction-pack'
import type { BasilMotionFrame } from './types'

const ICON_SIZE = 18

function pointerTourFrame(index: number, progress: number): Partial<BasilMotionFrame> {
  const direction = Math.sin(progress * Math.PI * 2)

  const base = {
    pointerActive: true,
    pointerX: direction,
    pointerY: Math.cos(progress * Math.PI * 2) * 0.24
  }

  switch (index) {
    case 0:
      return { ...base, pointerProximity: 0.68 }

    case 1:
      return { ...base, pointerApproach: 0.92, pointerProximity: 0.86 }

    case 2:
      return { ...base, pointerDwell: 0.88, pointerProximity: 0.96 }

    case 3:
      return { ...base, pointerBoop: 0.94, pointerProximity: 1 }

    case 4:
      return { ...base, pointerProximity: 0.94, pointerTickle: 0.84, pointerTickleDirection: 1 }

    case 5:
      return { ...base, pointerPet: 0.78, pointerPetDirection: -1, pointerProximity: 0.94 }

    case 6:
      return { ...base, pointerOrbit: 0.86, pointerOrbitDirection: 1, pointerProximity: 0.9 }

    case 7:
      return { ...base, pointerProximity: 0.9, pointerSwipe: 0.88, pointerSwipeX: 1, pointerSwipeY: 0.1 }

    case 8:
      return { ...base, actorHold: 1, pointerProximity: 1 }

    default:
      return { ...base, actorRelease: 0.96, landing: 0.82, pointerProximity: 0.78 }
  }
}

function desktopTourFrame(index: number, progress: number): Partial<BasilMotionFrame> {
  const travel = index < 6 ? 0.72 : index === 6 ? 0.45 : 0

  return {
    handoff: index === 6 ? 0.86 : 0,
    landing: index === 7 ? 0.82 : 0,
    travel,
    travelAcceleration: Math.sin(progress * Math.PI * 2) * 0.72,
    travelX: index % 2 === 0 ? 1 : -1,
    travelY: index % 3 === 0 ? 0.28 : 0
  }
}

export function BasilTourApp() {
  const audioRef = useRef<HTMLAudioElement>(null)
  const autoPlayRef = useRef(false)
  const [chapterIndex, setChapterIndex] = useState(0)
  const [duration, setDuration] = useState(BASIL_TOUR_CHAPTERS[0].durationSeconds)
  const [muted, setMuted] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [time, setTime] = useState(0)
  const chapter = BASIL_TOUR_CHAPTERS[chapterIndex]
  const normalizedTime = Math.max(0, Math.min(0.9999, duration > 0 ? time / duration : 0))
  const scaledInteraction = normalizedTime * chapter.interactionIds.length
  const interactionIndex = Math.min(chapter.interactionIds.length - 1, Math.floor(scaledInteraction))
  const interactionProgress = scaledInteraction - interactionIndex
  const interaction = BASIL_INTERACTION_BY_ID.get(chapter.interactionIds[interactionIndex]) ?? BASIL_INTERACTIONS_FALLBACK

  const frame = useMemo<BasilMotionFrame>(() => {
    const sample = sampleBasilInteraction(interaction, interaction.durationMs * interactionProgress)

    const extras =
      chapter.id === '11-pointer'
        ? pointerTourFrame(interactionIndex, interactionProgress)
        : chapter.id === '12-desktop'
          ? desktopTourFrame(interactionIndex, interactionProgress)
          : {}

    return {
      ...BASIL_STATE_TARGETS[interaction.state],
      ...sample.parameters,
      ...extras,
      interactionAccessory: sample.accessory,
      interactionBeat: sample.beat,
      interactionId: interaction.id,
      interactionProgress: sample.progress,
      interactionRotation: sample.rotation,
      interactionScaleX: sample.scaleX,
      interactionScaleY: sample.scaleY,
      interactionSide: sample.side,
      interactionX: sample.x,
      interactionY: sample.y,
      motionPhase: sample.progress,
      state: interaction.state
    }
  }, [chapter.id, interaction, interactionIndex, interactionProgress])

  const selectChapter = useCallback(
    (nextIndex: number, autoPlay = playing) => {
      autoPlayRef.current = autoPlay
      setChapterIndex(Math.max(0, Math.min(BASIL_TOUR_CHAPTERS.length - 1, nextIndex)))
    },
    [playing]
  )

  useEffect(() => {
    const audio = audioRef.current

    setDuration(chapter.durationSeconds)
    setTime(0)

    if (!audio) {
      return
    }

    audio.currentTime = 0
    audio.load()

    if (autoPlayRef.current) {
      void audio.play().catch(() => setPlaying(false))
    }
  }, [chapter.audioSrc, chapter.durationSeconds])

  useEffect(() => {
    if (!playing) {
      return
    }

    let animationFrame = 0

    const update = () => {
      const audio = audioRef.current

      if (audio) {
        setTime(audio.currentTime)
      }

      animationFrame = window.requestAnimationFrame(update)
    }

    animationFrame = window.requestAnimationFrame(update)

    return () => window.cancelAnimationFrame(animationFrame)
  }, [playing])

  const togglePlayback = () => {
    const audio = audioRef.current

    if (!audio) {
      return
    }

    if (audio.paused) {
      autoPlayRef.current = true
      void audio.play().catch(() => setPlaying(false))
    } else {
      autoPlayRef.current = false
      audio.pause()
    }
  }

  const restart = () => {
    const audio = audioRef.current

    if (!audio) {
      return
    }

    audio.currentTime = 0
    setTime(0)

    if (playing) {
      void audio.play().catch(() => setPlaying(false))
    }
  }

  const onEnded = () => {
    if (chapterIndex < BASIL_TOUR_CHAPTERS.length - 1) {
      selectChapter(chapterIndex + 1, true)
    } else {
      autoPlayRef.current = false
      setPlaying(false)
    }
  }

  return (
    <main
      className="flex h-screen min-h-[620px] w-screen flex-col overflow-hidden bg-[#f5f4ef] text-[#111111]"
      data-basil-tour=""
      data-basil-tour-chapter={chapter.id}
      data-basil-tour-interaction={interaction.id}
    >
      <header className="flex min-h-16 items-center justify-between gap-4 border-b border-black/20 bg-white px-5 py-3">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold tracking-normal">Basil Motion Tour</h1>
          <p className="truncate text-xs text-black/60">Open-source procedural character showcase</p>
        </div>
        <div className="flex shrink-0 gap-4 font-mono text-[11px] uppercase text-black/65">
          <span>{BASIL_TOUR_INTERACTION_COUNT} interactions</span>
          <span className="hidden sm:inline">25 motifs</span>
          <span className="hidden md:inline">12 states</span>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_190px] lg:grid-cols-[minmax(0,1fr)_330px] lg:grid-rows-1">
        <section className="flex min-h-0 flex-col items-center justify-center overflow-hidden border-b border-black/20 px-5 py-4 lg:border-r lg:border-b-0">
          <div className="flex min-h-0 w-full max-w-[760px] flex-1 items-center justify-center">
            <div className="aspect-square h-full max-h-[520px] min-h-[250px] max-w-full [&_svg]:h-full [&_svg]:w-full">
              <BasilOrb
                focusTarget={interaction.scene}
                frame={frame}
                size={420}
                taskPhase={interaction.state === 'success' ? 'complete' : undefined}
              />
            </div>
          </div>

          <div className="w-full max-w-[760px] border-t border-black/15 pt-3">
            <div className="flex items-baseline justify-between gap-4">
              <div className="min-w-0">
                <div className="font-mono text-[10px] uppercase text-black/50">
                  {String(chapterIndex + 1).padStart(2, '0')} / {String(BASIL_TOUR_CHAPTERS.length).padStart(2, '0')}
                </div>
                <h2 className="truncate text-lg font-semibold tracking-normal">{chapter.title}</h2>
              </div>
              <div className="shrink-0 text-right">
                <div className="font-mono text-[10px] uppercase text-black/50">Now showing</div>
                <div className="max-w-52 truncate text-sm font-medium">{interaction.label}</div>
              </div>
            </div>

            <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-black/70">{chapter.narration}</p>

            <div aria-label="Chapter interaction sequence" className="mt-3 grid grid-cols-10 gap-1">
              {chapter.interactionIds.map((id, index) => (
                <button
                  aria-label={`Show ${BASIL_INTERACTION_BY_ID.get(id)?.label ?? id}`}
                  className={`h-1.5 border-0 p-0 ${
                    index === interactionIndex ? 'bg-[#f04f36]' : index < interactionIndex ? 'bg-black/55' : 'bg-black/15'
                  }`}
                  key={id}
                  onClick={() => {
                    const audio = audioRef.current
                    const nextTime = (index / chapter.interactionIds.length) * duration

                    if (audio) {
                      audio.currentTime = nextTime
                    }

                    setTime(nextTime)
                  }}
                  title={BASIL_INTERACTION_BY_ID.get(id)?.label ?? id}
                  type="button"
                />
              ))}
            </div>
          </div>
        </section>

        <aside aria-label="Tour chapters" className="min-h-0 overflow-y-auto bg-[#dce8e3]">
          {BASIL_TOUR_CHAPTERS.map((item, index) => (
            <button
              className={`grid w-full grid-cols-[2.25rem_1fr] gap-2 border-0 border-b border-black/15 px-4 py-3 text-left ${
                index === chapterIndex ? 'bg-white text-black' : 'bg-transparent text-black/70 hover:bg-white/55'
              }`}
              data-basil-tour-chapter-button={item.id}
              key={item.id}
              onClick={() => selectChapter(index)}
              type="button"
            >
              <span className="font-mono text-[11px] text-black/45">{String(index + 1).padStart(2, '0')}</span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">{item.title}</span>
                <span className="mt-1 block truncate text-[11px] text-black/55">{item.capabilities.join(' / ')}</span>
              </span>
            </button>
          ))}
        </aside>
      </div>

      <footer className="flex min-h-20 items-center gap-3 border-t border-black/20 bg-white px-4 py-3">
        <button
          aria-label="Previous chapter"
          className="grid size-9 shrink-0 place-items-center border border-black/25 bg-white hover:bg-black/5 disabled:opacity-30"
          disabled={chapterIndex === 0}
          onClick={() => selectChapter(chapterIndex - 1)}
          title="Previous chapter"
          type="button"
        >
          <IconChevronLeft size={ICON_SIZE} />
        </button>
        <button
          aria-label={playing ? 'Pause tour' : 'Play tour'}
          className="grid size-11 shrink-0 place-items-center border border-black bg-black text-white hover:bg-black/80"
          onClick={togglePlayback}
          title={playing ? 'Pause' : 'Play'}
          type="button"
        >
          {playing ? <IconPlayerPause size={20} /> : <IconPlayerPlay size={20} />}
        </button>
        <button
          aria-label="Restart chapter"
          className="grid size-9 shrink-0 place-items-center border border-black/25 bg-white hover:bg-black/5"
          onClick={restart}
          title="Restart chapter"
          type="button"
        >
          <IconRefresh size={ICON_SIZE} />
        </button>

        <div className="min-w-0 flex-1">
          <input
            aria-label="Tour progress"
            className="h-1.5 w-full cursor-pointer accent-[#f04f36]"
            max={duration}
            min="0"
            onChange={event => {
              const nextTime = Number(event.target.value)
              const audio = audioRef.current

              if (audio) {
                audio.currentTime = nextTime
              }

              setTime(nextTime)
            }}
            step="0.01"
            type="range"
            value={Math.min(time, duration)}
          />
          <div className="mt-1 flex justify-between font-mono text-[10px] text-black/45">
            <span>{time.toFixed(1)}s</span>
            <span>{duration.toFixed(1)}s</span>
          </div>
        </div>

        <button
          aria-label={muted ? 'Unmute narration' : 'Mute narration'}
          className="grid size-9 shrink-0 place-items-center border border-black/25 bg-white hover:bg-black/5"
          onClick={() => setMuted(value => !value)}
          title={muted ? 'Unmute narration' : 'Mute narration'}
          type="button"
        >
          {muted ? <IconVolumeOff size={ICON_SIZE} /> : <IconVolume size={ICON_SIZE} />}
        </button>
        <button
          aria-label="Next chapter"
          className="grid size-9 shrink-0 place-items-center border border-black/25 bg-white hover:bg-black/5 disabled:opacity-30"
          disabled={chapterIndex === BASIL_TOUR_CHAPTERS.length - 1}
          onClick={() => selectChapter(chapterIndex + 1)}
          title="Next chapter"
          type="button"
        >
          <IconChevronRight size={ICON_SIZE} />
        </button>

        <audio
          key={chapter.audioSrc}
          muted={muted}
          onDurationChange={event => {
            if (Number.isFinite(event.currentTarget.duration)) {
              setDuration(event.currentTarget.duration)
            }
          }}
          onEnded={onEnded}
          onPause={() => setPlaying(false)}
          onPlay={() => setPlaying(true)}
          preload="metadata"
          ref={audioRef}
          src={chapter.audioSrc}
        />
      </footer>
    </main>
  )
}

const BASIL_INTERACTIONS_FALLBACK = BASIL_INTERACTION_BY_ID.get('hello-basil')!
