import { useEffect, useRef } from 'react'
import { classificationInfo, timeAgo } from '../lib/reports'
import type { CitizenReport } from '../types/api'
import { Button } from './ui'
import { cx } from './classes'
import { CheckIcon, LocateIcon, ShareIcon } from './icons'

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
    <li ref={ref} data-report-id={report.id} className={cx('border-l-2 py-3 pl-3 pr-4', highlighted ? 'border-accent bg-accent-wash' : 'border-transparent')}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="flex items-center gap-2">
          <span aria-hidden="true" className="inline-block h-2 w-2 rotate-45" style={{ background: kind.color }} />
          <span className="text-sm font-medium text-paper">{kind.label}</span>
        </span>
        <span className="text-2xs text-faint">{timeAgo(report.created_at)}</span>
      </div>
      <div className="mt-0.5 text-xs text-muted">
        by {report.discoverer}
        {report.target_name ? ` · ${report.target_name}` : ''}
        {report.anomaly_id ? ` · ${report.anomaly_id}` : ''}
      </div>
      {report.notes && <p className="mt-1 font-display text-sm italic leading-snug text-paper">{report.notes}</p>}
      <div className="mt-1 font-mono text-2xs text-faint">
        {report.ra_deg.toFixed(4)}°, {report.dec_deg.toFixed(4)}°
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {onLocate && (
          <Button size="sm" onClick={onLocate} title="Show this position on the map">
            <LocateIcon className="h-4 w-4" /> Go to
          </Button>
        )}
        <Button size="sm" onClick={onShare} title="Create a card to share this sighting">
          <ShareIcon className="h-4 w-4" /> Share
        </Button>
        <Button size="sm" onClick={onVerify} disabled={verified || busy} pressed={verified || undefined} title={verified ? 'You already confirmed this report' : 'I can see it too'}>
          <CheckIcon className="h-4 w-4" /> {verified ? 'Confirmed' : 'I see it too'} · {report.verifications_count}
        </Button>
      </div>
    </li>
  )
}
