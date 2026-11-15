import { useMemo } from 'react'
import {
  CartesianGrid,
  ComposedChart,
  ErrorBar,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { LightCurvePoint } from '../types/api'
import { formatFlux as fmt } from '../lib/spectrum'

interface Props {
  points: LightCurvePoint[]
  /** Epoch the timeline is showing now: marked on the curve so both views stay in step. */
  currentEpochId?: string | null
  /** Scientific caveats from the backend (unvalidated / saturated): always shown with the curve. */
  cautions?: string[]
  onClose: () => void
}

interface Row {
  t: number // ms since epoch (time axis)
  flux: number
  sigma: number
  epochId: string
}

const DAY_MS = 86_400_000
const shortDate = (t: number) => new Date(t).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })

function Tip({ active, payload }: { active?: boolean; payload?: { payload: Row }[] }) {
  const row = payload?.[0]?.payload
  if (!active || !row) return null
  return (
    <div className="rounded bg-black/90 px-2 py-1 text-[11px] leading-snug">
      <div>
        {row.epochId} · {new Date(row.t).toLocaleDateString('en-US')}
      </div>
      <div>
        {fmt(row.flux)} ± {fmt(row.sigma)} MJy/sr
      </div>
    </div>
  )
}

/**
 * Brightness of the target at every SPHEREx visit. Points without valid photometry (saturated
 * cores) come as `null` with a note: they are never drawn as zero. Every note is listed, including those
 * on points that DO have a flux (e.g. a biased lower limit that must not be used to claim variability).
 */
export default function LightCurvePanel({ points, currentEpochId, cautions = [], onClose }: Props) {
  const rows = useMemo<Row[]>(
    () =>
      points
        .filter(p => p.flux_mjy_sr !== null)
        .map(p => ({
          t: Date.parse(p.date),
          flux: p.flux_mjy_sr as number,
          sigma: Math.sqrt(Math.max(p.variance ?? 0, 0)),
          epochId: p.epoch_id,
        }))
        .sort((a, b) => a.t - b.t),
    [points],
  )
  const notes = useMemo(
    () => [...new Set(points.map(p => p.note).filter(Boolean))] as string[], // every note, with or without flux
    [points],
  )

  // Pad the time axis so the first and last points are not glued to the frame.
  const domain = useMemo<[number, number]>(() => {
    const t0 = rows[0]?.t ?? 0
    const t1 = rows[rows.length - 1]?.t ?? 0
    const pad = Math.max((t1 - t0) * 0.1, 30 * DAY_MS)
    return [t0 - pad, t1 + pad]
  }, [rows])
  const current = rows.find(r => r.epochId === currentEpochId)

  return (
    <div className="max-h-[calc(100vh-23rem)] min-h-[16rem] w-[26rem] max-w-[calc(100vw-1.5rem)] overflow-y-auto rounded bg-black/80 p-3 text-xs backdrop-blur">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-sm font-medium text-slate-100">Light curve</div>
          <div className="text-slate-400">
            {rows.length}/{points.length} visits with valid photometry · MJy/sr
          </div>
        </div>
        <button onClick={onClose} aria-label="Close light curve" className="rounded bg-slate-800 px-2 py-1 hover:bg-slate-700">
          ✕
        </button>
      </div>

      {cautions.map(c => (
        <p key={c} className="mt-2 rounded bg-amber-900/60 px-2 py-1 text-amber-200">
          {c}
        </p>
      ))}
      {rows.length > 0 &&
        notes.map(n => (
          <p key={n} className="mt-2 rounded bg-amber-900/40 px-2 py-1 text-[11px] leading-snug text-amber-200">
            {n}
          </p>
        ))}

      {rows.length === 0 ? (
        <div className="mt-3 rounded border border-slate-700 p-3 text-slate-300">
          {notes[0] ?? 'No valid photometry at any visit.'}
        </div>
      ) : (
        <>
          <div className="mt-2 h-48" data-testid="lightcurve-chart">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={rows} margin={{ top: 10, right: 12, bottom: 4, left: 0 }}>
                <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  dataKey="t"
                  scale="time"
                  domain={domain}
                  ticks={rows.map(r => r.t)}
                  tickFormatter={shortDate}
                  tick={{ fill: '#94a3b8', fontSize: 10 }}
                />
                <YAxis
                  domain={['auto', 'auto']}
                  tick={{ fill: '#94a3b8', fontSize: 10 }}
                  tickFormatter={fmt}
                  width={42}
                />
                {current && <ReferenceLine x={current.t} stroke="#38bdf8" strokeDasharray="4 3" />}
                <Line
                  dataKey="flux"
                  stroke="#fbbf24"
                  strokeWidth={1.5}
                  dot={{ r: 4, fill: '#fbbf24', stroke: 'none' }}
                  activeDot={{ r: 5 }}
                  isAnimationActive={false}
                >
                  <ErrorBar dataKey="sigma" width={5} stroke="#94a3b8" strokeWidth={1.5} />
                </Line>
                <Tooltip content={<Tip />} isAnimationActive={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            {current ? <span className="text-sky-400">┆</span> : null}
            {current ? ` current frame (${current.epochId}) · ` : ''}error bars: ±1σ
          </div>
        </>
      )}

    </div>
  )
}
