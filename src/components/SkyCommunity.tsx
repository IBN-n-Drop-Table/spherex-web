import { useState } from 'react'
import type { ReportsState } from '../hooks/useReports'
import { useVerify } from '../hooks/useVerify'
import type { CitizenReport } from '../types/api'
import ReportCard from './ReportCard'
import ShareCardDialog from './ShareCardDialog'

interface Props {
  open: boolean
  onToggle: () => void
  feed: ReportsState
  /** Draw the reports as markers on the sky map. */
  showMarkers: boolean
  onShowMarkersChange: (v: boolean) => void
  highlightId: string | null
  /** Move the map to a report. */
  onLocate: (report: CitizenReport) => void
}

/** Community discoveries on the sky map: the list, a switch for the markers, and "go to". */
export default function SkyCommunity({ open, onToggle, feed, showMarkers, onShowMarkersChange, highlightId, onLocate }: Props) {
  const verify = useVerify(feed.replace)
  const [sharing, setSharing] = useState<CitizenReport | null>(null)

  return (
    <div className="relative">
      <button
        onClick={onToggle}
        aria-expanded={open}
        className={`flex w-full items-center justify-between gap-3 rounded px-3 py-2 text-sm backdrop-blur ${
          open ? 'bg-sky-600' : 'bg-black/70 hover:bg-slate-800'
        }`}
      >
        <span>Community discoveries</span>
        {open && !feed.loading && !feed.error && <span className="tabular-nums text-xs">{feed.reports.length}</span>}
      </button>

      {open && (
        <div className="mt-2 w-[26rem] max-w-[calc(100vw-1.5rem)] rounded bg-black/80 p-3 text-xs backdrop-blur" data-testid="sky-community">
          <label className="flex items-center gap-2 text-slate-300">
            <input type="checkbox" checked={showMarkers} onChange={e => onShowMarkersChange(e.target.checked)} />
            Show on the map
          </label>
          <p className="mt-1 text-[11px] text-slate-500">
            To report your own discovery, open the SPHEREx data view and use its Community panel.
          </p>
          {verify.error && <p className="mt-2 rounded bg-slate-800 px-2 py-1 text-slate-200">{verify.error}</p>}
          <div className="mt-2 max-h-52 overflow-y-auto pr-1">
            {feed.loading ? (
              <p className="text-slate-400">Loading…</p>
            ) : feed.error ? (
              <p className="text-rose-300">{feed.error}</p>
            ) : feed.reports.length === 0 ? (
              <p className="text-slate-400">No reports yet.</p>
            ) : (
              <ul className="space-y-2" data-testid="sky-report-list">
                {feed.reports.map(r => (
                  <ReportCard
                    key={r.id}
                    report={r}
                    verified={verify.verified.has(r.id)}
                    busy={verify.verifying === r.id}
                    highlighted={r.id === highlightId}
                    onLocate={() => onLocate(r)}
                    onVerify={() => verify.confirm(r)}
                    onShare={() => setSharing(r)}
                  />
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
      {sharing && <ShareCardDialog report={sharing} image={null} onClose={() => setSharing(null)} />}
    </div>
  )
}
