import { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, type ReactNode, type Ref } from 'react'
import type { AladinInstance } from 'aladin-lite'
import { HIDDEN_UI, SKY_SURVEY } from '../lib/sky'
import { pixelToSky, skyToPixel } from '../lib/wcs'
import type { Patch } from '../types/api'

export interface SkyContextHandle {
  /** Back to the patch, with the surroundings around it. */
  reset(): void
}

interface Props {
  ref?: Ref<SkyContextHandle>
  patch: Patch
  /** Share of the stage's shorter side the patch takes when the view is reset (0..1). */
  share: number
  /** A click on the patch's picture (not on a marker): continuous image pixel, snapped to a pixel centre. */
  onPick?: (x: number, y: number) => void
  /** Show the picture (default). Hidden, only its outline stays, to say where the patch is. */
  showPicture?: boolean
  /** The patch's picture (an SVG whose size is the patch's size in pixels). It is moved and scaled to sit on its own place in the sky. */
  children: ReactNode
}

// How far from the patch one can go. The sky is only context, so the map is kept on a short leash:
//  - the centre of the view may drift this far from the patch's centre, in patch widths;
//  - the view may be zoomed out to this many times the first view, and in until this many pixels
//    of SPHEREx (about 50 across the patch) are left across it.
const PAN_LIMIT_PATCHES = 0.75
const ZOOM_OUT_LIMIT = 2
const MIN_PATCH_SHARE_OF_VIEW = 1 / 8
const CLICK_SLOP_PX = 4

/**
 * A SPHEREx patch inside the sky around it. Aladin (AllWISE) fills the stage and the user can pan,
 * zoom and rotate it; the patch's picture is a normal DOM layer on top whose CSS transform is
 * recomputed every frame from where Aladin puts three corners of the patch, so it stays glued to
 * the sky whatever the zoom or rotation. The markers inside the picture keep working: the layer
 * lets the pointer through (so drags reach Aladin) except on the markers themselves.
 */
export default function SkyContext({ ref, patch, share, onPick, showPicture = true, children }: Props) {
  const stageRef = useRef<HTMLDivElement>(null)
  const hostRef = useRef<HTMLDivElement>(null)
  const layerRef = useRef<HTMLDivElement>(null)
  const labelRef = useRef<HTMLSpanElement>(null)
  const aladinRef = useRef<AladinInstance | null>(null)
  const matrix = useRef<[number, number, number, number, number, number] | null>(null)
  const down = useRef<{ x: number; y: number } | null>(null)
  const [ready, setReady] = useState(false)

  const { width_px: W, height_px: H } = patch
  // Sky positions of three corners of the picture: enough to place it, scale it and rotate it.
  const corners = useMemo(
    () => [pixelToSky(patch, 0, 0), pixelToSky(patch, W, 0), pixelToSky(patch, 0, H)] as const,
    [patch, W, H],
  )
  const latest = useRef({ patch, share, onPick, corners, showPicture })
  useEffect(() => {
    latest.current = { patch, share, onPick, corners, showPicture }
  })

  /** Width (deg) of the first view: the patch takes `share` of the stage's shorter side. */
  const fitFov = useCallback(() => {
    const el = stageRef.current
    if (!el) return null
    const { width, height } = el.getBoundingClientRect()
    if (width < 1 || height < 1) return null
    const { patch: p, share: s } = latest.current
    const patchDeg = p.width_px * Math.hypot(p.wcs.cd1_1, p.wcs.cd2_1)
    return { patchDeg, fov: (patchDeg * width) / (Math.min(width, height) * s) }
  }, [])

  const fit = useCallback(() => {
    const aladin = aladinRef.current
    const f = fitFov()
    if (!aladin || !f) return
    const { patch: p } = latest.current
    const centre = pixelToSky(p, p.width_px / 2, p.height_px / 2)
    aladin.gotoRaDec(centre.ra, centre.dec)
    aladin.setFoV(f.fov)
    aladin.setRotation(0)
  }, [fitFov])

  /** Keeps the map on its leash (see PAN_LIMIT_PATCHES). Cheap: it only moves the map when it is out. */
  const keepNear = useCallback(
    (aladin: AladinInstance) => {
      const f = fitFov()
      if (!f) return
      const { patch: p } = latest.current
      const [fovW] = aladin.getFov()
      const wantFov = Math.min(Math.max(fovW, f.patchDeg * MIN_PATCH_SHARE_OF_VIEW), f.fov * ZOOM_OUT_LIMIT)
      if (Math.abs(wantFov - fovW) > fovW * 1e-6) aladin.setFoV(wantFov)

      const [ra, dec] = aladin.getRaDec()
      const at = skyToPixel(p, ra, dec)
      const cx = p.width_px / 2
      const cy = p.height_px / 2
      if (!at) return fit()
      const limX = p.width_px * PAN_LIMIT_PATCHES
      const limY = p.height_px * PAN_LIMIT_PATCHES
      const x = Math.min(Math.max(at.x, cx - limX), cx + limX)
      const y = Math.min(Math.max(at.y, cy - limY), cy + limY)
      if (x !== at.x || y !== at.y) {
        const back = pixelToSky(p, x, y)
        aladin.gotoRaDec(back.ra, back.dec)
      }
    },
    [fitFov, fit],
  )

  useImperativeHandle(ref, () => ({ reset: fit }), [fit])

  useEffect(() => {
    const el = hostRef.current
    if (!el) return
    let cancelled = false
    let raf = 0
    import('aladin-lite')
      .then(async ({ default: A }) => {
        await A.init
        if (cancelled) return
        const aladin = A.aladin(el, {
          ...HIDDEN_UI,
          showZoomControl: true,
          showReticle: false,
          projection: 'TAN',
          survey: SKY_SURVEY,
        })
        aladinRef.current = aladin
        fit()
        setReady(true)

        // Started AFTER the map's own animation frame is registered, so each frame runs
        // map -> place the picture and the picture never lags behind the sky.
        const tick = () => {
          keepNear(aladin)
          const layer = layerRef.current
          const [tl, tr, bl] = latest.current.corners
          const { patch: p } = latest.current
          const a = aladin.world2pix(tl.ra, tl.dec)
          const b = aladin.world2pix(tr.ra, tr.dec)
          const c = aladin.world2pix(bl.ra, bl.dec)
          if (layer && a && b && c && [...a, ...b, ...c].every(Number.isFinite)) {
            const m: [number, number, number, number, number, number] = [
              (b[0] - a[0]) / p.width_px,
              (b[1] - a[1]) / p.width_px,
              (c[0] - a[0]) / p.height_px,
              (c[1] - a[1]) / p.height_px,
              a[0],
              a[1],
            ]
            matrix.current = m
            layer.style.transform = `matrix(${m.join(',')})`
            layer.style.visibility = 'visible'
            if (labelRef.current) {
              labelRef.current.style.transform = `translate(${a[0]}px, ${a[1]}px) translateY(-100%)`
              labelRef.current.style.visibility = 'visible'
            }
          } else {
            matrix.current = null
            if (layer) layer.style.visibility = 'hidden'
            if (labelRef.current) labelRef.current.style.visibility = 'hidden'
          }
          raf = requestAnimationFrame(tick)
        }
        tick()
      })
      .catch(() => {
        /* no WebGL2: the picture then shows on a plain background */
      })
    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      aladinRef.current = null
      el.innerHTML = '' // Aladin has no destroy()
    }
  }, [fit, keepNear])

  // A new patch: show it.
  const patchId = `${patch.wcs.crval1}|${patch.wcs.crval2}|${W}`
  useEffect(() => {
    if (ready) fit()
  }, [ready, patchId, fit])

  // Click vs drag: a drag ends in a click too, and that one is not a pick.
  const pick = (clientX: number, clientY: number) => {
    const m = matrix.current
    const r = stageRef.current?.getBoundingClientRect()
    const { onPick: cb, patch: p, showPicture: shown } = latest.current
    if (!m || !r || !cb || !shown) return
    const [a, b, c, d, e, f] = m
    const px = clientX - r.left - e
    const py = clientY - r.top - f
    const det = a * d - b * c
    if (!det) return
    const x = (d * px - c * py) / det
    const y = (-b * px + a * py) / det
    if (x < 0 || y < 0 || x >= p.width_px || y >= p.height_px) return
    cb(Math.floor(x) + 0.5, Math.floor(y) + 0.5)
  }

  return (
    <div
      ref={stageRef}
      className="absolute inset-0 overflow-hidden"
      onPointerDownCapture={e => {
        down.current = { x: e.clientX, y: e.clientY }
      }}
      onClick={e => {
        const d = down.current
        if (d && Math.hypot(e.clientX - d.x, e.clientY - d.y) > CLICK_SLOP_PX) return
        pick(e.clientX, e.clientY)
      }}
    >
      <div ref={hostRef} className="h-full w-full" />
      <div
        ref={layerRef}
        className="pointer-events-none absolute left-0 top-0 origin-top-left"
        style={{ width: W, height: H, visibility: 'hidden', willChange: 'transform' }}
      >
        <div className="absolute inset-0" style={{ visibility: showPicture ? 'visible' : 'hidden' }}>
          {children}
        </div>
        {/* The outline: a dark halo under a light line, so it reads on bright and on dark sky alike. */}
        <svg viewBox={`0 0 ${W} ${H}`} className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" fill="none" aria-hidden="true">
          <rect width={W} height={H} stroke="rgba(0,0,0,0.65)" strokeWidth={4} vectorEffect="non-scaling-stroke" />
          <rect width={W} height={H} stroke="#ece6d6" strokeWidth={1.5} strokeDasharray={showPicture ? undefined : '6 4'} vectorEffect="non-scaling-stroke" />
        </svg>
      </div>
      <span
        ref={labelRef}
        className="label-caps pointer-events-none absolute left-0 top-0 bg-ink/85 px-1.5 py-0.5 text-2xs text-paper"
        style={{ visibility: 'hidden' }}
      >
        SPHEREx
      </span>
    </div>
  )
}
