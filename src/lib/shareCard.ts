import { formatDec, formatRa } from './coords'
import { classificationInfo, reportLink } from './reports'
import { skyToPixel } from './wcs'
import type { CitizenReport, Patch } from '../types/api'

export const CARD_WIDTH = 1200
export const CARD_HEIGHT = 630

/** The image to crop the sighting from, with the geometry needed to find the position in it. */
export interface CardImage {
  url: string
  patch: Patch
  targetName: string // the report is only drawn on it if it is about this target
}

// The cutout is a share of the patch (about 45%: ~20 SPHEREx pixels across for a 5-arcmin patch), so
// neighbouring stars give the sighting some context instead of one enlarged blob.
const CUTOUT_SHARE = 0.45
const FONT = '"IBM Plex Sans", system-ui, sans-serif'
const MONO = '"IBM Plex Mono", ui-monospace, monospace'
const DISPLAY = 'Spectral, Georgia, serif'
// The interface's palette (see index.css).
const INK = '#0c0b09'
const PAPER = '#ece6d6'
const MUTED = '#aba390'
const FAINT = '#8b8473'
const ACCENT = '#74c3b1'

/** Canvas text only uses a web font once it is loaded: ask for the faces the cards draw with. */
export async function loadCardFonts(): Promise<void> {
  try {
    await Promise.all(['500 52px Spectral', 'italic 21px Spectral', '500 26px "IBM Plex Sans"', '600 24px "IBM Plex Sans"', '500 25px "IBM Plex Mono"'].map(f => document.fonts.load(f)))
  } catch {
    /* the fallback fonts are fine */
  }
}

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
 * Draws the shareable sighting card (1200x630, the size social networks preview).
 * Honest by design: it says "candidate" and "needs verification", never "discovered".
 */
export async function renderShareCard(report: CitizenReport, image: CardImage | null): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas')
  canvas.width = CARD_WIDTH
  canvas.height = CARD_HEIGHT
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas is not available')
  const kind = classificationInfo(report.classification)
  await loadCardFonts()

  // background + a deterministic star field
  ctx.fillStyle = INK
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT)
  const rnd = seeded(report.id)
  for (let i = 0; i < 160; i++) {
    ctx.fillStyle = `rgba(236,230,214,${0.06 + rnd() * 0.3})`
    const r = rnd() < 0.08 ? 1.6 : 0.8
    ctx.fillRect(rnd() * CARD_WIDTH, rnd() * CARD_HEIGHT, r, r)
  }

  // cutout (left)
  const box = { x: 60, y: 90, size: 450 }
  ctx.fillStyle = '#070706'
  ctx.fillRect(box.x, box.y, box.size, box.size)
  const pos = image ? positionInImage(report, image) : null
  const bitmap = image && pos ? await loadBitmap(image.url) : null
  if (image && pos && bitmap) {
    // the bitmap may differ in size from the patch grid: scale the crop with it
    const k = bitmap.width / image.patch.width_px
    const cut = Math.max(16, Math.round(Math.min(image.patch.width_px, image.patch.height_px) * CUTOUT_SHARE))
    const half = cut / 2
    const sx = Math.min(Math.max(pos.x - half, 0), image.patch.width_px - cut)
    const sy = Math.min(Math.max(pos.y - half, 0), image.patch.height_px - cut)
    ctx.imageSmoothingEnabled = false // keep SPHEREx's real pixels visible
    ctx.drawImage(bitmap, sx * k, sy * k, cut * k, cut * k, box.x, box.y, box.size, box.size)
    const px = box.x + ((pos.x - sx) / cut) * box.size
    const py = box.y + ((pos.y - sy) / cut) * box.size
    ctx.strokeStyle = kind.color
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(px, py, 26, 0, Math.PI * 2)
    ctx.stroke()
    ctx.fillStyle = PAPER
    ctx.font = `500 15px ${MONO}`
    ctx.fillText('SPHEREx', box.x + 12, box.y + box.size - 14)
  } else {
    ctx.strokeStyle = 'rgba(236,230,214,0.18)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.arc(box.x + box.size / 2, box.y + box.size / 2, 90, 0, Math.PI * 2)
    ctx.moveTo(box.x + box.size / 2 - 120, box.y + box.size / 2)
    ctx.lineTo(box.x + box.size / 2 + 120, box.y + box.size / 2)
    ctx.moveTo(box.x + box.size / 2, box.y + box.size / 2 - 120)
    ctx.lineTo(box.x + box.size / 2, box.y + box.size / 2 + 120)
    ctx.stroke()
    ctx.fillStyle = FAINT
    ctx.font = `15px ${FONT}`
    ctx.textAlign = 'center'
    ctx.fillText('No SPHEREx image for this position here', box.x + box.size / 2, box.y + box.size - 22)
    ctx.textAlign = 'left'
  }
  ctx.strokeStyle = '#4c483d'
  ctx.lineWidth = 1
  ctx.strokeRect(box.x, box.y, box.size, box.size)

  // text (right)
  const x = 560
  ctx.fillStyle = ACCENT
  ctx.font = `500 16px ${FONT}`
  ctx.letterSpacing = '2px'
  ctx.fillText('CITIZEN SIGHTING', x, 118)
  ctx.letterSpacing = '0px'

  ctx.fillStyle = kind.color
  ctx.beginPath()
  ctx.arc(x + 12, 176, 12, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = PAPER
  ctx.font = `500 52px ${DISPLAY}`
  ctx.fillText(kind.label, x + 36, 194)

  ctx.fillStyle = MUTED
  ctx.font = `400 26px ${FONT}`
  ctx.fillText(report.target_name ?? 'Unnamed position', x, 238)

  ctx.fillStyle = PAPER
  ctx.font = `400 25px ${MONO}`
  ctx.fillText(`RA   ${formatRa(report.ra_deg)}`, x, 300)
  ctx.fillText(`Dec  ${formatDec(report.dec_deg)}`, x, 336)
  ctx.fillStyle = FAINT
  ctx.font = `17px ${MONO}`
  ctx.fillText(`${report.ra_deg.toFixed(5)}°, ${report.dec_deg.toFixed(5)}°`, x, 364)

  if (report.notes) {
    ctx.fillStyle = PAPER
    ctx.font = `italic 22px ${DISPLAY}`
    wrap(ctx, `“${report.notes}”`, 580, 3).forEach((l, i) => ctx.fillText(l, x, 410 + i * 28))
  }

  ctx.fillStyle = PAPER
  ctx.font = `500 24px ${FONT}`
  ctx.fillText(`Reported by ${report.discoverer}`, x, 518)
  ctx.fillStyle = MUTED
  ctx.font = `18px ${FONT}`
  const when = new Date(report.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
  const confirmed = report.verifications_count > 1 ? ` · confirmed by ${report.verifications_count - 1}` : ''
  ctx.fillText(`${when}${confirmed}`, x, 548)

  // footer
  ctx.fillStyle = '#2f2c25'
  ctx.fillRect(60, CARD_HEIGHT - 52, CARD_WIDTH - 120, 1)
  ctx.fillStyle = MUTED
  ctx.font = `15px ${FONT}`
  ctx.fillText('Eskai · citizen science with SPHEREx data · Data: NASA/IPAC IRSA · Unverified candidate: needs human confirmation', 60, CARD_HEIGHT - 20)
  ctx.textAlign = 'right'
  ctx.fillStyle = FAINT
  ctx.fillText(reportLink(report).replace(/^https?:\/\//, '').slice(0, 60), CARD_WIDTH - 60, CARD_HEIGHT - 20)
  ctx.textAlign = 'left'
  return canvas
}
