import { formatDec, formatRa } from './coords'
import { classificationInfo, reportLink } from './reports'
import { skyToPixel } from './wcs'
import type { CitizenReport, Patch } from '../types/api'

export const CARD_WIDTH = 1200
export const CARD_HEIGHT = 630

/** The image to crop the discovery from, with the geometry needed to find the position in it. */
export interface CardImage {
  url: string
  patch: Patch
  targetName: string // the report is only drawn on it if it is about this target
}

const CUTOUT_PX = 110 // image pixels shown around the discovery (about 55 arcsec)
const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
const MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace'

/** Deterministic pseudo-random numbers, so a report always gets the same star field. */
function seeded(seed: string) {
  let h = 2166136261
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619)
  return () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0) / 4294967296)
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const lines: string[] = []
  let line = ''
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word
    if (ctx.measureText(next).width <= maxWidth || !line) line = next
    else {
      lines.push(line)
      line = word
    }
  }
  if (line) lines.push(line)
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines)
    kept[maxLines - 1] = kept[maxLines - 1].replace(/\s*\S*$/, '') + '…'
    return kept
  }
  return lines
}

/** Fetches the image with CORS so the canvas stays exportable; null if it can't be read. */
async function loadBitmap(url: string): Promise<ImageBitmap | null> {
  try {
    const res = await fetch(url, { mode: 'cors' })
    if (!res.ok) return null
    return await createImageBitmap(await res.blob())
  } catch {
    return null
  }
}

/** Where the report sits in the image (continuous pixels), or null when it is not in it. */
export function positionInImage(report: CitizenReport, image: CardImage): { x: number; y: number } | null {
  const { width_px, height_px } = image.patch
  const sameTarget = report.target_name?.toLowerCase() === image.targetName.toLowerCase()
  if (!sameTarget) return null
  const p =
    report.pixel_x != null && report.pixel_y != null
      ? { x: report.pixel_x + 0.5, y: report.pixel_y + 0.5 } // the reporter's own pixel
      : skyToPixel(image.patch, report.ra_deg, report.dec_deg)
  return p && p.x >= 0 && p.y >= 0 && p.x < width_px && p.y < height_px ? p : null
}

/**
 * Draws the shareable discovery card (1200x630, the size social networks preview).
 * Honest by design: it says "candidate" and "needs verification", never "discovered".
 */
export async function renderShareCard(report: CitizenReport, image: CardImage | null): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas')
  canvas.width = CARD_WIDTH
  canvas.height = CARD_HEIGHT
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas is not available')
  const kind = classificationInfo(report.classification)

  // background + a deterministic star field
  const bg = ctx.createRadialGradient(300, 200, 40, 600, 315, 800)
  bg.addColorStop(0, '#111a2e')
  bg.addColorStop(1, '#03050a')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT)
  const rnd = seeded(report.id)
  for (let i = 0; i < 160; i++) {
    ctx.fillStyle = `rgba(255,255,255,${0.08 + rnd() * 0.45})`
    const r = rnd() < 0.08 ? 1.6 : 0.8
    ctx.fillRect(rnd() * CARD_WIDTH, rnd() * CARD_HEIGHT, r, r)
  }

  // cutout (left)
  const box = { x: 60, y: 90, size: 450 }
  ctx.fillStyle = '#000'
  ctx.fillRect(box.x, box.y, box.size, box.size)
  const pos = image ? positionInImage(report, image) : null
  const bitmap = image && pos ? await loadBitmap(image.url) : null
  if (image && pos && bitmap) {
    // the bitmap may differ in size from the patch grid: scale the crop with it
    const k = bitmap.width / image.patch.width_px
    const half = CUTOUT_PX / 2
    const sx = Math.min(Math.max(pos.x - half, 0), image.patch.width_px - CUTOUT_PX)
    const sy = Math.min(Math.max(pos.y - half, 0), image.patch.height_px - CUTOUT_PX)
    ctx.imageSmoothingEnabled = false // keep SPHEREx's real pixels visible
    ctx.drawImage(bitmap, sx * k, sy * k, CUTOUT_PX * k, CUTOUT_PX * k, box.x, box.y, box.size, box.size)
    const px = box.x + ((pos.x - sx) / CUTOUT_PX) * box.size
    const py = box.y + ((pos.y - sy) / CUTOUT_PX) * box.size
    ctx.strokeStyle = kind.color
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(px, py, 34, 0, Math.PI * 2)
    ctx.stroke()
    ctx.fillStyle = 'rgba(255,255,255,0.85)'
    ctx.font = `600 15px ${FONT}`
    ctx.fillText('SPHEREx', box.x + 12, box.y + box.size - 14)
  } else {
    ctx.strokeStyle = 'rgba(255,255,255,0.12)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.arc(box.x + box.size / 2, box.y + box.size / 2, 90, 0, Math.PI * 2)
    ctx.moveTo(box.x + box.size / 2 - 120, box.y + box.size / 2)
    ctx.lineTo(box.x + box.size / 2 + 120, box.y + box.size / 2)
    ctx.moveTo(box.x + box.size / 2, box.y + box.size / 2 - 120)
    ctx.lineTo(box.x + box.size / 2, box.y + box.size / 2 + 120)
    ctx.stroke()
    ctx.fillStyle = 'rgba(255,255,255,0.4)'
    ctx.font = `15px ${FONT}`
    ctx.textAlign = 'center'
    ctx.fillText('No SPHEREx image for this position here', box.x + box.size / 2, box.y + box.size - 22)
    ctx.textAlign = 'left'
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.25)'
  ctx.lineWidth = 2
  ctx.strokeRect(box.x, box.y, box.size, box.size)

  // text (right)
  const x = 560
  ctx.fillStyle = '#38bdf8'
  ctx.font = `700 17px ${FONT}`
  ctx.fillText('CITIZEN DISCOVERY CANDIDATE', x, 118)

  ctx.fillStyle = kind.color
  ctx.beginPath()
  ctx.arc(x + 12, 176, 12, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#f8fafc'
  ctx.font = `700 52px ${FONT}`
  ctx.fillText(kind.label, x + 36, 194)

  ctx.fillStyle = '#94a3b8'
  ctx.font = `500 26px ${FONT}`
  ctx.fillText(report.target_name ?? 'Unnamed position', x, 238)

  ctx.fillStyle = '#e2e8f0'
  ctx.font = `500 25px ${MONO}`
  ctx.fillText(`RA   ${formatRa(report.ra_deg)}`, x, 300)
  ctx.fillText(`Dec  ${formatDec(report.dec_deg)}`, x, 336)
  ctx.fillStyle = '#64748b'
  ctx.font = `17px ${MONO}`
  ctx.fillText(`${report.ra_deg.toFixed(5)}°, ${report.dec_deg.toFixed(5)}°`, x, 364)

  if (report.notes) {
    ctx.fillStyle = '#cbd5e1'
    ctx.font = `italic 21px ${FONT}`
    wrap(ctx, `“${report.notes}”`, 580, 3).forEach((l, i) => ctx.fillText(l, x, 410 + i * 28))
  }

  ctx.fillStyle = '#f8fafc'
  ctx.font = `600 24px ${FONT}`
  ctx.fillText(`Found by ${report.discoverer}`, x, 518)
  ctx.fillStyle = '#94a3b8'
  ctx.font = `18px ${FONT}`
  const when = new Date(report.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
  const confirmed = report.verifications_count > 1 ? ` · confirmed by ${report.verifications_count - 1}` : ''
  ctx.fillText(`${when}${confirmed}`, x, 548)

  // footer
  ctx.fillStyle = 'rgba(255,255,255,0.06)'
  ctx.fillRect(0, CARD_HEIGHT - 52, CARD_WIDTH, 52)
  ctx.fillStyle = '#94a3b8'
  ctx.font = `15px ${FONT}`
  ctx.fillText('SPHEREx Citizen Science · Data: NASA/IPAC IRSA · Unverified candidate: needs human confirmation', 60, CARD_HEIGHT - 20)
  ctx.textAlign = 'right'
  ctx.fillStyle = '#64748b'
  ctx.fillText(reportLink(report).replace(/^https?:\/\//, '').slice(0, 60), CARD_WIDTH - 60, CARD_HEIGHT - 20)
  ctx.textAlign = 'left'
  return canvas
}
