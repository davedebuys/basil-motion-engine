import type { BasilPresencePose } from './presence-engine'

interface BasilPresenceCueProps {
  pose: BasilPresencePose
  size: number
}

export function BasilPresenceCue({ pose, size }: BasilPresenceCueProps) {
  if (pose.phase === 'visible' || pose.phase === 'hidden') {
    return null
  }

  const portalWidth = 20 + pose.portalWidth * 66
  const ringRadius = 35 * pose.ringScale

  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-visible"
      data-basil-presence-cue={pose.phase}
      height={size}
      style={{ opacity: pose.cueOpacity }}
      viewBox="0 0 140 140"
      width={size}
    >
      <g fill="none" stroke="currentColor" strokeLinecap="round">
        <ellipse
          cx="70"
          cy="109"
          opacity={0.2 + pose.ringOpacity * 0.7}
          rx={portalWidth / 2}
          ry={2 + pose.ringOpacity * 2.4}
          strokeWidth="1.5"
        />
        <path
          d={`M ${70 - portalWidth / 2} 109 Q 70 ${105 - pose.ringOpacity * 3} ${70 + portalWidth / 2} 109`}
          opacity={pose.ringOpacity}
          strokeWidth="1.1"
        />
        <circle
          cx="70"
          cy="70"
          opacity={pose.ringOpacity * 0.38}
          r={ringRadius}
          strokeDasharray="3 8"
          strokeWidth="1"
          transform={`rotate(${pose.progress * 95} 70 70)`}
        />
        <path
          d="M 70 13 V 24 M 64.5 18.5 H 75.5 M 25 46 L 31 50 M 112 42 L 106 48"
          opacity={pose.starOpacity}
          strokeWidth="1.3"
        />
      </g>
      <g fill="currentColor" opacity={pose.starOpacity}>
        <path d="M 110 70 L 112 75 L 117 77 L 112 79 L 110 84 L 108 79 L 103 77 L 108 75 Z" />
        <circle cx="30" cy="76" r="1.4" />
        <circle cx="97" cy="25" r="1.1" />
      </g>
    </svg>
  )
}
