import { useEffect, useRef } from 'react'
import { classificationInfo, timeAgo } from '../lib/reports'
import type { CitizenReport } from '../types/api'

interface Props {
  report: CitizenReport
  verified: boolean
  busy: boolean
  /** Outlined and scrolled into view (e.g. after clicking its marker on the map). */
  highlighted?: boolean
  onVerify: () => void
  onShare: () => void
  /** Move the map to this report (sky view). */
  onLocate?: () => void
}

/** One community report in a feed. */
export default function ReportCard({ report, verified, busy, highlighted, onVerify, onShare, onLocate }: Props) {
  const kind = classificationInfo(report.classification)
  const ref = useRef<HTMLLIElement>(null)
  useEffect(() => {
    if (highlighted) ref.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [highlighted])

  return (
    <li
      ref={ref}
      data-report-id={report.id}
      className={`rounded border p-2 ${highlighted ? 'border-sky-400 bg-sky-950/40' : 'border-slate-700'}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5">
          <span style={{ color: kind.color }}>◆</span>
          <span className="font-medium text-slate-100">{kind.label}</span>
        </span>
        <span className="text-[11px] text-slate-400">{timeAgo(report.created_at)}</span>
      </div>
      <div className="mt-0.5 text-[11px] text-slate-400">
        by {report.discoverer}
        {report.target_name ? ` · ${report.target_name}` : ''}
        {report.anomaly_id ? ` · ${report.anomaly_id}` : ''}
      </div>
      {report.notes && <p className="mt-1 text-slate-300">{report.notes}</p>}
      <div className="mt-1 flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] text-slate-500">
          {report.ra_deg.toFixed(4)}°, {report.dec_deg.toFixed(4)}°
        </span>
        <span className="flex gap-1">
          {onLocate && (
            <button onClick={onLocate} title="Show this position on the map" className="rounded bg-sky-700 px-2 py-0.5 text-[11px] hover:bg-sky-600">
              Go to
            </button>
          )}
          <button
            onClick={onShare}
            title="Create a card to share this discovery"
            className="rounded bg-slate-800 px-2 py-0.5 text-[11px] hover:bg-slate-700"
          >
            Share
          </button>
          <button
            onClick={onVerify}
            disabled={verified || busy}
            title={verified ? 'You already confirmed this report' : 'I can see it too'}
            className="rounded bg-slate-800 px-2 py-0.5 text-[11px] hover:bg-slate-700 disabled:opacity-60"
          >
            {verified ? '✓ confirmed' : '✓ confirm'} · {report.verifications_count}
          </button>
        </span>
      </div>
    </li>
  )
}
