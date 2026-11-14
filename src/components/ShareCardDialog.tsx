import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { CARD_HEIGHT, CARD_WIDTH, renderShareCard, type CardImage } from '../lib/shareCard'
import { classificationInfo, reportLink } from '../lib/reports'
import type { CitizenReport } from '../types/api'

interface Props {
  report: CitizenReport
  /** Image to crop the discovery from; without it the card is text-only. */
  image: CardImage | null
  title?: string
  onClose: () => void
}

type Preview = { blob: Blob; url: string } | { error: string }

/** Preview of the shareable discovery card, with download / share / copy-link actions. */
export default function ShareCardDialog({ report, image, title = 'Discovery card', onClose }: Props) {
  const [preview, setPreview] = useState<Preview | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const link = reportLink(report)
  const label = classificationInfo(report.classification).label

  useEffect(() => {
    let cancelled = false
    let url: string | null = null
    renderShareCard(report, image)
      .then(
        canvas =>
          new Promise<void>(resolve =>
            canvas.toBlob(blob => {
              if (cancelled) return resolve()
              if (!blob) setPreview({ error: 'Could not create the image.' })
              else {
                url = URL.createObjectURL(blob)
                setPreview({ blob, url })
              }
              resolve()
            }, 'image/png'),
          ),
      )
      .catch(() => !cancelled && setPreview({ error: 'Could not draw the card.' }))
    return () => {
      cancelled = true
      if (url) URL.revokeObjectURL(url)
    }
  }, [report, image])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const ready = preview && 'blob' in preview ? preview : null
  const filename = `discovery-${(report.target_name ?? 'sky').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${report.id.slice(0, 8)}.png`
  const file = ready ? new File([ready.blob], filename, { type: 'image/png' }) : null
  const canShare = Boolean(file && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] }))

  const share = async () => {
    if (!file) return
    try {
      await navigator.share({ files: [file], title: `${label} candidate · ${report.target_name ?? ''}`, text: 'A SPHEREx citizen-science discovery candidate', url: link })
    } catch {
      /* the user dismissed the share sheet */
    }
  }
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link)
      setNote('Link copied')
    } catch {
      setNote('Could not copy: select the link below')
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="w-[min(92vw,760px)] space-y-3 rounded-lg bg-slate-900 p-4 text-sm text-slate-100 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-medium">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded bg-slate-800 px-2 py-1 hover:bg-slate-700">
            ✕
          </button>
        </div>

        <div className="overflow-hidden rounded bg-black" style={{ aspectRatio: `${CARD_WIDTH} / ${CARD_HEIGHT}` }}>
          {ready ? (
            <img src={ready.url} alt={`${label} candidate by ${report.discoverer}`} className="h-full w-full" data-testid="share-card-img" />
          ) : (
            <div className="flex h-full items-center justify-center text-slate-400">
              {preview && 'error' in preview ? preview.error : 'Drawing the card…'}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {ready && (
            <a href={ready.url} download={filename} className="rounded bg-sky-600 px-3 py-1.5 hover:bg-sky-500">
              Download PNG
            </a>
          )}
          {canShare && (
            <button onClick={share} className="rounded bg-slate-700 px-3 py-1.5 hover:bg-slate-600">
              Share…
            </button>
          )}
          <button onClick={copyLink} className="rounded bg-slate-700 px-3 py-1.5 hover:bg-slate-600">
            Copy link
          </button>
          {note && <span className="text-xs text-slate-400">{note}</span>}
        </div>
        <p className="break-all font-mono text-[11px] text-slate-500">{link}</p>
      </div>
    </div>,
    document.body,
  )
}
