import type { JobProgress } from '../lib/jobs'

const STAGE_LABEL: Record<string, string> = {
  queued: 'Queued',
  query: 'Searching IRSA',
  download: 'Downloading cutouts',
  stack: 'Combining exposures',
  render: 'Rendering images',
  done: 'Done',
}

/** Stage, percentage, ETA and the backend's own message for a running live job. */
export default function JobProgressBar({ job, fallbackText }: { job: JobProgress | null; fallbackText: string }) {
  const pct = Math.round((job?.progress ?? 0) * 100)
  return (
    <div className="space-y-2 text-sm">
      <div className="flex justify-between">
        <span>{STAGE_LABEL[job?.stage ?? 'queued'] ?? job?.stage}</span>
        <span className="tabular-nums text-slate-400">
          {pct}%{job?.etaSeconds != null ? ` · ~${job.etaSeconds}s left` : ''}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded bg-slate-700">
        <div className="h-full bg-sky-500 transition-all" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-slate-300">{job?.message ?? fallbackText}</p>
    </div>
  )
}
