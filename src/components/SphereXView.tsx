import { useMemo, useState } from 'react'
import { useSkyPatch } from '../hooks/useSkyPatch'
import { useAutoplay } from '../hooks/useAutoplay'
import { LAYER_DIFF } from '../lib/layers'
import { fmt } from '../lib/coords'
import SkyViewer from './SkyViewer'
import type { JobProgress } from '../hooks/useSkyPatch'
import TimelineBar from './TimelineBar'
import LayerSwitcher from './LayerSwitcher'

const FPS_OPTIONS = [1, 2, 4, 12, 24]
const NO_ANOMALIES: never[] = []
const NO_EPOCHS: never[] = []
// Chemical filters named in the contract; shown (inert) until real data says otherwise.
const DEFAULT_FILTERS = ['H2O', 'CO2', 'CO']
const STAGE_LABEL: Record<string, string> = {
  queued: 'Queued',
  query: 'Searching IRSA',
  download: 'Downloading cutouts',
  stack: 'Combining exposures',
  render: 'Rendering images',
  done: 'Done',
}
// The API only accepts fov between 1 and 30 arcmin (422 otherwise) and caps live jobs at 15;
// cached targets are always 5. The sky map can zoom much wider, so the request is clamped.
const PATCH_FOV_MIN_ARCMIN = 1
const PATCH_FOV_MAX_ARCMIN = 15
const patchFov = (fov: number) => Math.min(Math.max(fov, PATCH_FOV_MIN_ARCMIN), PATCH_FOV_MAX_ARCMIN)

interface Props {
  ra: number
  dec: number
  fov: number // arcmin, as seen on the sky map (clamped for the request)
  layer: string
  onLayerChange: (layer: string) => void
  onBack: () => void
  /** Escape hatch when there is no data here: jump to a known-good target. */
  onTryDefault: () => void
}

/**
 * The SPHEREx data view: asks the backend for the patch at the coordinates the user was looking
 * at on the sky map, then shows its epochs (timeline / blink), chemical filters and the
 * difference image with anomaly markers. Mounted only while this view is open, so every visit
 * starts from a clean state (never a stale patch from another place).
 */
/** Progress card for a live job (cold jobs take tens of seconds up to a few minutes). */
function JobCard({ job }: { job: JobProgress | null }) {
  const pct = Math.round((job?.progress ?? 0) * 100)
  return (
    <div className="absolute left-1/2 top-1/2 z-10 w-96 -translate-x-1/2 -translate-y-1/2 space-y-2 rounded bg-black/80 p-4 text-sm backdrop-blur">
      <div className="flex justify-between">
        <span>{STAGE_LABEL[job?.stage ?? 'queued'] ?? job?.stage}</span>
        <span className="tabular-nums text-slate-400">
          {pct}%{job?.etaSeconds != null ? ` · ~${job.etaSeconds}s left` : ''}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded bg-slate-700">
        <div className="h-full bg-sky-500 transition-all" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-slate-300">{job?.message ?? 'Loading SPHEREx data…'}</p>
    </div>
  )
}

export default function SphereXView({ ra, dec, fov, layer, onLayerChange, onBack, onTryDefault }: Props) {
  const { data, loading, error, job } = useSkyPatch({ ra, dec, fov: patchFov(fov) })
  const [fpsIdx, setFpsIdx] = useState(1)
  const fps = FPS_OPTIONS[fpsIdx]
  const player = useAutoplay(data?.timelapse_epochs.length ?? 0, fps)

  const epoch = data?.timelapse_epochs[player.index]
  const imageUrl =
    data && epoch
      ? layer === LAYER_DIFF
        ? data.difference_imaging.subtracted_image_url
        : (epoch.chemical_filters[layer] ?? epoch.image_url)
      : null
  const anomalies =
    layer === LAYER_DIFF && data ? data.difference_imaging.detected_anomalies : NO_ANOMALIES

  // Filters present in ANY epoch (a molecule is omitted from visits that don't cover it).
  const filters = useMemo(() => {
    if (!data) return DEFAULT_FILTERS
    const seen = new Set(data.timelapse_epochs.flatMap(e => Object.keys(e.chemical_filters)))
    return [...DEFAULT_FILTERS.filter(f => seen.has(f)), ...[...seen].filter(f => !DEFAULT_FILTERS.includes(f))]
  }, [data])
  const unavailable = epoch ? filters.filter(f => !epoch.chemical_filters[f]) : []
  const diff = data?.difference_imaging

  return (
    <div className="absolute inset-0 z-0 bg-black">
      {data && epoch && imageUrl && (
        <SkyViewer
          imageUrl={imageUrl}
          alt={`${data.target_info.name} ${epoch.epoch_id} ${layer}`}
          anomalies={anomalies}
        />
      )}

      <div className="absolute left-3 top-3 z-10 flex flex-col gap-2">
        <button
          onClick={onBack}
          className="rounded bg-black/70 px-3 py-2 text-sm backdrop-blur hover:bg-slate-800"
        >
          ← Back to sky map
        </button>
        <div className="rounded bg-black/70 p-3 font-mono text-xs backdrop-blur">
          <div className="text-slate-400">SPHEREx data for</div>
          <div>RA&nbsp; {fmt(ra)}°</div>
          <div>Dec {fmt(dec)}°</div>
          {data && <div className="mt-1 text-slate-300">{data.target_info.name}</div>}
        </div>
      </div>

      <div className="absolute left-1/2 top-3 z-10 flex w-[28rem] max-w-[60vw] -translate-x-1/2 flex-col gap-2 text-center text-xs">
        {data?.fallback && (
          <p className="rounded bg-amber-900/80 px-3 py-2 backdrop-blur">
            {data.fallback_message ?? 'Showing cached data for another position.'}
          </p>
        )}
        {layer === LAYER_DIFF && diff && (
          <div className="rounded bg-black/70 px-3 py-2 backdrop-blur">
            <div className="font-medium text-slate-100">
              {diff.detection_label ?? 'Software-assisted detection (BETA)'} · {diff.epoch_a} − {diff.epoch_b}
            </div>
            <div className="text-slate-300">
              {diff.detection_notice ?? 'Detected by software: needs human verification'}
            </div>
            <div className="mt-1 flex justify-center gap-3 text-[11px] text-slate-400">
              <span><span className="text-emerald-400">●</span> appeared</span>
              <span><span className="text-rose-400">●</span> disappeared</span>
              <span><span className="text-amber-400">●</span> contaminated</span>
            </div>
          </div>
        )}
      </div>

      {loading && !data && <JobCard job={job} />}

      {error && !data && (
        <div className="absolute left-1/2 top-1/2 z-10 w-80 -translate-x-1/2 -translate-y-1/2 space-y-3 rounded bg-black/80 p-4 text-center text-sm backdrop-blur">
          <p>{error}</p>
          <div className="flex justify-center gap-2">
            <button onClick={onBack} className="rounded bg-slate-700 px-3 py-1 hover:bg-slate-600">
              Back
            </button>
            <button onClick={onTryDefault} className="rounded bg-sky-600 px-3 py-1 hover:bg-sky-500">
              Try WISE 0855
            </button>
          </div>
        </div>
      )}

      {/* Always rendered so the interface keeps its shape; inert until there is data. */}
      <LayerSwitcher
        filters={filters}
        layer={layer}
        onChange={onLayerChange}
        disabled={!data}
        unavailable={unavailable}
      />
      <TimelineBar
        epochs={data?.timelapse_epochs ?? NO_EPOCHS}
        index={player.index}
        playing={player.playing}
        fps={fps}
        onIndex={player.setIndex}
        onToggle={player.toggle}
        onPrev={player.prev}
        onNext={player.next}
        onFpsClick={() => setFpsIdx(i => (i + 1) % FPS_OPTIONS.length)}
      />
    </div>
  )
}
