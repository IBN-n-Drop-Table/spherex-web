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

/** Stage, percentage, ETA and the backend's own message for a running live job. */
export default function JobProgressBar({ job, fallbackText }: { job: JobProgress | null; fallbackText: string }) {
  const pct = Math.round((job?.progress ?? 0) * 100)
  const phrase = useRotatingPhrase(job?.stage === 'difference' ? 'subtraction' : 'generic')
  return (
    <div className="space-y-2 text-sm">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-display text-lg text-paper">{STAGE_LABEL[job?.stage ?? 'queued'] ?? job?.stage}</span>
        <span className="font-mono text-xs tabular-nums text-muted">
          {pct}%{job?.etaSeconds != null ? ` · ~${job.etaSeconds} s left` : ''}
        </span>
      </div>
      <div className="h-0.5 bg-rule-strong" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
        <div className="h-full bg-accent transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-muted">{job?.message ?? fallbackText}</p>
      {/* ambience, never status: it sits under the real progress */}
      <p className="font-display text-sm italic text-faint">{phrase}</p>
    </div>
  )
}
