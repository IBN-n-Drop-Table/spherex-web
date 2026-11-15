import { useCallback, useEffect, useRef, useState } from 'react'
import { DEFAULT_STATE, useUrlState } from './hooks/useUrlState'
import { useIsWide } from './hooks/useMediaQuery'
import SkyMap, { type SkyFootprint, type SkyMapHandle } from './components/SkyMap'
import MiniMap from './components/MiniMap'
import SkyCommunity from './components/SkyCommunity'
import { useReports } from './hooks/useReports'
import type { CitizenReport } from './types/api'
import SphereXView from './components/SphereXView'
import TargetPicker from './components/TargetPicker'
import { TARGET_FOV_ARCMIN, targetPosition, type Target } from './data/targets'
import CreditsDialog from './components/Credits'
import GameDialog from './components/GameDialog'
import { useSkyPointing } from './hooks/useSkyPointing'
import SkyAimPanel from './components/SkyAimPanel'
import TopBar from './components/TopBar'
import ToolRail, { type ToolGroup } from './components/ToolRail'
import { Button, Panel } from './components/ui'
import { cx } from './components/classes'
import { AimIcon, ArrowRightIcon, BlinkIcon, CompareIcon, PinIcon, TargetIcon } from './components/icons'

const NO_REPORTS: CitizenReport[] = []

/** What the dock of the sky map is showing (one thing at a time). */
type SkyDock = 'objects' | 'aim' | 'sightings' | null
const SKY_DOCKS = ['objects', 'aim', 'sightings']

// Where the dock sits: a side panel beside the rail on wide screens, a bottom sheet on phones.
const DOCK_BOX =
  'absolute inset-x-0 bottom-0 z-20 flex max-h-[58%] animate-rise flex-col border-t border-rule-strong md:inset-y-0 md:left-0 md:right-auto md:max-h-none md:w-[22.5rem] md:border-r md:border-t-0'

/**
 * The viewer: two views that share one chrome (top bar, tool rail, dock).
 *  - sky map: Aladin only, to find a place. No backend calls.
 *  - SPHEREx data: asks the backend for the coordinates the user was looking at.
 * A link may name a tool to open (`&tool=compare`, used by the landing page); it is read once.
 */
export default function Viewer({ onHome }: { onHome: () => void }) {
  const [{ ra, dec, fov, band: layer, view }, setUrl] = useUrlState()
  const wide = useIsWide()
  const mapRef = useRef<SkyMapHandle>(null)
  const [startTool] = useState(() => new URLSearchParams(window.location.search).get('tool'))
  const [wipe, setWipe] = useState(startTool === 'compare')
  const [gameOpen, setGameOpen] = useState(startTool === 'play')
  const [creditsOpen, setCreditsOpen] = useState(false)
  const [footprint, setFootprint] = useState<SkyFootprint | null>(null)
  const [dock, setDock] = useState<SkyDock>(startTool && SKY_DOCKS.includes(startTool) ? (startTool as SkyDock) : null)

  // The tool named in the link has been taken: drop it so a reload or a shared link stays clean.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    if (!p.has('tool')) return
    p.delete('tool')
    window.history.replaceState(null, '', `${window.location.pathname}?${p}${window.location.hash}`)
  }, [])

  // Community sightings on the sky map: the list, and (optionally) their markers on the map.
  const communityOpen = dock === 'sightings'
  const [showCommunityMarkers, setShowCommunityMarkers] = useState(false)
  const [highlightReport, setHighlightReport] = useState<string | null>(null)
  const feed = useReports(null, { enabled: view === 'sky' && communityOpen, limit: 100 })
  const markerReports = communityOpen && showCommunityMarkers ? feed.reports : NO_REPORTS

  // From a list item or a marker: show that position on the map; the data button does the rest.
  const goToReport = (r: CitizenReport) => {
    setHighlightReport(r.id)
    setUrl({ ra: r.ra_deg, dec: r.dec_deg, fov: TARGET_FOV_ARCMIN })
  }

  // "Point at the sky": the map follows two sliders, or the phone's sensors (they stay on the device).
  const pointing = useSkyPointing(p => mapRef.current?.pointTo(p.ra, p.dec))
  const pointMap = useCallback((r: number, d: number) => mapRef.current?.pointTo(r, d), [])
  const leaveAim = () => {
    pointing.stop()
    const live = mapRef.current?.getView() // the map moved without the URL: save where it ended up
    if (live) setUrl(live, { replace: true })
  }
  const switchDock = (next: SkyDock) => {
    if (dock === 'aim' && next !== 'aim') leaveAim()
    if (next === 'aim' && fov < 1200) setUrl({ fov: 3600 }, { replace: true }) // about the view of a phone camera
    setDock(next)
  }
  const toggleDock = (id: Exclude<SkyDock, null>) => switchDock(dock === id ? null : id)

  const goToTarget = (t: Target) => {
    if (dock === 'aim') pointing.stop()
    if (dock === 'aim' || !wide) setDock(null) // on a phone the sheet would hide where the map went
    setUrl({ ...targetPosition(t), fov: TARGET_FOV_ARCMIN })
  }

  const openData = () => {
    pointing.stop()
    setDock(null)
    // Read the live map position so a click right after a pan/zoom doesn't use a stale URL.
    const live = mapRef.current?.getView()
    setUrl({ ...(live ?? {}), view: 'data' })
  }

  const skyTools: ToolGroup[] = [
    {
      label: 'Explore',
      tools: [
        { id: 'objects', label: 'Points of interest', short: 'Objects', hint: 'Five objects to start with', icon: <TargetIcon />, active: dock === 'objects', onClick: () => toggleDock('objects') },
        { id: 'aim', label: 'Point at the sky', short: 'Above me', hint: 'The sky above you, right now', icon: <AimIcon />, active: dock === 'aim', onClick: () => toggleDock('aim') },
        { id: 'compare', label: 'Eye vs infrared', short: 'Compare', hint: 'Slide a bar: visible light against infrared', icon: <CompareIcon />, active: wipe, onClick: () => setWipe(w => !w) },
      ],
    },
    {
      label: 'Play',
      tools: [{ id: 'play', label: 'Find what moves', short: 'Play', hint: 'A short game on real images', icon: <BlinkIcon />, onClick: () => setGameOpen(true) }],
    },
    {
      label: 'Community',
      tools: [{ id: 'sightings', label: 'Sightings', short: 'Sightings', hint: 'Candidates reported by people', icon: <PinIcon />, active: dock === 'sightings', onClick: () => toggleDock('sightings') }],
    },
  ]

  return (
    <main className="flex h-dvh w-screen flex-col overflow-hidden bg-ink text-paper">
      <TopBar
        view={view}
        onView={v => (v === 'data' ? openData() : setUrl({ view: 'sky' }))}
        coords={{ ra, dec, fov }}
        onCoords={c => setUrl(c)}
        onHome={onHome}
        onCredits={() => setCreditsOpen(true)}
      />

      {view === 'sky' ? (
        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          <ToolRail groups={skyTools} label="Sky map tools" />
          <div className="relative min-h-0 flex-1 overflow-hidden bg-sunken">
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
                // Pressing a target marker = the same as choosing it in the list.
                target ? setUrl({ ...targetPosition(target), fov: TARGET_FOV_ARCMIN }) : setUrl({ ra: r, dec: d }, { replace: phase === 'move' })
              }
            />

            {dock === 'objects' && (
              <div className={DOCK_BOX}>
                <Panel title="Points of interest" subtitle="The five objects of the challenge. Pick one and the map goes there." onClose={() => switchDock(null)} flush className="h-full">
                  <TargetPicker onSelect={goToTarget} />
                </Panel>
              </div>
            )}
            {dock === 'aim' && (
              <div className={DOCK_BOX}>
                <SkyAimPanel onPoint={pointMap} onGoTo={goToTarget} sensors={pointing} onClose={() => switchDock(null)} />
              </div>
            )}
            {dock === 'sightings' && (
              <div className={DOCK_BOX}>
                <Panel
                  title="Community sightings"
                  subtitle={!feed.loading && !feed.error ? `${feed.reports.length} reported` : undefined}
                  onClose={() => switchDock(null)}
                  flush
                  className="h-full"
                >
                  <SkyCommunity feed={feed} showMarkers={showCommunityMarkers} onShowMarkersChange={setShowCommunityMarkers} highlightId={highlightReport} onLocate={goToReport} />
                </Panel>
              </div>
            )}

            <Button
              variant="primary"
              onClick={openData}
              title="Open the SPHEREx images of the place at the centre of the map"
              className={cx(
                'absolute bottom-9 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap shadow-dialog md:bottom-5',
                dock && 'max-md:hidden md:left-[calc(50%+11.25rem)]',
              )}
            >
              See SPHEREx data for this spot <ArrowRightIcon className="h-4 w-4" />
            </Button>
            <button
              onClick={() => setCreditsOpen(true)}
              className={cx('absolute bottom-1.5 left-2 z-10 bg-ink/75 px-1.5 text-2xs text-muted hover:text-paper', dock && 'max-md:hidden')}
            >
              Sky: AllWISE · NASA/IPAC IRSA · Aladin Lite (CDS)
            </button>
          </div>
        </div>
      ) : (
        <SphereXView
          key={`${ra}|${dec}`}
          ra={ra}
          dec={dec}
          fov={fov}
          layer={layer}
          startTool={startTool}
          onLayerChange={band => setUrl({ band }, { replace: true })}
          onBack={() => setUrl({ view: 'sky' })}
          onTryDefault={() => setUrl({ ra: DEFAULT_STATE.ra, dec: DEFAULT_STATE.dec, fov: DEFAULT_STATE.fov })}
        />
      )}

      {gameOpen && <GameDialog onClose={() => setGameOpen(false)} />}
      {creditsOpen && <CreditsDialog onClose={() => setCreditsOpen(false)} />}
    </main>
  )
}
