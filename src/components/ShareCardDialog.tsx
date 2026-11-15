import { useEffect, useState } from 'react'
import { CARD_HEIGHT, CARD_WIDTH, renderShareCard, type CardImage } from '../lib/shareCard'
import { classificationInfo, reportLink } from '../lib/reports'
import type { CitizenReport } from '../types/api'
import { Button, Dialog } from './ui'
import { btnPrimary } from './classes'

interface Props {
  report: CitizenReport
  /** Image to crop the sighting from; without it the card is text-only. */
  image: CardImage | null
  title?: string
  onClose: () => void
}

type Preview = { blob: Blob; url: string } | { error: string }

/** Preview of the shareable sighting card, with download / share / copy-link actions. */
export default function ShareCardDialog({ report, image, title = 'Sighting card', onClose }: Props) {
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


  const ready = preview && 'blob' in preview ? preview : null
  const filename = `sighting-${(report.target_name ?? 'sky').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${report.id.slice(0, 8)}.png`
  const file = ready ? new File([ready.blob], filename, { type: 'image/png' }) : null
  const canShare = Boolean(file && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] }))

  const share = async () => {
    if (!file) return
    try {
      await navigator.share({ files: [file], title: `${label} candidate · ${report.target_name ?? ''}`, text: 'A SPHEREx citizen-science sighting (unverified)', url: link })
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

  return (
    <Dialog title={title} onClose={onClose} width="max-w-3xl" raised>
      <div className="space-y-3">
        <div className="overflow-hidden border border-rule-strong bg-sunken" style={{ aspectRatio: `${CARD_WIDTH} / ${CARD_HEIGHT}` }}>
          {ready ? (
            <img src={ready.url} alt={`${label} candidate by ${report.discoverer}`} className="h-full w-full" data-testid="share-card-img" />
          ) : (
            <div className="flex h-full items-center justify-center text-muted">{preview && 'error' in preview ? preview.error : 'Drawing the card…'}</div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {ready && (
            <a href={ready.url} download={filename} className={btnPrimary}>
              Download PNG
            </a>
          )}
          {canShare && <Button onClick={share}>Share…</Button>}
          <Button onClick={copyLink}>Copy link</Button>
          {note && <span className="text-xs text-muted">{note}</span>}
        </div>
        <p className="break-all font-mono text-2xs text-faint">{link}</p>
        <p className="text-2xs text-faint">The card says it is an unverified candidate. It never claims a finding.</p>
      </div>
    </Dialog>
  )
}
