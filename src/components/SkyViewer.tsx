import { useRef, type MouseEvent } from 'react'
import type { Anomaly } from '../types/api'
import { resolveAssetUrl } from '../api/http'
import { useImageSize } from '../hooks/useImageSize'
import { anomalyColorClass } from '../lib/anomalies'

/** Where the target is EXPECTED to be (from its proper motion), drawn as dashed rings and an arrow. */
export interface MotionMarks {
  points: { x: number; y: number; color: string; label: string }[]
  arrow?: { from: { x: number; y: number }; to: { x: number; y: number } }
}

/** A community report drawn on the image (continuous pixel position, class colour). */
export interface CommunityMarker {
  id: string
  x: number
  y: number
  color: string
  label: string
}

interface Props {
  imageUrl: string
  alt: string
  anomalies?: Anomaly[]
  /** Anomaly whose spectrum is open (drawn with a white ring). */
  selectedId?: string | null
  onSelect?: (anomalyId: string) => void
  /** A click on the image itself (not on a marker): continuous pixel position, snapped to a pixel centre. */
  onProbe?: (x: number, y: number) => void
  /** Where the user last clicked (pixel centre), drawn as a crosshair. */
  probe?: { x: number; y: number } | null
  /** Community reports, drawn as diamonds below the anomaly circles. */
  communityMarkers?: CommunityMarker[]
  highlightedCommunityId?: string | null
  onCommunitySelect?: (reportId: string) => void
  /** Expected position(s) of the target, to guide the eye towards a faint dipole. */
  motion?: MotionMarks | null
}

/**
 * Shows one SPHEREx image full-screen. The SVG's coordinate system IS the image's pixel grid,
 * so any image size works and markers use pixel_x/pixel_y directly
 * (0-based, origin top-left, measured on the served image).
 */
export default function SkyViewer({ imageUrl, alt, anomalies = [], selectedId = null, onSelect, onProbe, probe = null, communityMarkers = [], highlightedCommunityId = null, onCommunitySelect, motion = null }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const src = resolveAssetUrl(imageUrl)
  const size = useImageSize(src)
  if (!size) return null // first frame still loading

  const { width, height } = size
  const radius = Math.max(width, height) / 70

  // Screen -> image pixels through the SVG's own transform, so zoom/letterboxing can't skew it.
  const handleProbe = (e: MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current
    const ctm = svg?.getScreenCTM()
    if (!svg || !ctm || !onProbe) return
    const pt = svg.createSVGPoint()
    pt.x = e.clientX
    pt.y = e.clientY
    const p = pt.matrixTransform(ctm.inverse())
    if (p.x < 0 || p.y < 0 || p.x >= width || p.y >= height) return // clicked the black margin
    onProbe(Math.floor(p.x) + 0.5, Math.floor(p.y) + 0.5)
  }

  return (
    <svg
      ref={svgRef}
      onClick={handleProbe}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={alt}
      className={`absolute inset-0 h-full w-full ${onProbe ? 'cursor-crosshair' : ''}`}
    >
      <image href={src} width={width} height={height} />
      {communityMarkers.map(m => {
        const r = radius * 1.25
        const diamond = `M${m.x} ${m.y - r}L${m.x + r} ${m.y}L${m.x} ${m.y + r}L${m.x - r} ${m.y}Z`
        return (
          <g
            key={m.id}
            role="button"
            tabIndex={0}
            aria-label={m.label}
            className="cursor-pointer outline-none"
            onClick={e => {
              e.stopPropagation() // a marker is not a free click
              onCommunitySelect?.(m.id)
            }}
            onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onCommunitySelect?.(m.id)}
          >
            <title>{m.label}</title>
            <circle cx={m.x} cy={m.y} r={radius * 1.8} fill="transparent" />
            {m.id === highlightedCommunityId && (
              <path d={diamond} transform={`translate(${m.x} ${m.y}) scale(1.45) translate(${-m.x} ${-m.y})`} fill="none" stroke="#fff" strokeWidth={2} vectorEffect="non-scaling-stroke" />
            )}
            <path d={diamond} fill="rgba(0,0,0,0.25)" stroke={m.color} strokeWidth={2.5} vectorEffect="non-scaling-stroke" />
          </g>
        )
      })}
      {anomalies.map(a => {
        const cx = a.pixel_x + 0.5 // pixel_x/pixel_y index a pixel, its centre is half a pixel in
        const cy = a.pixel_y + 0.5
        const label = `${a.anomaly_id}${a.kind ? ` · ${a.kind}` : ''} · SNR ${a.snr_confidence}`
        return (
          <g
            key={a.anomaly_id}
            role={onSelect ? 'button' : undefined}
            tabIndex={onSelect ? 0 : undefined}
            aria-label={label}
            aria-pressed={onSelect ? a.anomaly_id === selectedId : undefined}
            className={onSelect ? 'cursor-pointer outline-none' : undefined}
            onClick={e => {
              e.stopPropagation() // a marker is not a free click
              onSelect?.(a.anomaly_id)
            }}
            onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onSelect?.(a.anomaly_id)}
          >
            <title>{label}</title>
            {/* generous invisible hit area: the visible ring is small */}
            <circle cx={cx} cy={cy} r={radius * 1.8} fill="transparent" />
            {a.anomaly_id === selectedId && (
              <circle
                cx={cx}
                cy={cy}
                r={radius * 1.35}
                fill="none"
                strokeWidth={2}
                vectorEffect="non-scaling-stroke"
                className="stroke-white"
              />
            )}
            <circle
              cx={cx}
              cy={cy}
              r={radius}
              fill="none"
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
              className={anomalyColorClass(a)}
            />
          </g>
        )
      })}
      {motion && (
        <g pointerEvents="none" fill="none" aria-hidden="true">
          {motion.arrow && (() => {
            const { from, to } = motion.arrow
            const len = Math.hypot(to.x - from.x, to.y - from.y)
            if (len < radius * 0.5) return null // no visible motion: just the ring
            const ux = (to.x - from.x) / len
            const uy = (to.y - from.y) / len
            const head = Math.min(radius * 0.9, len * 0.5)
            const bx = to.x - ux * head
            const by = to.y - uy * head
            return (
              <>
                <line x1={from.x} y1={from.y} x2={bx} y2={by} stroke="#ece6d6" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
                <path
                  d={`M${to.x} ${to.y}L${bx - uy * head * 0.5} ${by + ux * head * 0.5}L${bx + uy * head * 0.5} ${by - ux * head * 0.5}Z`}
                  fill="#ece6d6"
                  stroke="none"
                />
              </>
            )
          })()}
          {motion.points.map(p => (
            <circle
              key={p.label}
              cx={p.x}
              cy={p.y}
              r={radius * 0.85}
              stroke={p.color}
              strokeWidth={1.75}
              strokeDasharray="4 3"
              vectorEffect="non-scaling-stroke"
            >
              <title>{p.label}</title>
            </circle>
          ))}
        </g>
      )}
      {probe && (
        <g pointerEvents="none" className="stroke-paper" fill="none" strokeWidth={1.5} vectorEffect="non-scaling-stroke">
          <circle cx={probe.x} cy={probe.y} r={radius * 0.7} vectorEffect="non-scaling-stroke" />
          <path
            d={`M${probe.x - radius * 1.5} ${probe.y}H${probe.x - radius * 0.7}M${probe.x + radius * 0.7} ${probe.y}H${probe.x + radius * 1.5}M${probe.x} ${probe.y - radius * 1.5}V${probe.y - radius * 0.7}M${probe.x} ${probe.y + radius * 0.7}V${probe.y + radius * 1.5}`}
            vectorEffect="non-scaling-stroke"
          />
        </g>
      )}
    </svg>
  )
}
