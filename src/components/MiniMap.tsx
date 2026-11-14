import { useEffect, useRef, useState, type PointerEvent } from 'react'
import type { AladinInstance, GraphicOverlay } from 'aladin-lite'
import { HIDDEN_UI, SKY_SURVEY } from '../lib/sky'
import { addTargetMarkers } from '../lib/markers'
import { TARGETS, targetPosition, type Target } from '../data/targets'
import type { SkyFootprint } from './SkyMap'

interface Props {
  footprint: SkyFootprint | null
  /**
   * The user pressed ('start') or is dragging ('move') on the all-sky map: centre the view there.
   * The parent should add a history entry for 'start' only, or dragging would flood the history.
   * `target` is set when the press landed on one of the five challenge-target markers.
   */
  onPick: (ra: number, dec: number, phase: 'start' | 'move', target?: Target) => void
}

// A view smaller than this would be sub-pixel on the minimap, so we draw a box of at least this size.
const MIN_BOX_DEG = 6
const BOX_COLOR = '#ff54ff'
const SNAP_PX = 9 // a press this close to a target marker counts as pressing the marker
const ALL_SKY_FOV_DEG = 360
const FOV_RETRY_MS = 150
const MAX_FOV_RETRIES = 30

/** Square box (degrees) around the view centre, drawn when the real footprint is too small to see. */
function minimumBox([ra, dec]: [number, number], halfDeg: number): [number, number][] {
  const dRa = halfDeg / Math.max(Math.cos((dec * Math.PI) / 180), 0.05)
  return [
    [ra - dRa, Math.max(dec - halfDeg, -90)],
    [ra + dRa, Math.max(dec - halfDeg, -90)],
    [ra + dRa, Math.min(dec + halfDeg, 90)],
    [ra - dRa, Math.min(dec + halfDeg, 90)],
  ]
}

/**
 * All-sky minimap (Hammer-Aitoff): shows where the main map is looking. Press anywhere to jump
 * there and keep dragging to slide the view across the sky (the magenta box follows the pointer).
 * The inner Aladin ignores the mouse; our own overlay turns pointer positions into sky
 * coordinates, so the minimap itself can never be panned or zoomed out of place.
 */
export default function MiniMap({ footprint, onPick }: Props) {
  const divRef = useRef<HTMLDivElement>(null)
  const aladinRef = useRef<AladinInstance | null>(null)
  const overlayRef = useRef<GraphicOverlay | null>(null)
  const libRef = useRef<(typeof import('aladin-lite'))['default'] | null>(null)
  const [ready, setReady] = useState(false)
  const [hover, setHover] = useState<string | null>(null)

  useEffect(() => {
    const el = divRef.current
    if (!el) return
    let cancelled = false
    import('aladin-lite')
      .then(async ({ default: A }) => {
        await A.init
        if (cancelled) return
        const aladin = A.aladin(el, {
          ...HIDDEN_UI,
          survey: SKY_SURVEY,
          projection: 'AIT',
          target: '0 0',
        })
        // Aladin ignores the `fov` creation option here and also drops a setFoV() made right after
        // creation (it is still initialising), so retry until the whole sky is really in view.
        let tries = 0
        const showWholeSky = () => {
          if (cancelled || tries++ > MAX_FOV_RETRIES) return
          if (Math.abs(aladin.getFov()[0] - ALL_SKY_FOV_DEG) > 1) {
            aladin.setFoV(ALL_SKY_FOV_DEG)
            setTimeout(showWholeSky, FOV_RETRY_MS)
          }
        }
        showWholeSky()
        const overlay = A.graphicOverlay({ name: 'view', color: BOX_COLOR, lineWidth: 2 })
        aladin.addOverlay(overlay)
        addTargetMarkers(A, aladin, { size: 9, labels: false })
        libRef.current = A
        aladinRef.current = aladin
        overlayRef.current = overlay
        setReady(true)
      })
      .catch(() => {
        /* no WebGL2 / network: the main map shows the error; the minimap just stays empty */
      })
    return () => {
      cancelled = true
      aladinRef.current = null
      overlayRef.current = null
      libRef.current = null
      el.innerHTML = '' // Aladin has no destroy()
    }
  }, [])

  // Draw the visible area.
  useEffect(() => {
    const A = libRef.current
    const overlay = overlayRef.current
    if (!A || !overlay || !footprint) return
    overlay.removeAll()
    const small = Math.max(footprint.fov[0], footprint.fov[1]) < MIN_BOX_DEG
    const vertices = small ? minimumBox(footprint.center, MIN_BOX_DEG / 2) : footprint.polygon
    if (vertices.length >= 3) overlay.add(A.polygon(vertices, { color: BOX_COLOR, lineWidth: 2 }))
  }, [ready, footprint])

  const dragging = useRef(false)
  const frame = useRef(0)
  const latest = useRef({ onPick })
  useEffect(() => {
    latest.current = { onPick }
  })
  useEffect(() => () => cancelAnimationFrame(frame.current), [])

  /** The challenge target whose marker is within SNAP_PX of this minimap pixel, if any. */
  const targetNear = (x: number, y: number): Target | undefined => {
    const aladin = aladinRef.current
    if (!aladin) return undefined
    let best = SNAP_PX
    let found: Target | undefined
    for (const t of TARGETS) {
      const { ra, dec } = targetPosition(t)
      const p = aladin.world2pix(ra, dec)
      if (!p) continue
      const d = Math.hypot(p[0] - x, p[1] - y)
      if (d < best) {
        best = d
        found = t
      }
    }
    return found
  }

  /** Pointer position -> sky -> parent. Ignores points outside the ellipse (keeps the last view). */
  const pick = (e: PointerEvent<HTMLDivElement>, phase: 'start' | 'move') => {
    const aladin = aladinRef.current
    if (!aladin) return
    const rect = e.currentTarget.getBoundingClientRect()
    try {
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      const [ra, dec] = aladin.pix2world(x, y)
      if (Number.isFinite(ra) && Number.isFinite(dec) && Math.abs(dec) <= 90) {
        // Only the initial press can pick a marker; dragging across one must not stick to it.
        latest.current.onPick(ra, dec, phase, phase === 'start' ? targetNear(x, y) : undefined)
      }
    } catch {
      /* outside the ellipse: ignore */
    }
  }

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    dragging.current = true
    try {
      e.currentTarget.setPointerCapture(e.pointerId) // keep receiving moves outside the box
    } catch {
      /* synthetic / already released pointer: moves still arrive while inside */
    }
    pick(e, 'start')
  }

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) {
      const rect = e.currentTarget.getBoundingClientRect()
      setHover(targetNear(e.clientX - rect.left, e.clientY - rect.top)?.name ?? null)
      return
    }
    // At most one update per frame: pointer events can fire faster than the map can follow.
    const { clientX, clientY, currentTarget } = e
    cancelAnimationFrame(frame.current)
    frame.current = requestAnimationFrame(() =>
      pick({ clientX, clientY, currentTarget } as PointerEvent<HTMLDivElement>, 'move'),
    )
  }

  const endDrag = () => {
    dragging.current = false
  }
  const onPointerLeave = () => setHover(null)

  return (
    <div className="absolute right-3 top-3 z-10 h-[130px] w-[260px] overflow-hidden rounded border border-slate-600 bg-black">
      <div ref={divRef} className="pointer-events-none h-full w-full" />
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerLeave={onPointerLeave}
        className={`absolute inset-0 touch-none ${hover ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'}`}
        role="button"
        aria-label="All-sky minimap: click or drag to move the view"
        title={hover ?? 'Click or drag to move the view'}
      />
      {hover && (
        <div className="pointer-events-none absolute left-1 top-1 rounded bg-black/80 px-2 py-0.5 text-[11px] text-yellow-300">
          {hover}
        </div>
      )}
    </div>
  )
}
