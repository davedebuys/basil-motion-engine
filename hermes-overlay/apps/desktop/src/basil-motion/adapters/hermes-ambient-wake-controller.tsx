import { useStore } from '@nanostores/react'
import { useEffect, useRef } from 'react'

import { useMicRecorder } from '@/app/chat/composer/hooks/use-mic-recorder'
import {
  classifyBasilPresenceAudio,
  getHermesConfigRecord,
  transcribeAudio,
  warmBasilPresenceAudioPrefilter
} from '@/hermes'
import { notify } from '@/store/notifications'
import { $voicePlayback } from '@/store/voice-playback'

import { deriveBasilAmbientPresenceAction } from '../ambient-presence-engine'
import {
  createBasilAmbientVadState,
  sampleBasilAmbientVad
} from '../ambient-vad-engine'
import {
  $basilAmbientWakeEnabled,
  markBasilAmbientHideDetected,
  markBasilAmbientWakeDetected,
  setBasilAmbientWakeLevel,
  setBasilAmbientWakeStatus
} from '../ambient-wake'
import { deriveBasilAmbientWakeDirective } from '../ambient-wake-engine'
import { $basilPresence, emitBasilPresenceCommand } from '../presence'
import { deriveBasilSpeechPrefilterDecision } from '../speech-prefilter-engine'
import { emitBasilSummonRequest } from '../summon-request'

import { basilPresenceCommandFromHermesTranscript } from './hermes-presence-command'

const MAX_UTTERANCE_MS = 12_000
const NON_WAKE_COOLDOWN_MS = 6_000
const PREFILTER_REJECT_COOLDOWN_MS = 3_000
const RETRY_AFTER_ERROR_MS = 30_000

const MIC_COPY = {
  microphoneAccessDenied: 'Microphone access denied.',
  microphoneConstraintsUnsupported: 'Microphone constraints are not supported by this device.',
  microphoneInUse: 'Microphone is already in use.',
  microphonePermissionDenied: 'Microphone permission was denied.',
  microphoneStartFailed: 'Could not start microphone recording.',
  microphoneUnsupported: 'This runtime does not support microphone recording.',
  noMicrophone: 'No microphone was found.'
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.addEventListener('load', () =>
      typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Could not read wake audio.'))
    )
    reader.addEventListener('error', () => reject(reader.error || new Error('Could not read wake audio.')))
    reader.readAsDataURL(blob)
  })
}

async function assertLocalSpeechToText(): Promise<void> {
  const config = await getHermesConfigRecord()
  const stt = config.stt && typeof config.stt === 'object' ? (config.stt as Record<string, unknown>) : {}
  const provider = String(stt.provider || 'local').toLowerCase()

  if (stt.enabled === false) {
    throw new Error('Enable speech-to-text in Hermes Voice settings before using ambient Basil wake.')
  }

  if (provider !== 'local') {
    throw new Error('Ambient Basil wake requires the local speech-to-text provider so wake audio stays on this PC.')
  }
}

export function HermesBasilAmbientWakeController() {
  const enabled = useStore($basilAmbientWakeEnabled)
  const presence = useStore($basilPresence)
  const playback = useStore($voicePlayback)
  const { handle } = useMicRecorder(MIC_COPY)
  const handleRef = useRef(handle)
  const generationRef = useRef(0)
  const noiseFloorRef = useRef(0)
  const prefilterWarmRequestedRef = useRef(false)

  handleRef.current = handle

  const directive = deriveBasilAmbientWakeDirective({
    enabled,
    playbackActive: playback.status !== 'idle',
    presence: presence.phase
  })

  useEffect(() => {
    const generation = generationRef.current + 1
    let cycleTimer: number | null = null
    let maxTimer: number | null = null
    let closing = false
    let configurationChecked = false
    let vadState = createBasilAmbientVadState(Date.now(), noiseFloorRef.current)

    generationRef.current = generation
    handleRef.current.cancel()

    const clearTimers = () => {
      if (cycleTimer !== null) {
        window.clearTimeout(cycleTimer)
        cycleTimer = null
      }

      if (maxTimer !== null) {
        window.clearTimeout(maxTimer)
        maxTimer = null
      }
    }

    const isCurrent = () => generationRef.current === generation

    if (directive === 'off') {
      setBasilAmbientWakeStatus('off')

      return clearTimers
    }

    if (directive === 'armed') {
      setBasilAmbientWakeStatus('armed')

      return clearTimers
    }

    if (directive === 'pause') {
      setBasilAmbientWakeStatus('paused')

      return clearTimers
    }

    const reportError = (error: unknown) => {
      if (!isCurrent()) {
        return
      }

      const message = error instanceof Error ? error.message : String(error)

      setBasilAmbientWakeStatus('error', { error: message })
      notify({
        durationMs: 8_000,
        id: 'basil-ambient-wake-error',
        kind: 'warning',
        message,
        title: 'Basil voice commands paused'
      })
    }

    const scheduleStart = (delayMs: number, start: () => void) => {
      if (!isCurrent()) {
        return
      }

      cycleTimer = window.setTimeout(start, delayMs)
    }

    const startCycle = async () => {
      if (!isCurrent()) {
        return
      }

      closing = false
      clearTimers()
      vadState = createBasilAmbientVadState(Date.now(), noiseFloorRef.current)
      setBasilAmbientWakeStatus('starting')

      try {
        if (!configurationChecked) {
          await assertLocalSpeechToText()
          configurationChecked = true

          if (!prefilterWarmRequestedRef.current) {
            prefilterWarmRequestedRef.current = true
            void warmBasilPresenceAudioPrefilter().catch(() => undefined)
          }
        }

        if (!isCurrent()) {
          return
        }

        await handleRef.current.start({
          leasePriority: 0,
          levelPublishIntervalMs: 120,
          sampleIntervalMs: 40,
          onLevel: level => {
            setBasilAmbientWakeLevel(level)
            const sample = sampleBasilAmbientVad(vadState, level, Date.now())

            vadState = sample.state
            noiseFloorRef.current = sample.state.noiseFloor

            if (sample.event === 'idle' || sample.event === 'speech-ended') {
              void finishCycle()
            }
          },
          onPreempt: () => {
            if (isCurrent()) {
              setBasilAmbientWakeStatus('paused')
              scheduleStart(800, () => void startCycle())
            }
          }
        })

        if (!isCurrent()) {
          handleRef.current.cancel()

          return
        }

        setBasilAmbientWakeStatus('listening')
        maxTimer = window.setTimeout(() => void finishCycle(), MAX_UTTERANCE_MS)
      } catch (error) {
        if (error instanceof Error && error.message === MIC_COPY.microphoneInUse) {
          setBasilAmbientWakeStatus('paused')
          scheduleStart(1_500, () => void startCycle())

          return
        }

        reportError(error)
        scheduleStart(RETRY_AFTER_ERROR_MS, () => void startCycle())
      }
    }

    const finishCycle = async () => {
      if (!isCurrent() || closing) {
        return
      }

      closing = true
      clearTimers()

      try {
        const recording = await handleRef.current.stop()
        let restartDelay = 240

        if (!isCurrent()) {
          return
        }

        if (recording && vadState.heardSpeech && recording.audio.size > 0) {
          const dataUrl = await blobToDataUrl(recording.audio)

          setBasilAmbientWakeStatus('prefiltering')

          const prefilter = await classifyBasilPresenceAudio(dataUrl, recording.audio.type).catch(() => ({
            available: false,
            candidate: false
          }))

          if (!isCurrent()) {
            return
          }

          if (deriveBasilSpeechPrefilterDecision(prefilter) === 'discard') {
            restartDelay = PREFILTER_REJECT_COOLDOWN_MS
            setBasilAmbientWakeStatus('paused')
          } else {
            setBasilAmbientWakeStatus('transcribing')
            const result = await transcribeAudio(dataUrl, recording.audio.type)

            if (!isCurrent()) {
              return
            }

            const action = deriveBasilAmbientPresenceAction({
              command: basilPresenceCommandFromHermesTranscript(result.transcript),
              presence: presence.phase
            })

            if (action === 'summon') {
              markBasilAmbientWakeDetected()
              emitBasilSummonRequest({ source: 'ambient-wake' })

              return
            }

            if (action === 'hide') {
              markBasilAmbientHideDetected()
              emitBasilPresenceCommand('hide')

              return
            }

            restartDelay = NON_WAKE_COOLDOWN_MS
            setBasilAmbientWakeStatus('paused')
          }
        }

        scheduleStart(restartDelay, () => void startCycle())
      } catch (error) {
        reportError(error)
        scheduleStart(RETRY_AFTER_ERROR_MS, () => void startCycle())
      } finally {
        closing = false
      }
    }

    void startCycle()

    return () => {
      generationRef.current += 1
      clearTimers()
      handleRef.current.cancel()
    }
  }, [directive, presence.phase])

  return null
}
