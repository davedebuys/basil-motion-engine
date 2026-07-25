import { deriveBasilAccessoryAttachment } from './accessory-attachment-engine'
import type { BasilPropCompositionRole } from './prop-composition-engine'
import type { BasilInteractionAccessory } from './types'

interface InteractionAccessoryProps {
  accessory: BasilInteractionAccessory
  beat: number
  gripOpacity?: number
  opacity?: number
  progress: number
  role?: BasilPropCompositionRole
  side?: -1 | 1
}

export function InteractionAccessory({
  accessory,
  beat,
  gripOpacity = 1,
  opacity = 0.88,
  progress,
  role = 'interaction',
  side
}: InteractionAccessoryProps) {
  const pose = deriveBasilAccessoryAttachment({ accessory, beat, progress, side })
  const transform = `translate(${pose.propX} ${pose.propY}) rotate(${pose.propRotation}) scale(${pose.propScaleX} ${pose.propScaleY})`

  const common = {
    fill: 'var(--ui-chat-surface-background)',
    stroke: 'currentColor',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    strokeWidth: 1.55
  }

  let cue

  switch (accessory) {
    case 'antenna':
      cue = (
        <>
          <path d="M 0 8 V -7" fill="none" />
          <circle cx="0" cy="-10" r="2.4" />
          <path d="M 6 -7 Q 11 -11 12 -5" fill="none" opacity="0.7" />
        </>
      )

      break

    case 'book':
      cue = (
        <>
          <path d="M -12 -8 Q -6 -10 0 -5 V 10 Q -6 6 -12 8 Z" />
          <path d="M 12 -8 Q 6 -10 0 -5 V 10 Q 6 6 12 8 Z" />
        </>
      )

      break

    case 'chart':
      cue = (
        <>
          <rect height="22" rx="3" width="25" x="-12.5" y="-11" />
          <path d="M -8 7 V 1 M -2 7 V -4 M 4 7 V 3 M 9 7 V -7" fill="none" strokeWidth="2.2" />
        </>
      )

      break

    case 'check':
      cue = (
        <>
          <circle r="12" />
          <path d="M -6 0 L -1 5 L 7 -5" fill="none" strokeWidth="2.2" />
        </>
      )

      break

    case 'code':
      cue = (
        <>
          <rect height="22" rx="3" width="28" x="-14" y="-11" />
          <path d="M -4 -5 L -9 0 L -4 5 M 4 -5 L 9 0 L 4 5 M 2 -8 L -2 8" fill="none" />
        </>
      )

      break

    case 'compass':
      cue = (
        <>
          <circle r="12" />
          <path d="M -5 6 L -1 -4 L 6 -7 L 2 4 Z" />
          <circle fill="currentColor" r="1.4" />
        </>
      )

      break

    case 'confetti':
      cue = (
        <g fill="currentColor" stroke="none">
          <rect height="3" transform="rotate(20)" width="3" x="-12" y="-8" />
          <circle cx="9" cy="-8" r="1.8" />
          <path d="M -8 7 L -4 4 L -2 9 Z" />
          <rect height="3" transform="rotate(-24)" width="3" x="7" y="5" />
          <path d="M 0 -12 V -7 M -13 0 H -8 M 8 2 H 14" fill="none" stroke="currentColor" strokeWidth="1.4" />
        </g>
      )

      break

    case 'ear':
      cue = (
        <path
          d="M 2 -11 C -8 -13 -12 -4 -9 4 C -7 11 2 13 5 6 C 7 1 0 1 0 6 C -1 8 -4 7 -4 4"
          fill="none"
          strokeWidth="2"
        />
      )

      break

    case 'folder':
      cue = (
        <>
          <path d="M -13 -8 H -3 L 1 -4 H 13 V 10 H -13 Z" />
          <path d="M -13 -2 H 13 L 10 11 H -10 Z" />
        </>
      )

      break

    case 'glasses':
      cue = (
        <>
          <circle cx="-11" fill="none" r="7" />
          <circle cx="11" fill="none" r="7" />
          <path d="M -4 0 Q 0 -3 4 0 M -18 -1 L -23 -4 M 18 -1 L 23 -4" fill="none" />
        </>
      )

      break

    case 'heart':
      cue = <path d="M 0 10 C -15 1 -11 -10 -4 -10 C 0 -10 2 -6 2 -4 C 4 -8 7 -10 10 -8 C 17 -2 10 5 0 10 Z" />

      break

    case 'idea':
      cue = (
        <>
          <path d="M -8 -2 C -9 -10 -2 -14 4 -11 C 11 -8 9 0 5 4 L 4 8 H -4 L -5 4 C -7 2 -8 0 -8 -2 Z" />
          <path d="M -4 11 H 4 M -14 -6 L -11 -4 M 13 -6 L 10 -4 M 0 -17 V -14" fill="none" />
        </>
      )

      break

    case 'key':
      cue = (
        <>
          <circle cx="-5" cy="-3" r="7" />
          <path d="M 0 2 L 11 13 M 6 8 L 10 4 M 9 11 L 13 7" fill="none" strokeWidth="2.2" />
        </>
      )

      break

    case 'keyboard':
      cue = (
        <>
          <rect height="17" rx="3" width="29" x="-14.5" y="-8.5" />
          <path
            d="M -10 -4 H -7 M -3 -4 H 0 M 4 -4 H 7 M 9 -4 H 11 M -10 1 H -7 M -3 1 H 0 M 4 1 H 7 M -7 5 H 7"
            fill="none"
          />
        </>
      )

      break

    case 'link':
      cue = (
        <>
          <path
            d="M -2 -5 L 3 -10 C 9 -16 17 -7 11 -1 L 6 4 M 2 5 L -3 10 C -9 16 -17 7 -11 1 L -6 -4"
            fill="none"
            strokeWidth="2"
          />
          <path d="M -5 5 L 5 -5" fill="none" />
        </>
      )

      break

    case 'magnifier':
      cue = (
        <>
          <circle cx="-3" cy="-3" r="9" />
          <path d="M 4 4 L 13 13" fill="none" strokeWidth="2.8" />
        </>
      )

      break

    case 'moon':
      cue = <path d="M 6 -12 C -5 -9 -7 5 2 10 C -7 12 -14 4 -11 -5 C -9 -12 -1 -16 6 -12 Z" fill="currentColor" />

      break

    case 'pencil':
      cue = (
        <>
          <path d="M -9 10 L -7 3 L 7 -11 L 12 -6 L -2 8 Z" />
          <path d="M 7 -11 L 12 -6 M -7 3 L -2 8" fill="none" />
        </>
      )

      break

    case 'question':
      cue = (
        <>
          <path d="M -6 -6 C -5 -14 8 -15 9 -6 C 10 0 1 0 1 6" fill="none" strokeWidth="2.2" />
          <circle cy="11" fill="currentColor" r="1.7" stroke="none" />
        </>
      )

      break

    case 'shield':
      cue = (
        <>
          <path d="M 0 -13 L 11 -8 V 1 C 11 8 5 12 0 15 C -5 12 -11 8 -11 1 V -8 Z" />
          <path d="M -5 0 L -1 4 L 6 -4" fill="none" />
        </>
      )

      break

    case 'spark':
      cue = <path d="M 0 -14 L 3 -4 L 13 0 L 3 4 L 0 14 L -3 4 L -13 0 L -3 -4 Z" fill="currentColor" />

      break

    case 'speech':
      cue = (
        <>
          <path d="M -14 -10 H 14 V 7 H 3 L -4 13 V 7 H -14 Z" />
          <circle cx="-7" cy="-2" fill="currentColor" r="1.2" stroke="none" />
          <circle cy="-2" fill="currentColor" r="1.2" stroke="none" />
          <circle cx="7" cy="-2" fill="currentColor" r="1.2" stroke="none" />
        </>
      )

      break

    case 'terminal':
      cue = (
        <>
          <rect height="22" rx="3" width="28" x="-14" y="-11" />
          <path d="M -8 -4 L -3 0 L -8 4 M 0 5 H 8" fill="none" strokeWidth="1.8" />
        </>
      )

      break

    case 'warning':
      cue = (
        <>
          <path d="M 0 -14 L 14 12 H -14 Z" />
          <path d="M 0 -6 V 3" fill="none" strokeWidth="2.3" />
          <circle cy="8" fill="currentColor" r="1.4" stroke="none" />
        </>
      )

      break

    case 'wave':
      cue = (
        <>
          <path d="M -4 12 C -11 4 -9 -6 -5 -5 C -3 -5 -4 1 -2 1 C -2 -9 2 -10 3 -4 C 4 -11 8 -9 7 -3 C 10 -8 13 -5 10 2 C 8 8 3 12 -4 12 Z" />
          <path d="M 13 -10 Q 18 -5 14 0 M 17 -14 Q 25 -5 19 4" fill="none" opacity="0.7" />
        </>
      )

      break
  }

  return (
    <>
      {pose.attachment === 'held' && gripOpacity > 0 && (
        <g
          data-basil-interaction-grip={accessory}
          data-basil-interaction-grip-side={pose.side}
          fill="var(--ui-chat-surface-background)"
          opacity={pose.grip * gripOpacity}
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path
            d={`M ${pose.shoulderX} ${pose.shoulderY} Q ${pose.elbowX} ${pose.elbowY} ${pose.handX} ${pose.handY}`}
            fill="none"
            strokeWidth="2.2"
          />
          <circle cx={pose.handX} cy={pose.handY} r="3.15" strokeWidth="1.35" />
          <path
            d={`M ${pose.handX - pose.side * 1.1} ${pose.handY - 1.8} Q ${pose.handX + pose.side * 2.8} ${pose.handY - 3.8} ${pose.handX + pose.side * 4} ${pose.handY - 0.8}`}
            fill="none"
            strokeWidth="1.05"
          />
        </g>
      )}
      <g
        {...common}
        data-basil-interaction-accessory={accessory}
        data-basil-interaction-attachment={pose.attachment}
        data-basil-interaction-beat={beat}
        data-basil-interaction-role={role}
        data-basil-interaction-side={pose.side}
        opacity={opacity}
        transform={transform}
      >
        {cue}
      </g>
    </>
  )
}
