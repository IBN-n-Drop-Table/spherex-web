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
import { Callout, Panel, type DockControls } from './ui'

interface Props {
  points: LightCurvePoint[]
  /** Epoch the timeline is showing now: marked on the curve so both views stay in step. */
  currentEpochId?: string | null
  /** Scientific caveats from the backend (unvalidated / saturated): always shown with the curve. */
  cautions?: string[]
  dock: DockControls
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
    <div className="border border-rule-strong bg-ink px-2 py-1 font-mono text-2xs leading-snug text-paper">
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
export default function LightCurvePanel({ points, currentEpochId, cautions = [], dock }: Props) {
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
    <Panel title="Light curve" subtitle={`Brightness at every visit · ${rows.length}/${points.length} visits with valid photometry · MJy/sr`} className="h-full" {...dock}>
      {/* caveats first: they change how the numbers below can be read */}
      {(cautions.length > 0 || (rows.length > 0 && notes.length > 0)) && (
        <div className="mb-3 space-y-2">
          {cautions.map(c => (
            <Callout key={c} tone="caution">
              {c}
            </Callout>
          ))}
          {rows.length > 0 &&
            notes.map(n => (
              <Callout key={n} tone="caution">
                {n}
              </Callout>
            ))}
        </div>
      )}

      {rows.length === 0 ? (
        <Callout>{notes[0] ?? 'No valid photometry at any visit.'}</Callout>
      ) : (
        <>
          <div className="h-48" data-testid="lightcurve-chart">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={rows} margin={{ top: 10, right: 12, bottom: 4, left: 0 }}>
                <CartesianGrid stroke="#2f2c25" strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  dataKey="t"
                  scale="time"
                  domain={domain}
                  ticks={rows.map(r => r.t)}
                  tickFormatter={shortDate}
                  tick={{ fill: '#aba390', fontSize: 10 }}
                />
                <YAxis
                  domain={['auto', 'auto']}
                  tick={{ fill: '#aba390', fontSize: 10 }}
                  tickFormatter={fmt}
                  width={42}
                />
                {current && <ReferenceLine x={current.t} stroke="#74c3b1" strokeDasharray="4 3" />}
                <Line
                  dataKey="flux"
                  stroke="#ece6d6"
                  strokeWidth={1.5}
                  dot={{ r: 4, fill: '#ece6d6', stroke: 'none' }}
                  activeDot={{ r: 5 }}
                  isAnimationActive={false}
                >
                  <ErrorBar dataKey="sigma" width={5} stroke="#aba390" strokeWidth={1.5} />
                </Line>
                <Tooltip content={<Tip />} isAnimationActive={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 font-mono text-2xs text-muted">
            {current ? (
              <>
                <span aria-hidden="true" className="mr-1 inline-block h-3 border-l border-dashed border-accent align-middle" />
                frame on screen ({current.epochId}) ·{' '}
              </>
            ) : null}
            error bars: ±1σ
          </p>
        </>
      )}
    </Panel>
  )
}
