import { useMemo, useState } from 'react'
import { useSkyPatch } from '../hooks/useSkyPatch'
import { useAutoplay } from '../hooks/useAutoplay'
import { LAYER_DIFF } from '../lib/layers'
import { fmt } from '../lib/coords'
import SkyViewer from './SkyViewer'
import SpectrumPanel, { type SpectrumView } from './SpectrumPanel'
import LightCurvePanel from './LightCurvePanel'
import CommunityPanel, { type ReportSelection } from './CommunityPanel'
import { useSpectrumProbe, type ProbePoint } from '../hooks/useSpectrumProbe'
import { pixelToSky } from '../lib/wcs'
import { resolveAssetUrl } from '../api/http'
import { useReports } from '../hooks/useReports'
import { classificationInfo } from '../lib/reports'
import { positionInImage } from '../lib/shareCard'
import type { CommunityMarker } from './SkyViewer'
import type { JobProgress } from '../hooks/useSkyPatch'
import JobProgressBar from './JobProgressBar'
import TimelineBar from './TimelineBar'
import LayerSwitcher from './LayerSwitcher'

const FPS_OPTIONS = [1, 2, 4, 12, 24]
const NO_ANOMALIES: never[] = []
const NO_EPOCHS: never[] = []
// Chemical filters named in the contract; shown (inert) until real data says otherwise.
const DEFAULT_FILTERS = ['H2O', 'CO2', 'CO']
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
  return (
    <div className="absolute left-1/2 top-1/2 z-10 w-96 -translate-x-1/2 -translate-y-1/2 rounded bg-black/80 p-4 backdrop-blur">
      <JobProgressBar job={job} fallbackText="Loading SPHEREx data…" />
    </div>
  )
}

export default function SphereXView({ ra, dec, fov, layer, onLayerChange, onBack, onTryDefault }: Props) {
  const { data, loading, error, job } = useSkyPatch({ ra, dec, fov: patchFov(fov) })
  const [fpsIdx, setFpsIdx] = useState(1)
  // Which spectrum the panel shows: the target's own (null) or an anomaly's.
  const [selectedAnomaly, setSelectedAnomaly] = useState<string | null>(null)
  // A free click on the image: the pixel centre, tied to the patch it was made on.
  const [probe, setProbe] = useState<{ x: number; y: number; patchKey: string } | null>(null)
  const [spectrumOpen, setSpectrumOpen] = useState(false) // charts stay closed until asked for
  // The left column holds ONE extra panel at a time (they don't fit together); closed until asked for.
  const [leftPanel, setLeftPanel] = useState<'lightcurve' | 'community' | null>(null)
  const [allTargets, setAllTargets] = useState(false) // community feed: every target, not just this one
  const [showMarkers, setShowMarkers] = useState(false) // community reports drawn on the image
  const [highlightReport, setHighlightReport] = useState<string | null>(null)
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

  // A probe belongs to the patch it was made on; a new patch discards it.
  const patchKey = data ? `${data.patch.wcs.crval1}|${data.patch.wcs.crval2}` : null
  const activeProbe = probe && probe.patchKey === patchKey ? probe : null
  const probePoint = useMemo<ProbePoint | null>(() => {
    if (!data || !activeProbe) return null
    const { ra, dec } = pixelToSky(data.patch, activeProbe.x, activeProbe.y)
    return { ra, dec, fov: Math.min(data.target_info.fov_arcmin, PATCH_FOV_MAX_ARCMIN) }
  }, [data, activeProbe])
  const probed = useSpectrumProbe(probePoint)

  const spectrumView = useMemo<SpectrumView | null>(() => {
    if (!data) return null
    if (probePoint) {
      const where = `RA ${probePoint.ra.toFixed(4)}° · Dec ${probePoint.dec.toFixed(4)}°`
      if (probed.loading) {
        return { title: 'Clicked point', subtitle: where, epochId: null, spectrum: [], emptyText: '', loading: { job: probed.job } }
      }
      if (probed.error || !probed.data) {
        return { title: 'Clicked point', subtitle: where, epochId: null, spectrum: [], emptyText: '', error: probed.error ?? 'No spectrum.' }
      }
      const r = probed.data
      if (r.fallback) {
        // IRSA failed: the backend returns the cached TARGET spectrum, which is NOT this point's.
        return {
          title: 'Clicked point · no live data',
          subtitle: where,
          epochId: r.epoch_id,
          spectrum: [],
          emptyText: '',
          error: r.fallback_message ?? 'The live measurement failed.',
        }
      }
      return {
        title: r.source === 'anomaly' && r.anomaly_id ? `${r.anomaly_id} (matched to your click)` : 'Clicked point',
        subtitle: where,
        epochId: r.epoch_id,
        spectrum: r.spectrum_102_bands,
        message: r.spectrum_message,
        emptyText: r.spectrum_message ?? 'No valid channels at this position.',
        warning: r.is_cached_golden_path
          ? null
          : `Measured live from IRSA: one exposure per detector (${r.spectrum_102_bands.length} channels), so this spectrum is sparse.`,
      }
    }
    const anomaly = data.difference_imaging.detected_anomalies.find(a => a.anomaly_id === selectedAnomaly)
    if (anomaly) {
      return {
        title: anomaly.anomaly_id,
        subtitle: [anomaly.kind, `SNR ${anomaly.snr_confidence}`, ...anomaly.contamination_flags].filter(Boolean).join(' · '),
        epochId: anomaly.spectrum_epoch_id,
        spectrum: anomaly.spectrum_102_bands,
        emptyText: 'No valid channels for this source: every channel is masked or has no coverage.',
      }
    }
    return {
      title: `Target · ${data.target_info.name}`,
      subtitle: data.saturated ? 'saturated core' : undefined,
      epochId: data.spectrum_epoch_id,
      spectrum: data.spectrum_102_bands,
      message: data.spectrum_message,
      emptyText: data.spectrum_message ?? 'No valid spectrum for the target.',
    }
  }, [data, selectedAnomaly, probePoint, probed])

  // What a new community report would be about: the clicked point, else the selected anomaly.
  const reportSelection = useMemo<ReportSelection | null>(() => {
    if (!data) return null
    if (probePoint && activeProbe) {
      const matched = probed.data?.source === 'anomaly' ? (probed.data.anomaly_id ?? undefined) : undefined
      return {
        label: matched ? `Clicked point · matches ${matched}` : 'Clicked point',
        ra: probePoint.ra,
        dec: probePoint.dec,
        pixel: { x: Math.floor(activeProbe.x), y: Math.floor(activeProbe.y) },
        anomalyId: matched,
      }
    }
    const a = data.difference_imaging.detected_anomalies.find(x => x.anomaly_id === selectedAnomaly)
    if (!a) return null
    return {
      label: `${a.anomaly_id}${a.kind ? ` · ${a.kind}` : ''}`,
      ra: a.ra_deg,
      dec: a.dec_deg,
      pixel: { x: a.pixel_x, y: a.pixel_y },
      anomalyId: a.anomaly_id,
    }
  }, [data, activeProbe, probePoint, probed.data, selectedAnomaly])

  // Community feed: lives here (not in the panel) so the image can draw the same reports.
  const communityOpen = leftPanel === 'community'
  const targetName = data?.target_info.name ?? null
  const feed = useReports(allTargets ? null : targetName, { enabled: communityOpen && data !== null })
  const communityMarkers = useMemo<CommunityMarker[]>(() => {
    if (!data || !communityOpen || !showMarkers) return []
    const found: CommunityMarker[] = []
    for (const r of feed.reports) {
      const p = positionInImage(r, { url: '', patch: data.patch, targetName: data.target_info.name })
      if (!p) continue // another target, or outside this image
      const kind = classificationInfo(r.classification)
      found.push({ id: r.id, x: p.x, y: p.y, color: kind.color, label: `${kind.label} · ${r.discoverer}` })
    }
    return found
  }, [data, communityOpen, showMarkers, feed.reports])

  return (
    <div className="absolute inset-0 z-0 bg-black">
      {data && epoch && imageUrl && (
        <SkyViewer
          imageUrl={imageUrl}
          alt={`${data.target_info.name} ${epoch.epoch_id} ${layer}`}
          anomalies={anomalies}
          selectedId={selectedAnomaly}
          onSelect={id => {
            setSelectedAnomaly(id)
            setProbe(null)
            setSpectrumOpen(true)
          }}
          probe={activeProbe}
          communityMarkers={communityMarkers}
          highlightedCommunityId={highlightReport}
          onCommunitySelect={setHighlightReport}
          onProbe={(x, y) => {
            if (!patchKey) return
            setProbe({ x, y, patchKey })
            setSelectedAnomaly(null)
            setSpectrumOpen(true)
          }}
        />
      )}

      <div className="absolute left-3 top-3 z-10 flex flex-col items-start gap-2">
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

        <div className="flex gap-2">
          {[
            { label: 'Spectrum', open: spectrumOpen, toggle: () => setSpectrumOpen(o => !o) },
            { label: 'Light curve', open: leftPanel === 'lightcurve', toggle: () => setLeftPanel(p => (p === 'lightcurve' ? null : 'lightcurve')) },
            { label: 'Community', open: leftPanel === 'community', toggle: () => setLeftPanel(p => (p === 'community' ? null : 'community')) },
          ].map(b => (
            <button
              key={b.label}
              onClick={b.toggle}
              disabled={!data}
              aria-pressed={b.open}
              className={`rounded px-3 py-2 text-sm backdrop-blur disabled:opacity-40 ${
                b.open ? 'bg-sky-600' : 'bg-black/70 hover:bg-slate-800'
              }`}
            >
              {b.label}
            </button>
          ))}
        </div>

        {data && leftPanel === 'lightcurve' && (
          <LightCurvePanel
            points={data.light_curve}
            currentEpochId={epoch?.epoch_id}
            onClose={() => setLeftPanel(null)}
          />
        )}
        {data && leftPanel === 'community' && (
          <CommunityPanel
            targetName={data.target_info.name}
            selection={reportSelection}
            feed={feed}
            allTargets={allTargets}
            onAllTargetsChange={setAllTargets}
            showMarkers={showMarkers}
            onShowMarkersChange={setShowMarkers}
            highlightId={highlightReport}
            cardImage={data && imageUrl ? { url: resolveAssetUrl(imageUrl), patch: data.patch, targetName: data.target_info.name } : null}
            onClose={() => setLeftPanel(null)}
          />
        )}
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

      {data && spectrumView && spectrumOpen && (
        <SpectrumPanel
          view={spectrumView}
          onShowTarget={
            selectedAnomaly || activeProbe
              ? () => {
                  setSelectedAnomaly(null)
                  setProbe(null)
                }
              : undefined
          }
          onClose={() => setSpectrumOpen(false)}
        />
      )}
    </div>
  )
}
