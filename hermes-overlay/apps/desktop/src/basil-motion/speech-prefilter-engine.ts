export interface BasilSpeechPrefilterResult {
  available: boolean
  candidate: boolean
}

export type BasilSpeechPrefilterDecision = 'discard' | 'transcribe'

export function deriveBasilSpeechPrefilterDecision({
  available,
  candidate
}: BasilSpeechPrefilterResult): BasilSpeechPrefilterDecision {
  return available && !candidate ? 'discard' : 'transcribe'
}
