import { cautionLines } from '../lib/caution'
import ChatPanel from './ChatPanel'
import { useTargetFacts } from '../hooks/useTargetFacts'
import { findTarget, lightStory } from '../lib/story'
import { useNearbyStar } from '../hooks/useNearbyStar'
import { nearbyStarText } from '../lib/simbad'
import { useMemo, useState, type ReactNode } from 'react'
import { useSkyPatch } from '../hooks/useSkyPatch'
import { useAutoplay } from '../hooks/useAutoplay'
import { LAYER_DETECT, LAYER_DIFF } from '../lib/layers'
import { buildDiffFrames, totalFrame, type DiffFrame } from '../lib/diffFrames'
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
import type { CommunityMarker, MotionMarks } from './SkyViewer'
import { expectedPixel, knownTarget } from '../lib/motion'
import type { JobProgress } from '../hooks/useSkyPatch'
import JobProgressBar from './JobProgressBar'
import TimelineBar, { type TimelineFrame } from './TimelineBar'
import LayerSwitcher from './LayerSwitcher'
import ToolRail, { type ToolGroup } from './ToolRail'
import { Button, Callout, Check, LinkButton } from './ui'
import { cx } from './classes'
import { ChatIcon, CurveIcon, PinIcon, SpectrumIcon } from './icons'

const FPS_OPTIONS = [1, 2, 4, 12, 24]
const NO_ANOMALIES: never[] = []
const NO_EPOCHS: never[] = []
const NO_FRAMES: DiffFrame[] = []
const fmtDate = (iso: string | undefined) => (iso ? new Date(iso).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : '—')
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
  /** A tool named in the link (`&tool=spectrum`): opened once the data is there. */
  startTool?: string | null
}

/** What the dock shows: one thing at a time. */
type Tab = 'spectrum' | 'lightcurve' | 'chat' | 'community'
const TABS: Record<string, Tab> = { spectrum: 'spectrum', lightcurve: 'lightcurve', ask: 'chat', chat: 'chat', community: 'community' }

/** Molecule names with their subscripts (the fonts have no subscript digits). */
function layerName(l: string): ReactNode {
  const parts = l.split(/(\d)/)
  return parts.length === 1 ? l : parts.map((x, i) => (/\d/.test(x) ? <sub key={i}>{x}</sub> : x))
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
    <div className="absolute left-1/2 top-1/2 z-10 w-[min(28rem,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2 border border-rule-strong bg-surface p-5">
      <JobProgressBar job={job} fallbackText="Loading SPHEREx data…" large />
    </div>
  )
}

export default function SphereXView({ ra, dec, fov, layer, onLayerChange, onBack, onTryDefault, startTool }: Props) {
  const { data, loading, error, job } = useSkyPatch({ ra, dec, fov: patchFov(fov) })
  const [fpsIdx, setFpsIdx] = useState(1)
  // Which spectrum the panel shows: the target's own (null) or an anomaly's.
  const [selectedAnomaly, setSelectedAnomaly] = useState<string | null>(null)
  // A free click on the image: the pixel centre, tied to the patch it was made on.
  const [probe, setProbe] = useState<{ x: number; y: number; patchKey: string } | null>(null)
  // The dock holds ONE panel at a time; closed until asked for (or named in the link).
  const [tab, setTab] = useState<Tab | null>(startTool ? (TABS[startTool] ?? null) : null)
  const [minimised, setMinimised] = useState(false) // phones: the dock folded to its header
  // The report form keeps what was typed while another tab is looked at.
  const [communityUsed, setCommunityUsed] = useState(tab === 'community')
  const openTab = (t: Tab | null) => {
    setTab(t)
    setMinimised(false)
    if (t === 'community') setCommunityUsed(true)
  }
  // A click on the image shows that spectrum, unless a report is being written (the click is its subject).
  const showSpectrum = () => {
    if (tab !== 'community') openTab('spectrum')
  }
  const [allTargets, setAllTargets] = useState(false) // community feed: every target, not just this one
  const [showMarkers, setShowMarkers] = useState(false) // community reports drawn on the image
  const [highlightReport, setHighlightReport] = useState<string | null>(null)
  const targetFacts = useTargetFacts()
  // Cached data for ANOTHER position (fallback) must not borrow that object's story.
  const facts = data?.fallback ? undefined : findTarget(targetFacts, data?.target_info.name)
  // Any other position: what SIMBAD catalogues right there (only when it is not one of the five).
  const nearby = useNearbyStar(ra, dec, data !== null && !data.fallback && !facts)
  const [infoOpen, setInfoOpen] = useState(false) // details of the Difference / Detections layer
  const [noteOpen, setNoteOpen] = useState(false) // the long scientific caveat (collapsed by default)
  const [motionOn, setMotionOn] = useState(true) // rings + arrow where the target should be (checkbox in the difference notice)
  const fps = FPS_OPTIONS[fpsIdx]
  const diff = data?.difference_imaging
  const patchKey = data ? `${data.patch.wcs.crval1}|${data.patch.wcs.crval2}` : null

  // One player for everything. On the epoch layers its frames are the visits; on Difference they are
  // the CONSECUTIVE pairs of visits (3 epochs -> 2 frames); on Detections it is the single
  // first-vs-last image the anomaly detector ran on.
  const inDiff = layer === LAYER_DIFF
  const inDetect = layer === LAYER_DETECT
  const diffLike = inDiff || inDetect
  const diffFrames = useMemo(() => (diff ? buildDiffFrames(diff) : NO_FRAMES), [diff])
  const detectFrames = useMemo(() => (diff ? [totalFrame(diff)] : NO_FRAMES), [diff])
  const frames = inDiff ? diffFrames : inDetect ? detectFrames : null
  const player = useAutoplay(frames ? frames.length : (data?.timelapse_epochs.length ?? 0), fps)

  const epoch = diffLike ? undefined : data?.timelapse_epochs[player.index]
  const activeDiff = frames?.[player.index]
  const timelineFrames = useMemo<TimelineFrame[]>(
    () =>
      frames
        ? frames.map(f => ({ label: f.label }))
        : (data?.timelapse_epochs ?? NO_EPOCHS).map(e => ({ label: fmtDate(e.date) })),
    [frames, data],
  )

  // Filters present in ANY epoch (a molecule is omitted from visits that don't cover it).
  const filters = useMemo(() => {
    if (!data) return DEFAULT_FILTERS
    const seen = new Set(data.timelapse_epochs.flatMap(e => Object.keys(e.chemical_filters)))
    return [...DEFAULT_FILTERS.filter(f => seen.has(f)), ...[...seen].filter(f => !DEFAULT_FILTERS.includes(f))]
  }, [data])
  const unavailable = epoch ? filters.filter(f => !epoch.chemical_filters[f]) : []

  const imageUrl = !data
    ? null
    : diffLike
      ? (activeDiff?.imageUrl ?? null)
      : epoch
        ? (epoch.chemical_filters[layer] ?? epoch.image_url)
        : null
  // The circles (and their spectra) belong to the first-vs-last image, so only Detections shows them.
  const anomalies = inDetect && data ? data.difference_imaging.detected_anomalies : NO_ANOMALIES

  // Where the target should be, from its catalogue proper motion (expected, not measured).
  const known = data ? knownTarget(data.target_info.name) : undefined
  const motion = useMemo<MotionMarks | null>(() => {
    if (!data || !known || !motionOn || !diffLike || !activeDiff) return null
    const t1 = Date.parse(data.timelapse_epochs[0].date) // the patch is centred on the target at this date
    const at = (id: string) => {
      const date = data.timelapse_epochs.find(e => e.epoch_id === id)?.date
      return date ? expectedPixel(known, data.patch, t1, Date.parse(date)) : null
    }
    const before = at(activeDiff.epochB)
    const after = at(activeDiff.epochA)
    if (!before || !after) return null
    return {
      points: [
        { ...before, color: '#76a8f5', label: `${known.name}: expected position in ${activeDiff.epochB} (blue: where it was)` },
        { ...after, color: '#f0766b', label: `${known.name}: expected position in ${activeDiff.epochA} (red: where it is)` },
      ],
      arrow: { from: before, to: after },
    }
  }, [data, known, motionOn, diffLike, activeDiff])

  // What the assistant is told about the screen: the object, the layer and the backend's own caveats.
  const chatContext = useMemo<Record<string, unknown>>(
    () => ({
      ...(facts ? { target: facts.key } : { target_name: data?.target_info.name }),
      layer,
      blink: diffLike,
      weak_signal: diffLike && activeDiff ? activeDiff.weak : undefined,
      saturated: data?.saturated ?? undefined,
      quality: data?.quality ?? undefined,
      science_note: data?.science_note ?? undefined,
      fallback_reason: data?.fallback ? (data.fallback_reason ?? undefined) : undefined,
    }),
    [facts, data, layer, diffLike, activeDiff],
  )

  // A probe belongs to the patch it was made on; a new patch discards it.
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
      warning: cautionLines(data).join(' ') || null,
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
  const communityOpen = tab === 'community'
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


  // The five objects have a proper name worth a heading; anywhere else the name is just the coordinates.
  const heading = !data ? 'Loading…' : known || data.fallback ? data.target_info.name : 'This patch of sky'
  const cautions = data ? cautionLines(data, { full: true }) : []
  const dock = { onClose: () => openTab(null), minimised, onMinimise: () => setMinimised(m => !m) }
  // The raw text of a network failure ("TypeError: Failed to fetch") says nothing to a visitor.
  const errorText = error && /TypeError|Failed to fetch|NetworkError/i.test(error) ? 'The server could not be reached. Check your connection and try again in a moment.' : error

  /** What the data is about: name, coordinates, its one-line story and the scientific caveat. */
  const objectCard = (
    <div className="space-y-2 p-4">
      <div className="label-caps text-faint">SPHEREx data for</div>
      <h1 className="font-display text-2xl leading-7 text-paper">{heading}</h1>
      <div className="font-mono text-xs leading-relaxed text-muted">
        <div>RA&nbsp; {fmt(ra)}°</div>
        <div>Dec {fmt(dec)}°</div>
      </div>
      {facts && lightStory(facts) && (
        <p className="font-display text-sm italic leading-snug text-muted" title={facts.distance_source ?? undefined}>
          {lightStory(facts)}
        </p>
      )}
      {nearby !== undefined && (
        <p className="text-xs leading-snug text-muted" title="From SIMBAD (parallax). It is the closest catalogued star to the centre, not necessarily what you are looking at.">
          {nearby ? nearbyStarText(nearby) : 'No star with a measured distance at the centre of this view.'}
        </p>
      )}
      {data && cautions.length > 0 && (
        <Callout tone="caution">
          <span title="Scientific caveat from the data team: what can and cannot be claimed from this object">{cautionLines(data)[0] ?? 'Note about this data.'}</span>{' '}
          <LinkButton onClick={() => setNoteOpen(o => !o)} aria-expanded={noteOpen}>
            {noteOpen ? 'hide' : 'why?'}
          </LinkButton>
          {noteOpen && (
            <div className="mt-1.5 max-h-40 space-y-1 overflow-y-auto text-2xs text-muted">
              {cautions.map(line => (
                <p key={line}>{line}</p>
              ))}
            </div>
          )}
        </Callout>
      )}
    </div>
  )

  const tools: ToolGroup[] = [
    {
      label: 'Look closer',
      tools: [
        { id: 'spectrum', label: 'Spectrum', short: 'Spectrum', hint: 'Its light, split into 102 infrared colours', icon: <SpectrumIcon />, active: tab === 'spectrum', disabled: !data, onClick: () => openTab(tab === 'spectrum' ? null : 'spectrum') },
        { id: 'lightcurve', label: 'Light curve', short: 'Brightness', hint: 'Its brightness at every visit', icon: <CurveIcon />, active: tab === 'lightcurve', disabled: !data, onClick: () => openTab(tab === 'lightcurve' ? null : 'lightcurve') },
      ],
    },
    {
      label: 'Ask',
      tools: [{ id: 'chat', label: 'Ask about it', short: 'Ask', hint: 'What you see, explained in plain words', icon: <ChatIcon />, active: tab === 'chat', disabled: !data, onClick: () => openTab(tab === 'chat' ? null : 'chat') }],
    },
    {
      label: 'Community',
      tools: [{ id: 'community', label: 'Sightings here', short: 'Sightings', hint: 'What people reported, and your own report', icon: <PinIcon />, active: tab === 'community', disabled: !data, onClick: () => openTab(tab === 'community' ? null : 'community') }],
    },
  ]

  // In plain words, next to the layer buttons: what the picture on screen is.
  const caption: ReactNode = !data ? (
    'Each layer is a different way to look at the same patch of sky.'
  ) : inDetect ? (
    <>
      <span className="text-paper">Detections (beta) · needs human verification.</span> Candidates flagged by software on the first-versus-last difference.
    </>
  ) : inDiff && activeDiff ? (
    <>
      <span className="text-paper">
        {activeDiff.consecutive ? 'What changed between two consecutive visits' : 'What changed between the first and the last visit'} ({activeDiff.label}).
      </span>{' '}
      <span className="text-later">Red</span>: brighter later. <span className="text-earlier">Blue</span>: brighter earlier.
    </>
  ) : layer === 'base' || !filters.includes(layer) ? (
    'All the infrared light of this visit, in false colour. Press play to flick through the visits.'
  ) : (
    <>Only the light at the wavelengths where {layerName(layer)} leaves its mark.</>
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col md:flex-row">
      <ToolRail groups={tools} header={objectCard} label="Data tools" />

      {/* The dock: beside the rail on wide screens, under the picture on phones. */}
      {data && tab && (
        <div
          className={cx(
            'order-2 flex min-h-0 shrink-0 animate-rise flex-col border-t border-rule-strong md:order-none md:h-auto md:w-[23rem] md:border-r md:border-t-0',
            minimised ? 'max-md:h-auto' : 'max-md:h-[46%]',
          )}
        >
          {tab === 'spectrum' && spectrumView && (
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
              dock={dock}
            />
          )}
          {tab === 'lightcurve' && (
            <LightCurvePanel points={data.light_curve} currentEpochId={diffLike ? activeDiff?.epochA : epoch?.epoch_id} cautions={cautionLines(data)} dock={dock} />
          )}
          {tab === 'chat' && <ChatPanel targetKey={facts?.key ?? null} context={chatContext} position={!facts && !data.fallback ? { ra, dec } : undefined} dock={dock} />}
          {communityUsed && (
            <div className={cx('min-h-0 flex-1 flex-col', tab === 'community' ? 'flex' : 'hidden')}>
              <CommunityPanel
                targetName={data.target_info.name}
                selection={reportSelection}
                feed={feed}
                allTargets={allTargets}
                onAllTargetsChange={setAllTargets}
                showMarkers={showMarkers}
                onShowMarkersChange={setShowMarkers}
                highlightId={highlightReport}
                cardImage={imageUrl ? { url: resolveAssetUrl(imageUrl), patch: data.patch, targetName: data.target_info.name } : null}
                dock={dock}
              />
            </div>
          )}
        </div>
      )}
      {/* Phones have no room for the rail's header: the object card sits under the picture instead. */}
      {!(data && tab) && <div className="order-2 max-h-[38%] shrink-0 overflow-y-auto border-t border-rule bg-surface md:hidden">{objectCard}</div>}

      {/* The player: layers above the picture, time below it. */}
      <div className="order-1 flex min-h-0 min-w-0 flex-1 flex-col md:order-none">
        {/* Always rendered so the interface keeps its shape; inert until there is data. */}
        <LayerSwitcher filters={filters} layer={layer} onChange={onLayerChange} disabled={!data} unavailable={unavailable} name={layerName} />

        <div className="shrink-0 space-y-1.5 border-b border-rule bg-surface px-3 py-1.5 text-xs leading-snug text-muted">
          <div className="flex items-start justify-between gap-3">
            <p>{caption}</p>
            {diffLike && diff && activeDiff && (
              <LinkButton onClick={() => setInfoOpen(o => !o)} aria-expanded={infoOpen} className="shrink-0">
                {infoOpen ? 'Hide details' : 'Details'}
              </LinkButton>
            )}
          </div>
          {diffLike && activeDiff?.weak && <Callout tone="caution">Weak signal: the expected motion is under one SPHEREx pixel, so any change here is subtle.</Callout>}
          {diffLike && diff && activeDiff && infoOpen && (
            <div className="space-y-1.5 border-t border-rule pt-1.5">
              {inDetect ? (
                <>
                  <p>
                    {diff.detection_label ?? 'Software-assisted detection (BETA)'}: {diff.detection_notice ?? 'detected by software, needs human verification.'}
                  </p>
                  <p className="flex flex-wrap gap-x-4 gap-y-1">
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block h-2.5 w-2.5 rounded-full border-2 border-emerald-400" /> appeared
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block h-2.5 w-2.5 rounded-full border-2 border-rose-400" /> disappeared
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block h-2.5 w-2.5 rounded-full border-2 border-amber-400" /> contaminated (unreliable)
                    </span>
                  </p>
                </>
              ) : (
                <>
                  <p className="font-mono text-2xs">
                    {fmtDate(data?.timelapse_epochs.find(e => e.epoch_id === activeDiff.epochB)?.date)} to{' '}
                    {fmtDate(data?.timelapse_epochs.find(e => e.epoch_id === activeDiff.epochA)?.date)}
                    {activeDiff.deltaDays != null ? ` · ${Math.round(activeDiff.deltaDays)} days apart` : ''}
                    {activeDiff.expectedShiftArcsec != null ? ` · expected motion ${activeDiff.expectedShiftArcsec.toFixed(1)}″` : ''}
                  </p>
                  {diffFrames.length > 1 && <p>Press play to step through the {diffFrames.length} differences.</p>}
                  {known && (
                    <Check checked={motionOn} onChange={setMotionOn}>
                      Mark where {known.name} should be, from its known motion
                      {motionOn && (
                        <span className="text-faint">
                          {' '}
                          (<span className="text-earlier">blue ring</span>: before · <span className="text-later">red ring</span>: now · arrow: expected motion)
                        </span>
                      )}
                    </Check>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <div className="relative min-h-0 flex-1 bg-sunken">
          {data && imageUrl && (
            <SkyViewer
              imageUrl={imageUrl}
              alt={`${data.target_info.name} ${diffLike ? (activeDiff?.label ?? '') : (epoch?.epoch_id ?? '')} ${layer}`}
              anomalies={anomalies}
              selectedId={selectedAnomaly}
              onSelect={id => {
                setSelectedAnomaly(id)
                setProbe(null)
                showSpectrum()
              }}
              probe={activeProbe}
              communityMarkers={communityMarkers}
              motion={motion}
              highlightedCommunityId={highlightReport}
              onCommunitySelect={setHighlightReport}
              onProbe={(x, y) => {
                if (!patchKey) return
                setProbe({ x, y, patchKey })
                setSelectedAnomaly(null)
                showSpectrum()
              }}
            />
          )}

          {data?.fallback && (
            <div className="absolute inset-x-2 top-2 z-10 mx-auto max-w-xl">
              <Callout tone="caution" className="bg-caution-wash">
                {data.fallback_message ?? 'Showing cached data for another position.'}
              </Callout>
            </div>
          )}

          {loading && !data && <JobCard job={job} />}

          {errorText && !data && (
            <div className="absolute left-1/2 top-1/2 z-10 w-[22rem] max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 space-y-3 border border-rule-strong bg-surface p-4">
              <Callout tone="error" live>
                {errorText}
              </Callout>
              <div className="flex flex-wrap gap-2">
                <Button onClick={onBack}>Back to the sky map</Button>
                <Button variant="primary" onClick={onTryDefault}>
                  Try WISE 0855
                </Button>
              </div>
            </div>
          )}
        </div>

        <TimelineBar
          frames={timelineFrames}
          index={player.index}
          playing={player.playing}
          fps={fps}
          fpsOptions={FPS_OPTIONS}
          onFps={f => setFpsIdx(Math.max(0, FPS_OPTIONS.indexOf(f)))}
          onIndex={player.setIndex}
          onToggle={player.toggle}
          onPrev={player.prev}
          onNext={player.next}
        />
      </div>
    </div>
  )
}
