import { ChevronLeftIcon, ChevronRightIcon, PauseIcon, PlayIcon, SkipNextIcon, SkipPreviousIcon } from './icons'
import { IconButton } from './ui'

/** One step of the player: an epoch (labelled with its date) or a difference between two visits. */
export interface TimelineFrame {
  label: string
}

interface Props {
  frames: TimelineFrame[]
  index: number
  playing: boolean
  fps: number
  fpsOptions: number[]
  onFps: (fps: number) => void
  onIndex: (i: number) => void
  onToggle: () => void
  onPrev: () => void
  onNext: () => void
}

/** The time bar under the picture: step, play, scrub, and how fast it plays. */
export default function TimelineBar({ frames, index, playing, fps, fpsOptions, onFps, onIndex, onToggle, onPrev, onNext }: Props) {
  const frame = frames[index]
  const none = frames.length === 0 // no data yet: same bar, everything disabled
  const multi = frames.length > 1
  return (
    <div className="flex min-h-12 shrink-0 items-center gap-1 border-t border-rule bg-surface px-2 md:gap-2 md:px-3">
      <IconButton label="First frame" onClick={() => onIndex(0)} disabled={!multi} className="max-sm:hidden">
        <SkipPreviousIcon />
      </IconButton>
      <IconButton label="Previous frame" onClick={onPrev} disabled={!multi}>
        <ChevronLeftIcon />
      </IconButton>
      <button
        type="button"
        onClick={onToggle}
        disabled={!multi}
        aria-label={playing ? 'Pause' : 'Play'}
        title={playing ? 'Pause' : 'Play: flick through the frames'}
        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-accent-ink transition-colors hover:bg-accent-strong disabled:opacity-40 md:h-9 md:w-9"
      >
        {playing ? <PauseIcon /> : <PlayIcon />}
      </button>
      <IconButton label="Next frame" onClick={onNext} disabled={!multi}>
        <ChevronRightIcon />
      </IconButton>
      <IconButton label="Last frame" onClick={() => onIndex(frames.length - 1)} disabled={!multi} className="max-sm:hidden">
        <SkipNextIcon />
      </IconButton>
      <input
        type="range"
        min={0}
        max={Math.max(frames.length - 1, 0)}
        step={1}
        value={index}
        onChange={e => onIndex(Number(e.target.value))}
        disabled={!multi}
        className="mx-1 min-w-0 flex-1"
        aria-label="Frame"
      />
      <div className="shrink-0 text-right font-mono text-2xs leading-tight sm:text-xs">
        <div className="text-paper">{frame ? frame.label : '—'}</div>
        <div className="text-faint">
          frame {none ? 0 : index + 1} of {frames.length}
        </div>
      </div>
      <label className="ml-1 flex shrink-0 items-center gap-1.5 text-2xs text-faint" title="How many frames per second it plays">
        <span className="max-sm:sr-only">Speed</span>
        <select
          value={fps}
          onChange={e => onFps(Number(e.target.value))}
          disabled={none}
          aria-label="Playback speed"
          className="h-11 rounded-ctl border border-rule-strong bg-sunken px-1 font-mono text-xs text-paper disabled:opacity-40 md:h-8"
        >
          {fpsOptions.map(f => (
            <option key={f} value={f}>
              {f} fps
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}
