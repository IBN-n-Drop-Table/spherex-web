import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { HUNTER_CARD_HEIGHT, HUNTER_CARD_WIDTH, renderHunterCard } from '../lib/hunterCard'
import type { FinishResult } from '../types/api'

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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

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

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-4" onClick={onClose} role="dialog" aria-modal="true" aria-label="Star hunter card">
      <div className="w-[min(92vw,760px)] space-y-3 rounded-lg bg-slate-900 p-4 text-sm text-slate-100 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-medium">Star hunter card</h2>
          <button onClick={onClose} aria-label="Close" className="rounded bg-slate-800 px-2 py-1 hover:bg-slate-700">
            ✕
          </button>
        </div>
        <div className="overflow-hidden rounded bg-black" style={{ aspectRatio: `${HUNTER_CARD_WIDTH} / ${HUNTER_CARD_HEIGHT}` }}>
          {ready ? (
            <img src={ready.url} alt={`Star hunter ${result.nickname}: ${result.score} points`} className="h-full w-full" data-testid="hunter-card-img" />
          ) : (
            <div className="flex h-full items-center justify-center text-slate-400">{preview && 'error' in preview ? preview.error : 'Drawing the card…'}</div>
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
        </div>
      </div>
    </div>,
    document.body,
  )
}
