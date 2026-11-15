import { useState, type FormEvent } from 'react'
import { submitReport } from '../api/spherex'
import type { ReportsState } from '../hooks/useReports'
import { useVerify } from '../hooks/useVerify'
import {
  CLASSIFICATIONS,
  HANDLE_MAX,
  NOTES_MAX,
  describeReportError,
  loadHandle,
  saveHandle,
} from '../lib/reports'
import type { CardImage } from '../lib/shareCard'
import type { CitizenReport, Classification } from '../types/api'
import ReportCard from './ReportCard'
import ShareCardDialog from './ShareCardDialog'

/** What a new report would be about: the selected anomaly or the clicked point. */
export interface ReportSelection {
  label: string // "anom_04 · disappeared" / "Clicked point"
  ra: number
  dec: number
  pixel?: { x: number; y: number }
  anomalyId?: string
}

interface Props {
  targetName: string
  selection: ReportSelection | null
  /** The image on screen: the card crops the sighting from it. */
  cardImage: CardImage | null
  feed: ReportsState
  allTargets: boolean
  onAllTargetsChange: (v: boolean) => void
  /** Draw the reports as markers on the image. */
  showMarkers: boolean
  onShowMarkersChange: (v: boolean) => void
  /** Report to outline (its marker was clicked). */
  highlightId: string | null
  onClose: () => void
}

/** Community feed for the current target, plus the form to report a sighting. */
export default function CommunityPanel({
  targetName,
  selection,
  cardImage,
  feed,
  allTargets,
  onAllTargetsChange,
  showMarkers,
  onShowMarkersChange,
  highlightId,
  onClose,
}: Props) {
  const [mode, setMode] = useState<'feed' | 'form'>('feed')
  const verify = useVerify(feed.replace)
  const [feedNote, setFeedNote] = useState<string | null>(null)
  const [sharing, setSharing] = useState<CitizenReport | null>(null)

  // form
  const [handle, setHandle] = useState(loadHandle)
  const [classification, setClassification] = useState<Classification | ''>('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const trimmedHandle = handle.trim()
  const canSubmit = Boolean(selection && classification && trimmedHandle) && !submitting

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!selection || !classification || !trimmedHandle) return
    setSubmitting(true)
    setFormError(null)
    try {
      const created = await submitReport({
        discoverer: trimmedHandle,
        classification,
        ra_deg: selection.ra,
        dec_deg: selection.dec,
        target_name: targetName,
        ...(notes.trim() ? { notes: notes.trim() } : {}),
        ...(selection.pixel ? { pixel_x: selection.pixel.x, pixel_y: selection.pixel.y } : {}),
        ...(selection.anomalyId ? { anomaly_id: selection.anomalyId } : {}),
      })
      saveHandle(trimmedHandle)
      setNotes('')
      setClassification('')
      setFeedNote('Report sent. Thank you!')
      feed.reload()
      setMode('feed')
      setSharing(created) // the card is the natural next step
    } catch (err) {
      setFormError(describeReportError(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="w-[26rem] max-w-[calc(100vw-1.5rem)] rounded bg-black/80 p-3 text-xs backdrop-blur">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-sm font-medium text-slate-100">
            {mode === 'feed' ? 'Community sightings' : 'Report a sighting'}
          </div>
          <div className="text-slate-400">
            {mode === 'feed' ? (allTargets ? 'all targets' : targetName) : `about ${targetName}`}
          </div>
        </div>
        <div className="flex gap-1">
          {mode === 'feed' ? (
            <button
              onClick={() => {
                setFeedNote(null)
                setMode('form')
              }}
              className="rounded bg-sky-600 px-2 py-1 hover:bg-sky-500"
            >
              + Report
            </button>
          ) : (
            <button onClick={() => setMode('feed')} className="rounded bg-slate-800 px-2 py-1 hover:bg-slate-700">
              ← Feed
            </button>
          )}
          <button onClick={onClose} aria-label="Close community" className="rounded bg-slate-800 px-2 py-1 hover:bg-slate-700">
            ✕
          </button>
        </div>
      </div>

      {mode === 'feed' ? (
        <>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-slate-400">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={showMarkers} onChange={e => onShowMarkersChange(e.target.checked)} />
              Show on the image
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={allTargets} onChange={e => onAllTargetsChange(e.target.checked)} />
              Every target
            </label>
          </div>
          {(feedNote || verify.error) && (
            <p className="mt-2 rounded bg-slate-800 px-2 py-1 text-slate-200">{verify.error ?? feedNote}</p>
          )}
          <div className="mt-2 max-h-72 overflow-y-auto pr-1">
            {feed.loading ? (
              <p className="text-slate-400">Loading…</p>
            ) : feed.error ? (
              <p className="text-rose-300">{feed.error}</p>
            ) : feed.reports.length === 0 ? (
              <p className="text-slate-400">No reports yet. Be the first to report a sighting.</p>
            ) : (
              <ul className="space-y-2" data-testid="report-list">
                {feed.reports.map(r => (
                  <ReportCard
                    key={r.id}
                    report={r}
                    verified={verify.verified.has(r.id)}
                    busy={verify.verifying === r.id}
                    highlighted={r.id === highlightId}
                    onVerify={() => verify.confirm(r)}
                    onShare={() => setSharing(r)}
                  />
                ))}
              </ul>
            )}
          </div>
        </>
      ) : (
        <form onSubmit={submit} className="mt-2 space-y-2" data-testid="report-form">
          <div className="rounded border border-slate-700 p-2">
            {selection ? (
              <>
                <div className="text-slate-100">{selection.label}</div>
                <div className="font-mono text-[10px] text-slate-400">
                  {selection.ra.toFixed(4)}°, {selection.dec.toFixed(4)}°
                  {selection.pixel ? ` · px ${selection.pixel.x},${selection.pixel.y}` : ''}
                </div>
              </>
            ) : (
              <p className="text-amber-200">
                First pick what you are reporting: click an anomaly (Difference layer) or any point of the image.
              </p>
            )}
          </div>

          <label className="block">
            <span className="text-slate-400">Your name or handle</span>
            <input
              value={handle}
              onChange={e => setHandle(e.target.value)}
              maxLength={HANDLE_MAX}
              required
              className="mt-0.5 w-full rounded bg-slate-900 px-2 py-1 outline-none ring-1 ring-slate-700 focus:ring-sky-500"
            />
          </label>

          <label className="block">
            <span className="text-slate-400">What is it?</span>
            <select
              value={classification}
              onChange={e => setClassification(e.target.value as Classification)}
              required
              className="mt-0.5 w-full rounded bg-slate-900 px-2 py-1 outline-none ring-1 ring-slate-700 focus:ring-sky-500"
            >
              <option value="" disabled>
                Choose…
              </option>
              {CLASSIFICATIONS.map(c => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-slate-400">
              Notes (optional) · {notes.length}/{NOTES_MAX}
            </span>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              maxLength={NOTES_MAX}
              rows={3}
              className="mt-0.5 w-full resize-none rounded bg-slate-900 px-2 py-1 outline-none ring-1 ring-slate-700 focus:ring-sky-500"
            />
          </label>

          {formError && <p className="rounded border border-rose-900 px-2 py-1 text-rose-200">{formError}</p>}
          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full rounded bg-sky-600 py-1.5 hover:bg-sky-500 disabled:opacity-40"
          >
            {submitting ? 'Sending…' : 'Send report'}
          </button>
        </form>
      )}

      {sharing && <ShareCardDialog report={sharing} image={cardImage} onClose={() => setSharing(null)} />}
    </div>
  )
}
