import { emitBasilPresenceCommand } from '../presence'
import type { BasilPresenceCommand } from '../presence-engine'

const SUMMON_PHRASES = new Set([
  'basil appear',
  'basil come here',
  'basil come out',
  'basil come out now',
  'basil i need you',
  'basil show yourself',
  'basil wake up'
])

const HIDE_PHRASES = new Set([
  'basil disappear',
  'basil go away',
  'basil go back',
  'basil go to sleep',
  'basil good night',
  'basil hide',
  'basil hide now',
  'basil tuck away',
  'basil you can hide',
  'basil you can hide now'
])

function normalizeTranscript(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

function withoutWakePrefix(text: string): string {
  return text.replace(/^(?:hey|ok|okay|please)\s+/, '')
}

export function basilPresenceCommandFromHermesTranscript(text: string): BasilPresenceCommand | null {
  const normalized = withoutWakePrefix(normalizeTranscript(text))

  if (SUMMON_PHRASES.has(normalized)) {
    return 'summon'
  }

  if (HIDE_PHRASES.has(normalized)) {
    return 'hide'
  }

  return null
}

export function handleHermesBasilPresenceTranscript(text: string): boolean {
  const command = basilPresenceCommandFromHermesTranscript(text)

  if (!command) {
    return false
  }

  emitBasilPresenceCommand(command)

  return true
}
