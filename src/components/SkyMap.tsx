import { useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react'
import type { AladinInstance, Catalog } from 'aladin-lite'
import { HIDDEN_UI, SKY_SURVEY } from '../lib/sky'
import { addCommunityMarkers, addTargetMarkers } from '../lib/markers'
import type { CitizenReport } from '../types/api'
import SkyWipe from './SkyWipe'

type AladinLib = (typeof import('aladin-lite'))['default']

export interface SkyView {
  ra: number // degrees
  dec: number // degrees
  fov: number // arcmin
}

/** What part of the sky the main map shows now (for the minimap). */
export interface SkyFootprint {
  center: [number, number] // ra, dec in degrees
  fov: [number, number] // [width, height] in degrees
  polygon: [number, number][] // sky coordinates of the viewport border
}

/** Lets the parent read the CURRENT centre/zoom without waiting for the debounced URL update. */
export interface SkyMapHandle {
  getView(): SkyView | null
}

interface Props extends SkyView {
  ref?: Ref<SkyMapHandle>
  /** Called (debounced) once the user has stopped panning/zooming. */
  onViewChange: (view: SkyView) => void
  /** Called on every pan/zoom (and once at start), unthrottled by our debounce. */
  onFootprintChange?: (footprint: SkyFootprint) => void
  /** Community reports to draw as markers (pass [] to hide them). */
  communityReports?: CitizenReport[]
  highlightedReportId?: string | null
  /** A community marker was clicked. */
  onCommunityClick?: (reportId: string) => void
  /** Show the visible-light / infrared comparison bar. */
  wipe?: boolean
}

// Stereographic fills the screen like a planetarium dome (looking OUT from inside the sky),
// instead of SIN, which draws a globe-like disc with curved edges when zoomed out.
const PROJECTION = 'TAN'
// Past ~180 degrees any projection turns into a disc "seen from outside"; cap the zoom-out.
const MAX_FOV_DEG = 180
const MAX_FOV_ARCMIN = MAX_FOV_DEG * 60
const REPORT_DEBOUNCE_MS = 250
// After we move the map from code (typed coordinates), ignore Aladin's own
// "position changed" echoes for a moment so they don't overwrite the URL.
const PROGRAMMATIC_MOVE_MS = 1000
const POS_EPS_DEG = 1e-5
const FOV_EPS_REL = 1e-4

const UI_OPTIONS = {
  ...HIDDEN_UI,
  showZoomControl: true, // the only Aladin control we keep
  showReticle: true,
  projection: PROJECTION,
}

/** Angular difference in degrees on a circle (handles the 359.99 / 0.01 wrap). */
const raDiff = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180)

/**
 * Full-screen Aladin Lite map (v3): just the sky. View props are the source of truth (they come
 * from the URL); user pans/zooms are reported back through `onViewChange` once movement settles.
 * Aladin's logo must stay visible (its terms of use).
 */
const BORDER_STEPS = 6 // sample points per viewport edge

/** Sky coordinates of the viewport border, asked to Aladin itself (so any projection works). */
function computeFootprint(aladin: AladinInstance): SkyFootprint {
  const [w, h] = aladin.getSize()
  const edge: [number, number][] = []
  for (let i = 0; i < BORDER_STEPS; i++) edge.push([(w * i) / BORDER_STEPS, 0])
  for (let i = 0; i < BORDER_STEPS; i++) edge.push([w, (h * i) / BORDER_STEPS])
  for (let i = 0; i < BORDER_STEPS; i++) edge.push([w - (w * i) / BORDER_STEPS, h])
  for (let i = 0; i < BORDER_STEPS; i++) edge.push([0, h - (h * i) / BORDER_STEPS])
  const polygon: [number, number][] = []
  for (const [x, y] of edge) {
    try {
      const [r, d] = aladin.pix2world(x, y)
      if (Number.isFinite(r) && Number.isFinite(d)) polygon.push([r, d])
    } catch {
      /* point outside the projection: skip it */
    }
  }
  return { center: aladin.getRaDec(), fov: aladin.getFov(), polygon }
}

const NO_REPORTS: CitizenReport[] = []

export default function SkyMap({
  ra,
  dec,
  fov,
  ref,
  onViewChange,
  onFootprintChange,
  communityReports = NO_REPORTS,
  highlightedReportId = null,
  onCommunityClick,
  wipe = false,
}: Props) {
  const divRef = useRef<HTMLDivElement>(null)
  const aladinRef = useRef<AladinInstance | null>(null)
  const ignoreUntil = useRef(0)
  const libRef = useRef<(typeof import('aladin-lite'))['default'] | null>(null)
  const communityCatalogs = useRef<Catalog[]>([])
  const latest = useRef({ ra, dec, fov, onViewChange, onFootprintChange, onCommunityClick })
  const [ready, setReady] = useState(false)
  const [wipeLib, setWipeLib] = useState<{ A: AladinLib; aladin: AladinInstance } | null>(null)
  const [wipeEverOn, setWipeEverOn] = useState(false)
  if (wipe && !wipeEverOn) setWipeEverOn(true) // build the second map only when first needed
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    latest.current = { ra, dec, fov, onViewChange, onFootprintChange, onCommunityClick }
  })

  useImperativeHandle(ref, () => ({
    getView() {
      const aladin = aladinRef.current
      if (!aladin) return null
      const [r, d] = aladin.getRaDec()
      const [fovDeg] = aladin.getFov()
      return { ra: r, dec: d, fov: fovDeg * 60 }
    },
  }))

  // Create the map once.
  useEffect(() => {
    const el = divRef.current
    if (!el) return
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined

    import('aladin-lite')
      .then(async ({ default: A }) => {
        await A.init
        if (cancelled) return
        const start = latest.current
        const aladin = A.aladin(el, {
          ...UI_OPTIONS,
          survey: SKY_SURVEY,
          target: `${start.ra} ${start.dec}`,
          fov: Math.min(start.fov, MAX_FOV_ARCMIN) / 60,
        })
        aladinRef.current = aladin
        libRef.current = A
        addTargetMarkers(A, aladin, { size: 14, labels: true })

        // Aladin has no destroy(): after unmount the old instance keeps firing events (its container
        // shrinks to 0 px, which "zooms" it to an absurd fov). Ignore everything once disposed.
        const report = () => {
          if (cancelled || Date.now() < ignoreUntil.current) return
          clearTimeout(timer)
          timer = setTimeout(() => {
            if (cancelled) return
            const [r, d] = aladin.getRaDec()
            const [fovDeg] = aladin.getFov()
            latest.current.onViewChange({ ra: r, dec: d, fov: fovDeg * 60 })
          }, REPORT_DEBOUNCE_MS)
        }
        const emitFootprint = () => {
          if (!cancelled) latest.current.onFootprintChange?.(computeFootprint(aladin))
        }
        aladin.on('positionChanged', () => {
          emitFootprint()
          report()
        })
        aladin.on('zoomChanged', () => {
          if (cancelled) return
          if (aladin.getFov()[0] > MAX_FOV_DEG) aladin.setFoV(MAX_FOV_DEG) // re-fires with the capped value
          emitFootprint()
          report()
        })
        // A click on a community marker (the sources carry their report id in `data`).
        aladin.on('objectClicked', source => {
          const id = source?.data?.reportId
          if (!cancelled && typeof id === 'string') latest.current.onCommunityClick?.(id)
        })
        emitFootprint()
        setWipeLib({ A, aladin })
        setReady(true)
      })
      .catch(e => {
        if (!cancelled) setError(String(e)) // e.g. "WebGL2 not supported by your browser"
      })

    return () => {
      cancelled = true
      clearTimeout(timer)
      aladinRef.current = null
      libRef.current = null
      communityCatalogs.current = []
      el.innerHTML = '' // Aladin has no destroy(); remove what it created
    }
  }, [])

  // View props (URL) -> map. Only move when it actually differs, so our own echoes don't loop.
  useEffect(() => {
    const aladin = aladinRef.current
    if (!aladin) return
    const [r, d] = aladin.getRaDec()
    const [fovDeg] = aladin.getFov()
    let moved = false
    if (raDiff(r, ra) > POS_EPS_DEG || Math.abs(d - dec) > POS_EPS_DEG) {
      aladin.gotoRaDec(ra, dec)
      moved = true
    }
    const wantFov = Math.min(fov, MAX_FOV_ARCMIN)
    if (Math.abs(fovDeg * 60 - wantFov) / wantFov > FOV_EPS_REL) {
      aladin.setFoV(wantFov / 60)
      moved = true
    }
    if (moved) ignoreUntil.current = Date.now() + PROGRAMMATIC_MOVE_MS
  }, [ready, ra, dec, fov])

  // Community markers: replace the previous set whenever the reports (or the selection) change.
  useEffect(() => {
    const A = libRef.current
    const aladin = aladinRef.current
    if (!A || !aladin) return
    for (const c of communityCatalogs.current) aladin.remove(c)
    communityCatalogs.current = addCommunityMarkers(A, aladin, communityReports, highlightedReportId)
  }, [ready, communityReports, highlightedReportId])

  return (
    <>
      {/* Aladin restyles the element it takes over (position/size), so give it a sized wrapper. */}
      <div className="absolute inset-0 z-0">
        <div ref={divRef} className="h-full w-full" />
      </div>
      {wipeEverOn && wipeLib && <SkyWipe A={wipeLib.A} main={wipeLib.aladin} enabled={wipe} />}
      {error && (
        <p className="absolute inset-x-0 top-1/2 z-0 text-center text-sm text-red-400">{error}</p>
      )}
    </>
  )
}
