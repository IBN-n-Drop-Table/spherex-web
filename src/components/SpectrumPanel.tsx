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
import { Button, Callout, Dot, Panel, type DockControls } from './ui'

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
  dock: DockControls
}

function Tip({ active, payload }: { active?: boolean; payload?: { payload: SpectrumRow }[] }) {
  const row = payload?.[0]?.payload
  if (!active || !row) return null
  return (
    <div className="border border-rule-strong bg-ink px-2 py-1 font-mono text-2xs leading-snug text-paper">
      <div>{row.w.toFixed(3)} µm · detector {row.detector}</div>
      <div>
        {fmt(row.flux)} ± {fmt(row.sigma)} MJy/sr
      </div>
      {row.quality === 'low' && <div className="text-caution">low quality (measured off-core)</div>}
    </div>
  )
}

/** Spectrum chart for a target or an anomaly (precomputed by the backend, so it is instant). */
export default function SpectrumPanel({ view, onShowTarget, dock }: Props) {
  const rows = useMemo(() => buildRows(view.spectrum), [view.spectrum])
  const detectorsPresent = useMemo(() => DETECTORS.filter(d => rows.some(r => r.detector === d)), [rows])
  const empty = rows.length === 0
  const busy = Boolean(view.loading)

  return (
    <Panel
      title={view.title}
      subtitle={['Spectrum: brightness at each infrared wavelength', view.subtitle, view.epochId && `visit ${view.epochId}`].filter(Boolean).join(' · ')}
      actions={
        onShowTarget && (
          <Button size="sm" onClick={onShowTarget} title="Back to the spectrum of the object itself">
            Target
          </Button>
        )
      }
      className="h-full"
      {...dock}
    >
      {busy ? (
        <div className="border border-rule p-3">
          <JobProgressBar job={view.loading?.job ?? null} fallbackText="Measuring this position…" />
        </div>
      ) : view.error ? (
        <Callout tone="error">{view.error}</Callout>
      ) : empty ? (
        <Callout>{view.emptyText}</Callout>
      ) : (
        <>
          <div className="h-60" data-testid="spectrum-chart">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={rows} margin={{ top: 14, right: 8, bottom: 14, left: 0 }}>
                <CartesianGrid stroke="#2f2c25" strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  dataKey="w"
                  domain={[0.7, 5.05]}
                  ticks={[1, 2, 3, 4, 5]}
                  tick={{ fill: '#aba390', fontSize: 10 }}
                  label={{ value: 'wavelength (µm)', position: 'insideBottom', offset: -2, fill: '#aba390', fontSize: 10 }}
                  height={42}
                />
                <YAxis
                  domain={['auto', 'auto']}
                  tick={{ fill: '#aba390', fontSize: 10 }}
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
                <Area dataKey="band" stroke="none" fill="#aba390" fillOpacity={0.2} isAnimationActive={false} />
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

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-2xs text-muted">
            <span className="tabular-nums">
              {rows.length}/{TOTAL_CHANNELS} channels
            </span>
            {detectorsPresent.map(d => (
              <span key={d} className="flex items-center gap-1" title={`Detector ${d}`}>
                <Dot color={DETECTOR_COLORS[d]} /> {d}
              </span>
            ))}
            <span className="flex items-center gap-1">
              <span aria-hidden="true" className="inline-block h-2.5 w-1.5 bg-muted/40" /> ±1σ
            </span>
          </div>
          <p className="mt-1 text-2xs text-faint">Each colour is one of the six detectors. Shaded bands: the wavelengths of the H2O, CO2 and CO filters.</p>
        </>
      )}

      {view.warning && !busy && (
        <Callout tone="caution" className="mt-3">
          {view.warning}
        </Callout>
      )}
      {/* when empty, the message already is the explanation box above */}
      {!empty && !busy && view.message && (
        <Callout tone="caution" className="mt-3">
          {view.message}
        </Callout>
      )}
    </Panel>
  )
}
