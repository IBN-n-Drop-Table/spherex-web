import type { JobProgress } from '../lib/jobs'
import { useRotatingPhrase } from '../hooks/useRotatingPhrase'

const STAGE_LABEL: Record<string, string> = {
  queued: 'Queued',
  query: 'Searching IRSA',
  download: 'Downloading cutouts',
  stack: 'Combining exposures',
  render: 'Rendering images',
  difference: 'Comparing visits',
  done: 'Done',
}

// The backend's progress message sometimes carries its own fixed estimate, "(~58 s estimated)".
// When the live countdown (`eta_s`) is on screen the two would disagree, so the estimate is dropped
// from the message. This only trims a display string; with no countdown the message stays whole.
const ESTIMATE_IN_MESSAGE = /\s*\(~?\d+\s*s(?:ec(?:onds)?)?\s*(?:estimated|estimate|left|remaining)\)/i
const withoutEstimate = (message: string) => message.replace(ESTIMATE_IN_MESSAGE, '')

/**
 * Stage, percentage, ETA and the backend's own message for a running live job.
 * `large` is for the full-screen wait (a new place can take about a minute): everything is bigger,
 * so it reads from across a room and nobody mistakes the wait for a freeze.
 */
export default function JobProgressBar({ job, fallbackText, large = false }: { job: JobProgress | null; fallbackText: string; large?: boolean }) {
  const pct = Math.round((job?.progress ?? 0) * 100)
  const phrase = useRotatingPhrase(job?.stage === 'difference' ? 'subtraction' : 'generic')
  return (
    <div className={large ? 'space-y-3' : 'space-y-2 text-sm'}>
      <div className="flex items-baseline justify-between gap-4">
        <span className={large ? 'font-display text-2xl leading-tight text-paper' : 'font-display text-lg text-paper'}>
          {STAGE_LABEL[job?.stage ?? 'queued'] ?? job?.stage}
        </span>
        <span className={large ? 'whitespace-nowrap font-mono text-sm tabular-nums text-muted' : 'font-mono text-xs tabular-nums text-muted'}>
          {pct}%{job?.etaSeconds != null ? ` · ~${job.etaSeconds} s left` : ''}
        </span>
      </div>
      <div className={large ? 'h-1 bg-rule-strong' : 'h-0.5 bg-rule-strong'} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
        <div className="h-full bg-accent transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      <p className={large ? 'text-sm leading-snug text-muted' : 'text-xs text-muted'}>{job?.message ? (job.etaSeconds != null ? withoutEstimate(job.message) : job.message) : fallbackText}</p>
      {/* ambience, never status: it sits under the real progress */}
      <p className={large ? 'border-t border-rule pt-3 font-display text-lg italic leading-snug text-faint' : 'font-display text-sm italic text-faint'}>{phrase}</p>
    </div>
  )
}
