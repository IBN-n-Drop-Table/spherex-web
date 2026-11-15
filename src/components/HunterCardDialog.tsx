import { useEffect, useState } from 'react'
import { HUNTER_CARD_HEIGHT, HUNTER_CARD_WIDTH, renderHunterCard } from '../lib/hunterCard'
import type { FinishResult } from '../types/api'
import { Button, Dialog } from './ui'
import { btnPrimary } from './classes'

type Preview = { blob: Blob; url: string } | { error: string }

/** Preview of the "Star hunter" card of a finished game, with download / share actions. */
export default function HunterCardDialog({ result, onClose }: { result: FinishResult; onClose: () => void }) {
  const [preview, setPreview] = useState<Preview | null>(null)

  useEffect(() => {
    let cancelled = false
    let url: string | null = null
    Promise.resolve()
      .then(() => renderHunterCard(result))
      .then(
        canvas =>
          canvas.toBlob(blob => {
            if (cancelled) return
            if (!blob) return setPreview({ error: 'Could not create the image.' })
            url = URL.createObjectURL(blob)
            setPreview({ blob, url })
          }, 'image/png'),
      )
      .catch(() => !cancelled && setPreview({ error: 'Could not draw the card.' }))
    return () => {
      cancelled = true
      if (url) URL.revokeObjectURL(url)
    }
  }, [result])


  const ready = preview && 'blob' in preview ? preview : null
  const filename = `star-hunter-${result.nickname.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`
  const file = ready ? new File([ready.blob], filename, { type: 'image/png' }) : null
  const canShare = Boolean(file && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] }))
  const share = async () => {
    if (!file) return
    try {
      await navigator.share({ files: [file], title: 'Star hunter', text: `I scored ${result.score} finding what moves in SPHEREx images` })
    } catch {
      /* the user dismissed the share sheet */
    }
  }

  return (
    <Dialog title="Star hunter card" onClose={onClose} width="max-w-3xl" raised>
      <div className="space-y-3">
        <div className="overflow-hidden border border-rule-strong bg-sunken" style={{ aspectRatio: `${HUNTER_CARD_WIDTH} / ${HUNTER_CARD_HEIGHT}` }}>
          {ready ? (
            <img src={ready.url} alt={`Star hunter ${result.nickname}: ${result.score} points`} className="h-full w-full" data-testid="hunter-card-img" />
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
        </div>
      </div>
    </Dialog>
  )
}
