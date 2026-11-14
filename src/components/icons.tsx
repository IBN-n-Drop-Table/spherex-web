// Material Design icons (Apache 2.0), inlined so there is no font/CDN dependency.
const make = (d: string) =>
  function Icon({ className = 'h-5 w-5' }: { className?: string }) {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
        <path d={d} />
      </svg>
    )
  }

export const PlayIcon = make('M8 5v14l11-7z')
export const PauseIcon = make('M6 19h4V5H6v14zm8-14v14h4V5h-4z')
export const SkipPreviousIcon = make('M6 6h2v12H6zm3.5 6l8.5 6V6z')
export const SkipNextIcon = make('M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z')
export const ChevronLeftIcon = make('M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z')
export const ChevronRightIcon = make('M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z')
