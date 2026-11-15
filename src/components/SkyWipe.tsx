import { useEffect, useRef, useState } from 'react'
import type { AladinInstance } from 'aladin-lite'
import { HIDDEN_UI, VISIBLE_SURVEY } from '../lib/sky'
import { addTargetMarkers } from '../lib/markers'

type AladinLib = (typeof import('aladin-lite'))['default']

interface Props {
  A: AladinLib
  /** The main (infrared) map. This component slaves a second, visible-light map to it. */
  main: AladinInstance
  enabled: boolean
}

const KEY_STEP = 0.02
const clamp = (v: number) => Math.min(0.98, Math.max(0.02, v))

/**
 * "What your eye sees / what infrared sees": a visible-light sky (DSS2) drawn on top of the
 * infrared map and clipped to the left of a draggable bar. Aladin can't compare two layers, so the
 * second map copies the position and zoom of the main one every frame; it ignores the pointer, so
 * panning and zooming still go to the main map underneath.
 */
export default function SkyWipe({ A, main, enabled }: Props) {
  const divRef = useRef<HTMLDivElement>(null)
  const barRef = useRef<HTMLDivElement>(null)
  const visibleRef = useRef<AladinInstance | null>(null)
  const [pos, setPos] = useState(0.5) // fraction of the screen width showing visible light

  const enabledRef = useRef(enabled)
  useEffect(() => {
    enabledRef.current = enabled
  }, [enabled])

  // Copy the main map's view every frame (events can't be shared: Aladin keeps one callback per
  // event and SkyMap already uses them). Order matters: every Aladin map redraws in its own
  // requestAnimationFrame callback, and callbacks run in the order they were first registered.
  // This loop is declared BEFORE the visible map is created, so each frame runs
  // main -> copy -> visible, and the visible sky never lags a frame behind. It starts once and is
  // never restarted (restarting would put it last in line again); `enabledRef` switches it off.
  useEffect(() => {
    let raf = 0
    let last = ''
    const tick = () => {
      const visible = visibleRef.current
      if (!enabledRef.current) last = '' // re-sync from scratch when switched back on
      else if (visible) {
        const [r, d] = main.getRaDec()
        const [fov] = main.getFov()
        const rot = main.getRotation()
        const key = `${r}|${d}|${fov}|${rot}`
        if (key !== last) {
          last = key
          visible.gotoRaDec(r, d)
          visible.setFoV(fov)
          visible.setRotation(rot)
        }
      }
      raf = requestAnimationFrame(tick)
    }
    tick()
    return () => cancelAnimationFrame(raf)
  }, [main])

  // Create the visible-light map once (Aladin has no destroy(), so we keep it and just hide it).
  useEffect(() => {
    const el = divRef.current
    if (!el) return
    try {
      const [r, d] = main.getRaDec()
      const visible = A.aladin(el, {
        ...HIDDEN_UI,
        showReticle: false,
        projection: 'TAN',
        survey: VISIBLE_SURVEY,
        target: `${r} ${d}`,
        fov: main.getFov()[0],
      })
      addTargetMarkers(A, visible, { size: 14, labels: true })
      visibleRef.current = visible
    } catch (e) {
      console.error('Visible-light map failed', e)
    }
    return () => {
      visibleRef.current = null
      el.innerHTML = ''
    }
  }, [A, main])

  // The bar lives in the map area, which no longer spans the window: measure against that area.
  const dragTo = (clientX: number) => {
    const host = barRef.current?.offsetParent
    const r = host?.getBoundingClientRect()
    if (r && r.width > 0) setPos(clamp((clientX - r.left) / r.width))
  }

  return (
    <div className={enabled ? undefined : 'hidden'}>
      <div
        className="pointer-events-none absolute inset-0 z-[1]"
        style={{ clipPath: `inset(0 ${(1 - pos) * 100}% 0 0)` }}
      >
        <div ref={divRef} className="h-full w-full" />
      </div>

      <div className="pointer-events-none absolute top-3 z-[2] -translate-x-full pr-4" style={{ left: `${pos * 100}%` }}>
        <span className="label-caps whitespace-nowrap bg-ink/85 px-2 py-1 text-paper">What your eye sees</span>
      </div>
      <div className="pointer-events-none absolute top-3 z-[2] pl-4" style={{ left: `${pos * 100}%` }}>
        <span className="label-caps whitespace-nowrap bg-ink/85 px-2 py-1 text-paper">What infrared sees</span>
      </div>

      <div
        ref={barRef}
        role="slider"
        tabIndex={0}
        aria-label="Compare visible light and infrared"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pos * 100)}
        className="absolute inset-y-0 z-[2] flex w-11 -translate-x-1/2 cursor-ew-resize touch-none justify-center focus-visible:outline-none [&:focus-visible>div:last-child]:outline [&:focus-visible>div:last-child]:outline-2 [&:focus-visible>div:last-child]:outline-offset-2 [&:focus-visible>div:last-child]:outline-accent"
        style={{ left: `${pos * 100}%` }}
        onPointerDown={e => {
          e.currentTarget.setPointerCapture(e.pointerId)
          dragTo(e.clientX)
        }}
        onPointerMove={e => {
          if (e.currentTarget.hasPointerCapture(e.pointerId)) dragTo(e.clientX)
        }}
        onKeyDown={e => {
          if (e.key === 'ArrowLeft') setPos(p => clamp(p - KEY_STEP))
          else if (e.key === 'ArrowRight') setPos(p => clamp(p + KEY_STEP))
          else return
          e.preventDefault()
        }}
      >
        <div className="h-full w-px bg-paper" />
        <div className="absolute top-1/2 flex h-11 w-7 -translate-y-1/2 items-center justify-center gap-0.5 border border-paper bg-ink text-paper">
          <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M6 4L2.5 8 6 12M10 4l3.5 4-3.5 4" />
          </svg>
        </div>
      </div>
    </div>
  )
}
