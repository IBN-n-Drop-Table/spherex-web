import { useEffect, useState } from 'react'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { PauseIcon, PlayIcon } from '../components/icons'
import { cx } from '../components/classes'

interface Frame {
  src: string
  /** What this frame is, e.g. "Visit 1 · Aug 2025". */
  label: string
}

interface Props {
  frames: Frame[]
  alt: string
  /** Milliseconds each frame stays up. */
  every?: number
  className?: string
  /** Small: for the feature strip, where the control sits over the picture. */
  compact?: boolean
}

/**
 * Two (or more) real SPHEREx visits of the same patch, flicked back and forth: the oldest trick for
 * finding what moved. Pauses on request, and starts paused for people who ask for less motion.
 */
export default function BlinkFigure({ frames, alt, every = 850, className, compact }: Props) {
  const calm = useMediaQuery('(prefers-reduced-motion: reduce)')
  const [chosen, setChosen] = useState<boolean | null>(null) // null: follow the motion preference
  const playing = chosen ?? !calm
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (!playing) return
    const t = setInterval(() => setIndex(i => (i + 1) % frames.length), every)
    return () => clearInterval(t)
  }, [playing, every, frames.length])

  return (
    <figure className={className}>
      <div className="relative aspect-square overflow-hidden border border-rule-strong bg-sunken">
        {/* every frame stays mounted, so flicking never waits for the network */}
        {frames.map((f, i) => (
          <img
            key={f.src}
            src={f.src}
            alt={i === index ? alt : ''}
            draggable={false}
            className={cx('absolute inset-0 h-full w-full select-none [image-rendering:pixelated]', i === index ? 'opacity-100' : 'opacity-0')}
          />
        ))}
        {/* finder-chart ticks: the middle of each edge */}
        <span aria-hidden="true" className="absolute left-1/2 top-0 h-3 w-px bg-paper/70" />
        <span aria-hidden="true" className="absolute bottom-0 left-1/2 h-3 w-px bg-paper/70" />
        <span aria-hidden="true" className="absolute left-0 top-1/2 h-px w-3 bg-paper/70" />
        <span aria-hidden="true" className="absolute right-0 top-1/2 h-px w-3 bg-paper/70" />
        <span className="label-caps absolute left-2 top-2 bg-ink/85 px-2 py-0.5 text-paper" aria-live="off">
          {frames[index].label}
        </span>
        <button
          type="button"
          onClick={() => setChosen(!playing)}
          aria-label={playing ? 'Pause the flicker' : 'Play the flicker'}
          title={playing ? 'Pause' : 'Play'}
          className={cx(
            'absolute bottom-2 right-2 inline-flex items-center gap-1.5 border border-paper/70 bg-ink/85 text-paper transition-colors hover:bg-ink',
            compact ? 'h-9 w-9 justify-center' : 'h-9 px-2.5 text-xs',
          )}
        >
          {playing ? <PauseIcon className="h-4 w-4" /> : <PlayIcon className="h-4 w-4" />}
          {!compact && (playing ? 'Pause' : 'Play')}
        </button>
        {!playing && (
          <button
            type="button"
            onClick={() => setIndex(i => (i + 1) % frames.length)}
            className={cx('absolute bottom-2 left-2 h-9 border border-paper/70 bg-ink/85 px-2.5 text-xs text-paper hover:bg-ink')}
          >
            Other visit
          </button>
        )}
      </div>
    </figure>
  )
}
