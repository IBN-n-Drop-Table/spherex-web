import { useCallback, useRef, useState } from 'react'
import { DEFAULT_STATE, useUrlState } from './hooks/useUrlState'
import SkyMap, { type SkyFootprint, type SkyMapHandle } from './components/SkyMap'
import MiniMap from './components/MiniMap'
import SkyCommunity from './components/SkyCommunity'
import { useReports } from './hooks/useReports'
import type { CitizenReport } from './types/api'
import SphereXView from './components/SphereXView'
import CoordinatesPanel from './components/CoordinatesPanel'
import TargetPicker from './components/TargetPicker'
import { TARGET_FOV_ARCMIN, targetPosition, type Target } from './data/targets'
import Credits from './components/Credits'
import GameDialog from './components/GameDialog'
import { useSkyPointing } from './hooks/useSkyPointing'
import SkyAimPanel from './components/SkyAimPanel'

/**
 * Two views, switched with a button (and the URL: ?view=data):
 *  - sky map: Aladin only, with the editable coordinates / FOV. No backend calls.
 *  - SPHEREx data: asks the backend for the coordinates the user was looking at.
 */
const NO_REPORTS: CitizenReport[] = []

export default function App() {
  const [{ ra, dec, fov, band: layer, view }, setUrl] = useUrlState()
  const mapRef = useRef<SkyMapHandle>(null)
  const [wipe, setWipe] = useState(false)
  const [gameOpen, setGameOpen] = useState(false) // the "Find what moves" game (also reachable from the data view)
  const [footprint, setFootprint] = useState<SkyFootprint | null>(null)

  // Community sightings on the sky map: the list, and (optionally) their markers on the map.
  const [communityOpen, setCommunityOpen] = useState(false)
  const [showCommunityMarkers, setShowCommunityMarkers] = useState(false)
  const [highlightReport, setHighlightReport] = useState<string | null>(null)
  const feed = useReports(null, { enabled: view === 'sky' && communityOpen, limit: 100 })
  const markerReports = communityOpen && showCommunityMarkers ? feed.reports : NO_REPORTS

  // From a list item or a marker: show that position on the map; "View SPHEREx data here" does the rest.
  const goToReport = (r: CitizenReport) => {
    setHighlightReport(r.id)
    setUrl({ ra: r.ra_deg, dec: r.dec_deg, fov: TARGET_FOV_ARCMIN })
  }

  // "Point your phone at the sky": the map follows the phone's sensors (they stay on the device).
  const pointing = useSkyPointing(p => mapRef.current?.pointTo(p.ra, p.dec))
  const [aimOpen, setAimOpen] = useState(false) // "What is above you?" panel
  const pointMap = useCallback((ra: number, dec: number) => mapRef.current?.pointTo(ra, dec), [])
  const openAim = () => {
    if (fov < 1200) setUrl({ fov: 3600 }, { replace: true }) // about the view of a phone camera
    setAimOpen(true)
  }
  const closeAim = () => {
    pointing.stop()
    setAimOpen(false)
    const live = mapRef.current?.getView() // the map moved without the URL: save where it ended up
    if (live) setUrl(live, { replace: true })
  }
  const goToTarget = (t: Target) => {
    pointing.stop()
    setAimOpen(false)
    setUrl({ ...targetPosition(t), fov: TARGET_FOV_ARCMIN })
  }

  const openData = () => {
    pointing.stop()
    setAimOpen(false)
    // Read the live map position so a click right after a pan/zoom doesn't use a stale URL.
    const live = mapRef.current?.getView()
    setUrl({ ...(live ?? {}), view: 'data' })
  }

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-black text-slate-100">
      {view === 'sky' ? (
        <>
          <SkyMap
            ref={mapRef}
            ra={ra}
            dec={dec}
            fov={fov}
            onViewChange={v => setUrl(v, { replace: true })}
            onFootprintChange={setFootprint}
            wipe={wipe}
            communityReports={markerReports}
            highlightedReportId={highlightReport}
            onCommunityClick={id => {
              const r = feed.reports.find(x => x.id === id)
              if (r) goToReport(r)
            }}
          />
          <MiniMap
            footprint={footprint}
            onPick={(r, d, phase, target) =>
              // Pressing a target marker = the same as choosing it in the drop-down.
              target
                ? setUrl({ ...targetPosition(target), fov: TARGET_FOV_ARCMIN })
                : setUrl({ ra: r, dec: d }, { replace: phase === 'move' })
            }
          />
          <div className="absolute left-3 top-3 z-10 flex w-fit flex-col gap-2">
            <CoordinatesPanel
              key={`${ra}|${dec}|${fov}`}
              value={{ ra, dec, fov }}
              onSubmit={c => setUrl(c)}
            />
            <button
              onClick={() => setWipe(w => !w)}
              aria-pressed={wipe}
              title="Slide a bar over the sky: visible light on the left, infrared on the right"
              className={`rounded px-3 py-2 text-left text-sm shadow ${wipe ? 'bg-sky-600' : 'bg-slate-900/80 hover:bg-slate-800'}`}
            >
              {wipe ? 'Hide comparison' : 'Compare: eye vs infrared'}
            </button>
            <button
              onClick={aimOpen ? closeAim : openAim}
              aria-pressed={aimOpen}
              title="See the part of the sky above you, from where you are, right now"
              className={`rounded px-3 py-2 text-left text-sm shadow ${aimOpen ? 'bg-sky-600' : 'bg-slate-900/80 hover:bg-slate-800'}`}
            >
              {aimOpen ? 'Close: what is above you' : 'Point at the sky'}
            </button>
            {aimOpen && <SkyAimPanel onPoint={pointMap} onGoTo={goToTarget} sensors={pointing} onClose={closeAim} />}
            <button
              onClick={() => setGameOpen(true)}
              title="A short game: two images flicker, click what moved"
              className="rounded bg-slate-900/80 px-3 py-2 text-left text-sm shadow hover:bg-slate-800"
            >
              Play: find what moves
            </button>
            <SkyCommunity
              open={communityOpen}
              onToggle={() => setCommunityOpen(o => !o)}
              feed={feed}
              showMarkers={showCommunityMarkers}
              onShowMarkersChange={setShowCommunityMarkers}
              highlightId={highlightReport}
              onLocate={goToReport}
            />
            <TargetPicker
              onSelect={t => setUrl({ ...targetPosition(t), fov: TARGET_FOV_ARCMIN })}
            />
          </div>
          <button
            onClick={openData}
            className={`absolute bottom-14 left-1/2 z-10 -translate-x-1/2 rounded bg-sky-600 px-4 py-2 text-sm font-medium shadow hover:bg-sky-500 sm:bottom-auto sm:top-3 ${aimOpen ? 'hidden sm:block' : ''}`}
          >
            View SPHEREx data here →
          </button>
        </>
      ) : (
        <SphereXView
          ra={ra}
          dec={dec}
          fov={fov}
          layer={layer}
          onLayerChange={band => setUrl({ band }, { replace: true })}
          onBack={() => setUrl({ view: 'sky' })}
          onTryDefault={() =>
            setUrl({ ra: DEFAULT_STATE.ra, dec: DEFAULT_STATE.dec, fov: DEFAULT_STATE.fov })
          }
        />
      )}

      {view === 'sky' && gameOpen && <GameDialog onClose={() => setGameOpen(false)} />}

      <Credits raised={view === 'data'} />
    </main>
  )
}
