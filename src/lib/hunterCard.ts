import type { FinishResult } from '../types/api'

export const HUNTER_CARD_WIDTH = 1200
export const HUNTER_CARD_HEIGHT = 630
const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'

function seeded(seed: string) {
  let h = 2166136261
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619)
  return () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0) / 4294967296)
}

/**
 * "Star hunter" card for the spot-the-movement game. It is a game score: it never says "discovery".
 * Drawn only from what the server returned on finish (no images, so the canvas is always exportable).
 */
export function renderHunterCard(result: FinishResult, when = new Date()): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = HUNTER_CARD_WIDTH
  canvas.height = HUNTER_CARD_HEIGHT
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas is not available')

  const bg = ctx.createRadialGradient(300, 200, 40, 600, 315, 800)
  bg.addColorStop(0, '#111a2e')
  bg.addColorStop(1, '#03050a')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, HUNTER_CARD_WIDTH, HUNTER_CARD_HEIGHT)
  const rnd = seeded(result.session_id)
  for (let i = 0; i < 220; i++) {
    ctx.fillStyle = `rgba(255,255,255,${0.08 + rnd() * 0.5})`
    const r = rnd() < 0.08 ? 1.8 : 0.9
    ctx.fillRect(rnd() * HUNTER_CARD_WIDTH, rnd() * HUNTER_CARD_HEIGHT, r, r)
  }

  ctx.fillStyle = '#38bdf8'
  ctx.font = `700 20px ${FONT}`
  ctx.fillText('STAR HUNTER', 80, 110)

  ctx.fillStyle = '#f8fafc'
  ctx.font = `700 84px ${FONT}`
  ctx.fillText(result.nickname, 80, 215, 1040)

  ctx.fillStyle = '#94a3b8'
  ctx.font = `500 28px ${FONT}`
  ctx.fillText('Find what moves · a game with real SPHEREx infrared images', 80, 270)

  // score
  ctx.fillStyle = '#fbbf24'
  ctx.font = `800 150px ${FONT}`
  ctx.fillText(String(result.score), 80, 430)
  const scoreWidth = ctx.measureText(String(result.score)).width
  ctx.fillStyle = '#cbd5e1'
  ctx.font = `500 30px ${FONT}`
  ctx.fillText('points', 80 + scoreWidth + 18, 430)

  const played = result.rounds_played === result.rounds_total
    ? `${result.rounds_total} rounds`
    : `${result.rounds_played} of ${result.rounds_total} rounds played`
  ctx.fillStyle = '#e2e8f0'
  ctx.font = `600 30px ${FONT}`
  ctx.fillText(`${result.hits} found · ${played}`, 80, 490)
  ctx.fillStyle = '#94a3b8'
  ctx.font = `20px ${FONT}`
  ctx.fillText(when.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }), 80, 525)

  ctx.fillStyle = 'rgba(255,255,255,0.06)'
  ctx.fillRect(0, HUNTER_CARD_HEIGHT - 52, HUNTER_CARD_WIDTH, 52)
  ctx.fillStyle = '#94a3b8'
  ctx.font = `15px ${FONT}`
  ctx.fillText('SPHEREx Citizen Science · Data: NASA/IPAC IRSA · A game score, not a discovery', 80, HUNTER_CARD_HEIGHT - 20)
  return canvas
}
