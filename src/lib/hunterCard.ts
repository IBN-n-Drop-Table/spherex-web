import type { FinishResult } from '../types/api'
import { loadCardFonts } from './shareCard'

export const HUNTER_CARD_WIDTH = 1200
export const HUNTER_CARD_HEIGHT = 630
const FONT = '"IBM Plex Sans", system-ui, sans-serif'
const MONO = '"IBM Plex Mono", ui-monospace, monospace'
const DISPLAY = 'Spectral, Georgia, serif'
const INK = '#0c0b09'
const PAPER = '#ece6d6'
const MUTED = '#aba390'
const ACCENT = '#74c3b1'

function seeded(seed: string) {
  let h = 2166136261
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619)
  return () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0) / 4294967296)
}

/**
 * "Star hunter" card for the spot-the-movement game. It is a game score: it never says "discovery".
 * Drawn only from what the server returned on finish (no images, so the canvas is always exportable).
 */
export async function renderHunterCard(result: FinishResult, when = new Date()): Promise<HTMLCanvasElement> {
  await loadCardFonts()
  const canvas = document.createElement('canvas')
  canvas.width = HUNTER_CARD_WIDTH
  canvas.height = HUNTER_CARD_HEIGHT
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas is not available')

  ctx.fillStyle = INK
  ctx.fillRect(0, 0, HUNTER_CARD_WIDTH, HUNTER_CARD_HEIGHT)
  const rnd = seeded(result.session_id)
  for (let i = 0; i < 220; i++) {
    ctx.fillStyle = `rgba(236,230,214,${0.06 + rnd() * 0.32})`
    const r = rnd() < 0.08 ? 1.8 : 0.9
    ctx.fillRect(rnd() * HUNTER_CARD_WIDTH, rnd() * HUNTER_CARD_HEIGHT, r, r)
  }

  ctx.fillStyle = ACCENT
  ctx.font = `500 18px ${FONT}`
  ctx.letterSpacing = '3px'
  ctx.fillText('STAR HUNTER', 80, 110)
  ctx.letterSpacing = '0px'

  ctx.fillStyle = PAPER
  ctx.font = `500 88px ${DISPLAY}`
  ctx.fillText(result.nickname, 80, 215, 1040)

  ctx.fillStyle = MUTED
  ctx.font = `italic 30px ${DISPLAY}`
  ctx.fillText('Find what moves · a game with real SPHEREx infrared images', 80, 270)

  // score
  ctx.fillStyle = PAPER
  ctx.font = `400 150px ${MONO}`
  ctx.fillText(String(result.score), 80, 430)
  const scoreWidth = ctx.measureText(String(result.score)).width
  ctx.fillStyle = MUTED
  ctx.font = `400 30px ${FONT}`
  ctx.fillText('points', 80 + scoreWidth + 18, 430)

  const played = result.rounds_played === result.rounds_total
    ? `${result.rounds_total} rounds`
    : `${result.rounds_played} of ${result.rounds_total} rounds played`
  ctx.fillStyle = PAPER
  ctx.font = `500 30px ${FONT}`
  ctx.fillText(`${result.hits} found · ${played}`, 80, 490)
  ctx.fillStyle = MUTED
  ctx.font = `20px ${MONO}`
  ctx.fillText(when.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }), 80, 525)

  ctx.fillStyle = '#2f2c25'
  ctx.fillRect(80, HUNTER_CARD_HEIGHT - 52, HUNTER_CARD_WIDTH - 160, 1)
  ctx.fillStyle = MUTED
  ctx.font = `15px ${FONT}`
  ctx.fillText('SPHEREx Citizen Science · Data: NASA/IPAC IRSA · A game score, not a discovery', 80, HUNTER_CARD_HEIGHT - 20)
  return canvas
}
