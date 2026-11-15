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
import { Button, Callout, Check, Field, Panel, type DockControls } from './ui'
import { fieldClass } from './classes'
import { ArrowLeftIcon, PlusIcon } from './icons'

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
  dock: DockControls
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
  dock,
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
    <Panel
      title={mode === 'feed' ? 'Community sightings' : 'Report a sighting'}
      subtitle={mode === 'feed' ? (allTargets ? 'Every object' : targetName) : `About ${targetName}`}
      actions={
        mode === 'feed' ? (
          <Button
            size="sm"
            variant="primary"
            onClick={() => {
              setFeedNote(null)
              setMode('form')
            }}
          >
            <PlusIcon className="h-4 w-4" /> Report
          </Button>
        ) : (
          <Button size="sm" onClick={() => setMode('feed')}>
            <ArrowLeftIcon className="h-4 w-4" /> Feed
          </Button>
        )
      }
      className="h-full"
      flush
      {...dock}
    >
      {mode === 'feed' ? (
        <>
          <div className="space-y-2 border-b border-rule px-4 py-3">
            <div className="flex flex-wrap gap-x-5 gap-y-1">
              <Check checked={showMarkers} onChange={onShowMarkersChange}>
                Mark them on the image
              </Check>
              <Check checked={allTargets} onChange={onAllTargetsChange}>
                Include every object
              </Check>
            </div>
            <p className="text-2xs text-faint">Sightings are candidates reported by people. None is confirmed until others check it.</p>
            {(feedNote || verify.error) && <Callout tone={verify.error ? 'error' : 'info'}>{verify.error ?? feedNote}</Callout>}
          </div>
          {feed.loading ? (
            <p className="px-4 py-3 text-xs text-muted">Loading…</p>
          ) : feed.error ? (
            <div className="p-4">
              <Callout tone="error">{feed.error}</Callout>
            </div>
          ) : feed.reports.length === 0 ? (
            <p className="px-4 py-3 text-xs text-muted">No reports yet. Be the first to report a sighting.</p>
          ) : (
            <ul className="divide-y divide-rule" data-testid="report-list">
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
        </>
      ) : (
        <form onSubmit={submit} className="space-y-4 p-4" data-testid="report-form">
          <div>
            <div className="label-caps mb-1 text-faint">What you are reporting</div>
            {selection ? (
              <div className="border-l-2 border-accent pl-3">
                <div className="text-sm text-paper">{selection.label}</div>
                <div className="font-mono text-2xs text-muted">
                  {selection.ra.toFixed(4)}°, {selection.dec.toFixed(4)}°
                  {selection.pixel ? ` · px ${selection.pixel.x},${selection.pixel.y}` : ''}
                </div>
              </div>
            ) : (
              <Callout tone="caution">First pick it on the picture: click any point, or one of the circles of the Detections layer.</Callout>
            )}
          </div>

          <Field label="Your name or handle">
            <input value={handle} onChange={e => setHandle(e.target.value)} maxLength={HANDLE_MAX} required className={fieldClass} />
          </Field>

          <Field label="What do you think it is?">
            <select value={classification} onChange={e => setClassification(e.target.value as Classification)} required className={fieldClass}>
              <option value="" disabled>
                Choose…
              </option>
              {CLASSIFICATIONS.map(c => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label={`Notes (optional) · ${notes.length}/${NOTES_MAX}`}>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} maxLength={NOTES_MAX} rows={3} className={`${fieldClass} resize-none`} />
          </Field>

          {formError && (
            <Callout tone="error" live>
              {formError}
            </Callout>
          )}
          <Button type="submit" variant="primary" disabled={!canSubmit} className="w-full">
            {submitting ? 'Sending…' : 'Send report'}
          </Button>
          <p className="text-2xs text-faint">A report is a candidate for others to check. It is not a confirmed finding.</p>
        </form>
      )}

      {sharing && <ShareCardDialog report={sharing} image={cardImage} onClose={() => setSharing(null)} />}
    </Panel>
  )
}
