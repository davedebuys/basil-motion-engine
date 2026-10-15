/**
 * Standalone replacement for the Hermes `@/lib/icons` module.
 *
 * The Basil overlay only reaches for these four exports (the ambient-wake
 * indicator). They are drawn here as minimal monochrome SVGs in the same
 * lucide-style contract — accept a `className`, inherit `currentColor` — so the
 * vendored `ambient-wake-indicator.tsx` compiles and renders unchanged.
 */

import type { SVGProps } from 'react'

/** Icon size ladder, expressed as Tailwind `size-*` utilities. */
export const iconSize = {
  lg: 'size-8',
  md: 'size-5',
  sm: 'size-4',
  xs: 'size-3.5'
} as const

export interface IconProps extends SVGProps<SVGSVGElement> {
  className?: string
}

function Icon({ children, className, ...rest }: IconProps) {
  return (
    <svg
      aria-hidden
      className={className}
      fill="none"
      height="1em"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      viewBox="0 0 24 24"
      width="1em"
      {...rest}
    >
      {children}
    </svg>
  )
}

export function Loader2(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </Icon>
  )
}

export function Mic(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" x2="12" y1="19" y2="22" />
    </Icon>
  )
}

export function MicOff(props: IconProps) {
  return (
    <Icon {...props}>
      <line x1="2" x2="22" y1="2" y2="22" />
      <path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2" />
      <path d="M5 10v2a7 7 0 0 0 12 5" />
      <path d="M15 9.34V5a3 3 0 0 0-5.68-1.33" />
      <path d="M9 9v3a3 3 0 0 0 5.12 2.12" />
      <line x1="12" x2="12" y1="19" y2="22" />
    </Icon>
  )
}
