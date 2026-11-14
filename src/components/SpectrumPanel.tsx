import { useMemo } from 'react'
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { SpectrumPoint } from '../types/api'
import type { JobProgress } from '../lib/jobs'
import JobProgressBar from './JobProgressBar'
import {
  CHEMICAL_WINDOWS_UM,
  DETECTOR_COLORS,
  DETECTORS,
  TOTAL_CHANNELS,
  buildRows,
  formatFlux as fmt,
  type SpectrumRow,
} from '../lib/spectrum'

export interface SpectrumView {
  title: string // "Target · WISE 0855" / "anom_04"
  subtitle?: string // e.g. "appeared · SNR 24.9"
  epochId: string | null | undefined // visit the spectrum was measured in
  spectrum: SpectrumPoint[]
  message?: string | null // why it is empty/partial (saturated stars)
  emptyText: string // what to say when there are no valid channels
  /** A live measurement is running / failed: show that instead of a chart. */
  loading?: { job: JobProgress | null }
  error?: string
  /** Amber note about the data (live job caveats, fallback). Shown even when there is a chart. */
  warning?: string | null
}

interface Props {
  view: SpectrumView
  /** Switch back to the target's own spectrum (shown while an anomaly is selected). */
  onShowTarget?: () => void
  onClose: () => void
}

function Tip({ active, payload }: { active?: boolean; payload?: { payload: SpectrumRow }[] }) {
  const row = payload?.[0]?.payload
  if (!active || !row) return null
  return (
    <div className="rounded bg-black/90 px-2 py-1 text-[11px] leading-snug">
      <div>{row.w.toFixed(3)} µm · detector {row.detector}</div>
      <div>
        {fmt(row.flux)} ± {fmt(row.sigma)} MJy/sr
      </div>
      {row.quality === 'low' && <div className="text-amber-300">low quality (measured off-core)</div>}
    </div>
  )
}

/** Spectrum chart for a target or an anomaly (precomputed by the backend, so it is instant). */
export default function SpectrumPanel({ view, onShowTarget, onClose }: Props) {
  const rows = useMemo(() => buildRows(view.spectrum), [view.spectrum])
  const detectorsPresent = useMemo(() => DETECTORS.filter(d => rows.some(r => r.detector === d)), [rows])
  const empty = rows.length === 0
  const busy = Boolean(view.loading)

  return (
    <div className="absolute right-3 top-60 z-10 w-[26rem] max-w-[calc(100vw-1.5rem)] rounded bg-black/80 p-3 text-xs backdrop-blur">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-sm font-medium text-slate-100">{view.title}</div>
          <div className="text-slate-400">
            {[view.subtitle, view.epochId && `epoch ${view.epochId}`].filter(Boolean).join(' · ')}
          </div>
        </div>
        <div className="flex gap-1">
          {onShowTarget && (
            <button onClick={onShowTarget} className="rounded bg-slate-800 px-2 py-1 hover:bg-slate-700">
              Target
            </button>
          )}
          <button onClick={onClose} aria-label="Close spectrum" className="rounded bg-slate-800 px-2 py-1 hover:bg-slate-700">
            ✕
          </button>
        </div>
      </div>

      {busy ? (
        <div className="mt-3 rounded border border-slate-700 p-3">
          <JobProgressBar job={view.loading?.job ?? null} fallbackText="Measuring this position…" />
        </div>
      ) : view.error ? (
        <div className="mt-3 rounded border border-rose-900 p-3 text-rose-200">{view.error}</div>
      ) : empty ? (
        <div className="mt-3 rounded border border-slate-700 p-3 text-slate-300">{view.emptyText}</div>
      ) : (
        <>
          <div className="mt-2 h-60" data-testid="spectrum-chart">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={rows} margin={{ top: 14, right: 8, bottom: 14, left: 0 }}>
                <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  dataKey="w"
                  domain={[0.7, 5.05]}
                  ticks={[1, 2, 3, 4, 5]}
                  tick={{ fill: '#94a3b8', fontSize: 10 }}
                  label={{ value: 'wavelength (µm)', position: 'insideBottom', offset: -2, fill: '#94a3b8', fontSize: 10 }}
                  height={42}
                />
                <YAxis
                  domain={['auto', 'auto']}
                  tick={{ fill: '#94a3b8', fontSize: 10 }}
                  tickFormatter={fmt}
                  width={42}
                />
                {Object.entries(CHEMICAL_WINDOWS_UM).flatMap(([name, { color, ranges }]) =>
                  ranges.map(([lo, hi], i) => (
                    <ReferenceArea
                      key={`${name}${i}`}
                      x1={lo}
                      x2={hi}
                      fill={color}
                      fillOpacity={0.14}
                      stroke="none"
                      label={{ value: name, position: 'insideTop', fill: color, fontSize: 9 }}
                    />
                  )),
                )}
                <Area dataKey="band" stroke="none" fill="#94a3b8" fillOpacity={0.2} isAnimationActive={false} />
                {detectorsPresent.map(d => (
                  <Line
                    key={d}
                    dataKey={`d${d}`}
                    stroke={DETECTOR_COLORS[d]}
                    strokeWidth={1.5}
                    dot={{ r: 2, fill: DETECTOR_COLORS[d], stroke: 'none' }}
                    activeDot={{ r: 4 }}
                    connectNulls={false}
                    isAnimationActive={false}
                  />
                ))}
                <Tooltip content={<Tip />} isAnimationActive={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
            <span className="tabular-nums">
              {rows.length}/{TOTAL_CHANNELS} channels
            </span>
            {detectorsPresent.map(d => (
              <span key={d}>
                <span style={{ color: DETECTOR_COLORS[d] }}>●</span> {d}
              </span>
            ))}
            <span>▮ ±1σ</span>
          </div>
        </>
      )}

      {view.warning && !busy && <p className="mt-2 text-[11px] leading-snug text-amber-300">{view.warning}</p>}
      {/* when empty, the message already is the explanation box above */}
      {!empty && !busy && view.message && <p className="mt-2 text-[11px] leading-snug text-amber-200/90">{view.message}</p>}
    </div>
  )
}
