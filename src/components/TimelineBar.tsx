import {
  ChevronLeftIcon, ChevronRightIcon, PauseIcon, PlayIcon, SkipNextIcon, SkipPreviousIcon,
} from './icons'

/** One step of the player: an epoch (labelled with its date) or a difference between two visits. */
export interface TimelineFrame {
  label: string
}

interface Props {
  frames: TimelineFrame[]
  index: number
  playing: boolean
  fps: number
  onIndex: (i: number) => void
  onToggle: () => void
  onPrev: () => void
  onNext: () => void
  onFpsClick: () => void
}

const btn = 'inline-flex items-center px-1.5 py-1 hover:text-sky-400 disabled:opacity-40'

export default function TimelineBar({
  frames, index, playing, fps, onIndex, onToggle, onPrev, onNext, onFpsClick,
}: Props) {
  const frame = frames[index]
  const none = frames.length === 0 // no data yet: same bar, everything disabled
  const multi = frames.length > 1
  return (
    <div className="absolute bottom-0 left-0 right-28 z-10 flex items-center gap-3 bg-black/80 backdrop-blur px-4 py-2 text-sm text-white">
      <button className={btn} onClick={onFpsClick} disabled={none} title="Playback speed">{fps} fps</button>
      <button className={btn} onClick={() => onIndex(0)} disabled={!multi} aria-label="First frame" title="First frame"><SkipPreviousIcon /></button>
      <button className={btn} onClick={onPrev} disabled={!multi} aria-label="Previous frame" title="Previous frame"><ChevronLeftIcon /></button>
      <button className={btn} onClick={onToggle} disabled={!multi} aria-label={playing ? 'Pause' : 'Play'}>
        {playing ? <PauseIcon /> : <PlayIcon />}
      </button>
      <button className={btn} onClick={onNext} disabled={!multi} aria-label="Next frame" title="Next frame"><ChevronRightIcon /></button>
      <button className={btn} onClick={() => onIndex(frames.length - 1)} disabled={!multi} aria-label="Last frame" title="Last frame"><SkipNextIcon /></button>
      <input
        type="range" min={0} max={Math.max(frames.length - 1, 0)} step={1} value={index}
        onChange={e => onIndex(Number(e.target.value))} disabled={!multi}
        className="flex-1" aria-label="Frame"
      />
      <span className="tabular-nums">{none ? 0 : index + 1}/{frames.length} Frame</span>
      <span className="tabular-nums">{frame ? frame.label : '—'}</span>
    </div>
  )
}
