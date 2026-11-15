import type { ReactNode } from 'react'

interface IconProps {
  className?: string
}

// Filled glyphs for the player (Material Design icons, Apache 2.0), inlined: no font, no CDN.
const fill = (d: string) =>
  function Icon({ className = 'h-5 w-5' }: IconProps) {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
        <path d={d} />
      </svg>
    )
  }

// Line icons drawn for this app: one weight (1.5), round joins, 24 px grid.
const line = (children: ReactNode) =>
  function Icon({ className = 'h-5 w-5' }: IconProps) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden="true"
      >
        {children}
      </svg>
    )
  }

export const PlayIcon = fill('M8 5v14l11-7z')
export const PauseIcon = fill('M6 19h4V5H6v14zm8-14v14h4V5h-4z')
export const SkipPreviousIcon = fill('M6 6h2v12H6zm3.5 6l8.5 6V6z')
export const SkipNextIcon = fill('M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z')
export const ChevronLeftIcon = line(<path d="M14.5 6l-6 6 6 6" />)
export const ChevronRightIcon = line(<path d="M9.5 6l6 6-6 6" />)
export const ChevronDownIcon = line(<path d="M6 9.5l6 6 6-6" />)
export const ChevronUpIcon = line(<path d="M6 14.5l6-6 6 6" />)
export const ArrowRightIcon = line(<path d="M4.5 12h15M13.5 6l6 6-6 6" />)
export const ArrowLeftIcon = line(<path d="M19.5 12h-15M10.5 6l-6 6 6 6" />)
export const CloseIcon = line(<path d="M6 6l12 12M18 6L6 18" />)
export const MinusIcon = line(<path d="M5 12h14" />)
export const CheckIcon = line(<path d="M5 12.5l4.5 4.5L19 7.5" />)
export const InfoIcon = line(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5.5M12 7.6v.2" />
  </>,
)
export const WarningIcon = line(
  <>
    <path d="M12 4.5l8.5 15h-17z" />
    <path d="M12 10v4.5M12 17v.2" />
  </>,
)

/** Points of interest: a ringed object with the four ticks of a finder chart. */
export const TargetIcon = line(
  <>
    <circle cx="12" cy="12" r="5" />
    <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3" />
  </>,
)
/** Point at the sky: a horizon with a line of sight going up. */
export const AimIcon = line(
  <>
    <path d="M3 18.5h18" />
    <path d="M5.5 18.5a6.5 6.5 0 0 1 13 0" />
    <path d="M12 18.5l5.5-12M17.5 6.5l-3.2 1.2M17.5 6.5l.4 3.4" />
  </>,
)
/** Compare: one frame split by a bar. */
export const CompareIcon = line(
  <>
    <rect x="3" y="5" width="18" height="14" rx="1" />
    <path d="M12 3v18" />
    <path d="M6.5 15l2-3 1.5 2M15 9.5h3M15 12h3M15 14.5h3" />
  </>,
)
/** Find what moves: two frames, slightly offset, and the thing that jumped. */
export const BlinkIcon = line(
  <>
    <rect x="3" y="3" width="13" height="13" rx="1" />
    <path d="M8 21h12a1 1 0 0 0 1-1V8" />
    <circle cx="8" cy="8.5" r="1.2" />
    <circle cx="11.5" cy="11" r="1.2" strokeDasharray="1.2 1.6" />
  </>,
)
/** Sightings: a map pin. */
export const PinIcon = line(
  <>
    <path d="M12 21s-6.5-5.6-6.5-10.5a6.5 6.5 0 1 1 13 0C18.5 15.4 12 21 12 21z" />
    <circle cx="12" cy="10.5" r="2.2" />
  </>,
)
/** Spectrum: light spread by wavelength. */
export const SpectrumIcon = line(<path d="M3 16c1.6 0 1.6-8 3.2-8s1.6 5 3.2 5 1.6-9 3.2-9 1.6 12 3.2 12 1.6-4 3.2-4 1.2 2 2 2" />)
/** Light curve: brightness against time. */
export const CurveIcon = line(
  <>
    <path d="M4 4v16h16" />
    <path d="M7.5 14.5l3.5-5 3.5 3 4-6" />
  </>,
)
/** Ask: a speech bubble. */
export const ChatIcon = line(<path d="M5 5h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-7.5L7 20v-4H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z" />)
export const ShareIcon = line(
  <>
    <path d="M12 15V4M8 7.5L12 4l4 3.5" />
    <path d="M5 12v7h14v-7" />
  </>,
)
export const LocateIcon = line(
  <>
    <circle cx="12" cy="12" r="6.5" />
    <circle cx="12" cy="12" r="1.5" />
    <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3" />
  </>,
)
export const PlusIcon = line(<path d="M12 5v14M5 12h14" />)
