import type { BasilPersonalityPose } from './personality-engine'

interface BasilPersonalityCueProps {
  pose?: BasilPersonalityPose | null
}

const PAPER = 'var(--ui-chat-surface-background, #fbfaf6)'

function cueForPose(pose: BasilPersonalityPose) {
  const wave = Math.sin(pose.propPhase * Math.PI * 6)
  const spin = pose.propPhase * 720

  switch (pose.motif) {
    case 'peek':
      return (
        <>
          <rect fill={PAPER} height="112" stroke="currentColor" strokeWidth="1.4" width="31" x="23" y="-56" />
          <path d="M 23 -40 H 34 M 23 40 H 34" fill="none" opacity="0.38" stroke="currentColor" />
          <circle cx="18" cy="-17" fill={PAPER} r="2.2" stroke="currentColor" />
        </>
      )

    case 'fort':
      return (
        <g transform="translate(0 25)">
          <path d="M -47 -10 H -12 L -7 -4 H 47 V 31 H -47 Z" fill={PAPER} stroke="currentColor" strokeWidth="1.5" />
          <path d="M -47 -4 H 47" fill="none" opacity="0.45" stroke="currentColor" />
          <path d="M -14 4 Q 0 -2 14 4" fill="none" opacity="0.3" stroke="currentColor" />
        </g>
      )

    case 'folder':
      return (
        <g transform="translate(24 9) rotate(-8)">
          <path d="M -10 -36 H 13 L 18 -29 H 37 V 39 H -10 Z" fill={PAPER} stroke="currentColor" strokeWidth="1.5" />
          <path d="M -10 -27 H 37" fill="none" opacity="0.42" stroke="currentColor" />
          <path d="M -2 -17 H 29 M -2 -10 H 22" fill="none" opacity="0.22" stroke="currentColor" />
        </g>
      )

    case 'chase':
      return (
        <g fill="none" stroke="currentColor" strokeLinecap="round">
          <path d="M 42 -19 L 57 -6 L 49 -4 L 54 7 L 49 9 L 44 -2 L 37 4 Z" fill={PAPER} strokeWidth="1.4" />
          <path d="M 26 -12 H 14 M 31 0 H 20 M 23 11 H 16" opacity="0.42" strokeWidth="1.2" />
        </g>
      )

    case 'elevator':
      return (
        <g transform="translate(48 0)">
          <path d="M 0 -47 V 47" fill="none" opacity="0.4" stroke="currentColor" strokeWidth="2" />
          <rect fill={PAPER} height="22" rx="3" stroke="currentColor" strokeWidth="1.4" width="10" x="-5" y={wave * 19 - 11} />
          <path d="M -3 -36 L 0 -40 L 3 -36 M -3 36 L 0 40 L 3 36" fill="none" stroke="currentColor" />
        </g>
      )

    case 'tabs':
      return (
        <g transform="translate(0 46)">
          <path d="M -50 0 H 50" fill="none" stroke="currentColor" strokeWidth="1.5" />
          {[-33, -4, 25].map((x, index) => (
            <path
              d="M -11 0 V -9 Q -11 -13 -7 -13 H 7 Q 11 -13 11 -9 V 0"
              fill={index === 1 ? 'currentColor' : PAPER}
              key={x}
              opacity={index === 1 ? 0.82 : 1}
              stroke="currentColor"
              transform={`translate(${x} 0)`}
            />
          ))}
        </g>
      )

    case 'surf':
      return (
        <g transform="translate(0 44)">
          <path d="M -51 0 Q -34 -7 -17 0 T 17 0 T 51 0" fill="none" stroke="currentColor" strokeWidth="1.7" />
          <path d="M -24 7 Q -12 2 0 7 T 24 7" fill="none" opacity="0.32" stroke="currentColor" />
          <path d="M -15 -5 Q 0 -10 15 -5" fill="none" stroke="currentColor" strokeWidth="2" />
        </g>
      )

    case 'typing':
      return (
        <g transform="translate(0 42)">
          <path d="M -34 -12 H 34 L 39 10 H -39 Z" fill={PAPER} stroke="currentColor" strokeLinejoin="round" strokeWidth="1.5" />
          {[-24, -16, -8, 0, 8, 16, 24].map((x, index) => (
            <path d="M -2 0 H 2" key={x} stroke="currentColor" strokeWidth={index % 2 === 0 ? 2 : 1.2} transform={`translate(${x} ${index % 2 ? 2 : -3})`} />
          ))}
          <circle cx={wave * 20} cy="-16" fill="currentColor" r="1.4" />
        </g>
      )

    case 'courier':
      return (
        <g transform={`translate(42 ${wave * 3}) rotate(${wave * 4})`}>
          <path d="M -15 -13 H 15 V 13 H -15 Z" fill={PAPER} stroke="currentColor" strokeWidth="1.5" />
          <path d="M -15 -13 L 0 -2 L 15 -13 M 0 -2 V 13" fill="none" opacity="0.5" stroke="currentColor" />
          <path d="M -23 -4 H -34 M -21 4 H -29" fill="none" opacity="0.46" stroke="currentColor" strokeLinecap="round" />
        </g>
      )

    case 'drag':
      return (
        <g transform={`translate(42 ${wave * 2}) rotate(${-6 + wave * 3})`}>
          <path d="M -15 -21 H 8 L 16 -13 V 22 H -15 Z" fill={PAPER} stroke="currentColor" strokeLinejoin="round" strokeWidth="1.5" />
          <path d="M 8 -21 V -13 H 16 M -8 -5 H 9 M -8 2 H 7" fill="none" opacity="0.38" stroke="currentColor" />
          <path d="M -23 10 Q -30 16 -24 23" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" />
        </g>
      )

    case 'download':
      return (
        <g transform="translate(0 46)">
          <rect fill={PAPER} height="10" rx="2" stroke="currentColor" width="70" x="-35" y="-5" />
          <rect fill="currentColor" height="6" opacity="0.7" rx="1" width={64 * pose.progress} x="-32" y="-3" />
          <path d="M 0 -27 V -11 M -7 -17 L 0 -10 L 7 -17" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
        </g>
      )

    case 'hypnosis':
      return (
        <g fill="none" stroke="currentColor" strokeLinecap="round" transform={`translate(43 -27) rotate(${spin})`}>
          <circle opacity="0.24" r="14" strokeWidth="1" />
          <path d="M 0 -14 A 14 14 0 0 1 14 0" strokeWidth="2.1" />
          <circle cy="-14" fill="currentColor" r="1.7" stroke="none" />
        </g>
      )

    case 'detective':
      return (
        <g transform={`translate(39 ${-8 + wave * 2}) rotate(${-12 + wave * 3})`}>
          <circle cx="-3" cy="-5" fill={PAPER} r="12" stroke="currentColor" strokeWidth="1.6" />
          <path d="M 6 4 L 18 17" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="3" />
          <path d="M -8 -10 Q -3 -14 2 -11" fill="none" opacity="0.46" stroke="currentColor" />
        </g>
      )

    case 'bandage':
      return (
        <g transform={`translate(42 ${wave * 2}) rotate(-12)`}>
          <path d="M -20 -7 H 20 Q 25 -7 25 0 Q 25 7 20 7 H -20 Q -25 7 -25 0 Q -25 -7 -20 -7 Z" fill={PAPER} stroke="currentColor" strokeWidth="1.4" />
          <rect fill="none" height="10" opacity="0.45" rx="2" stroke="currentColor" width="12" x="-6" y="-5" />
          <circle cx="-15" r="1" /><circle cx="15" r="1" />
        </g>
      )

    case 'guardian':
      return (
        <g transform="translate(43 0)">
          <path d="M 0 -31 L 25 -20 V 2 Q 25 23 0 33 Q -25 23 -25 2 V -20 Z" fill={PAPER} stroke="currentColor" strokeLinejoin="round" strokeWidth="1.6" />
          <path d="M -10 0 L -2 8 L 12 -9" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.3" />
        </g>
      )

    case 'high-five':
      return (
        <g fill={PAPER} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" transform={`translate(44 ${-4 + wave * 2})`}>
          <path d="M -8 21 V 0 L -10 -18 Q -10 -23 -6 -23 Q -3 -23 -3 -18 V -5 V -27 Q -3 -31 1 -31 Q 5 -31 5 -27 V -6 V -24 Q 5 -28 9 -28 Q 13 -28 13 -24 V -4 V -18 Q 13 -22 17 -22 Q 21 -22 21 -18 V 2 Q 21 20 7 25 Z" strokeWidth="1.4" />
          <path d="M -18 -22 L -24 -28 M -21 -13 H -29 M -12 -29 L -14 -37" fill="none" opacity="0.62" strokeWidth="1.3" />
        </g>
      )

    case 'ambush':
      return (
        <>
          <path d="M 28 -54 H 54 V 54 H 28 Q 39 34 31 17 Q 42 0 31 -17 Q 39 -34 28 -54 Z" fill={PAPER} stroke="currentColor" strokeWidth="1.4" />
          <g fill="currentColor" opacity="0.66" transform="translate(18 -33)">
            <path d="M 0 -5 L 2 -1 L 6 0 L 2 1 L 0 5 L -2 1 L -6 0 L -2 -1 Z" />
            <path d="M -14 13 L -13 16 L -10 17 L -13 18 L -14 21 L -15 18 L -18 17 L -15 16 Z" />
          </g>
        </>
      )

    case 'tea':
      return (
        <g transform="translate(39 28)">
          <path d="M -15 -8 H 13 V 10 Q 13 19 0 19 Q -13 19 -13 10 Z" fill={PAPER} stroke="currentColor" strokeWidth="1.5" />
          <path d="M 13 -3 Q 25 -4 23 6 Q 21 13 13 10" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M -7 -14 Q -11 -21 -6 -27 M 3 -14 Q -1 -21 4 -27" fill="none" opacity="0.42" stroke="currentColor" strokeLinecap="round" transform={`translate(0 ${wave})`} />
        </g>
      )

    case 'tidy':
      return (
        <g transform="translate(40 4)">
          {[
            [-14, -24, pose.progress * 8],
            [3, -4, -pose.progress * 5],
            [-13, 17, pose.progress * 3]
          ].map(([x, y, rotate], index) => (
            <rect fill={PAPER} height="18" key={index} rx="2" stroke="currentColor" transform={`translate(${x} ${y}) rotate(${rotate})`} width="24" x="-12" y="-9" />
          ))}
          <path d="M -26 34 H 25" fill="none" opacity="0.42" stroke="currentColor" strokeLinecap="round" />
        </g>
      )

    case 'bedtime':
      return (
        <g>
          <path d="M -45 27 Q -30 17 -14 27 V 42 H -45 Z" fill={PAPER} stroke="currentColor" strokeWidth="1.4" />
          <path d="M 38 -38 Q 22 -23 38 -8 Q 24 -8 18 -18 Q 15 -30 24 -39 Q 30 -44 38 -38 Z" fill="currentColor" opacity="0.82" />
          <g fill="currentColor" fontFamily="monospace" fontSize="11" opacity="0.6" transform={`translate(43 ${-2 - pose.progress * 8})`}>
            <text x="-2" y="0">z</text>
            <text fontSize="8" x="7" y="-8">z</text>
          </g>
        </g>
      )
  }
}

export function BasilPersonalityCue({ pose }: BasilPersonalityCueProps) {
  if (!pose || pose.intensity <= 0.015) {
    return null
  }

  return (
    <g
      data-basil-personality-cue={pose.motif}
      data-basil-personality-id={pose.id}
      data-basil-personality-stage={pose.stage}
      opacity={Math.min(0.96, pose.intensity)}
      strokeLinecap="round"
      strokeLinejoin="round"
      transform={`translate(70 67) scale(${pose.side} 1)`}
    >
      {cueForPose(pose)}
    </g>
  )
}
