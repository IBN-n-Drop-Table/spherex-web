import { useRef, useState } from 'react'
import { DEFAULT_STATE, useUrlState } from './hooks/useUrlState'
import SkyMap, { type SkyFootprint, type SkyMapHandle } from './components/SkyMap'
import MiniMap from './components/MiniMap'
import SphereXView from './components/SphereXView'
import CoordinatesPanel from './components/CoordinatesPanel'
import TargetPicker from './components/TargetPicker'
import { TARGET_FOV_ARCMIN, targetPosition } from './data/targets'
import Credits from './components/Credits'

/**
 * Two views, switched with a button (and the URL: ?view=data):
 *  - sky map: Aladin only, with the editable coordinates / FOV. No backend calls.
 *  - SPHEREx data: asks the backend for the coordinates the user was looking at.
 */
export default function App() {
  const [{ ra, dec, fov, band: layer, view }, setUrl] = useUrlState()
  const mapRef = useRef<SkyMapHandle>(null)
  const [footprint, setFootprint] = useState<SkyFootprint | null>(null)

  const openData = () => {
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
            <TargetPicker
              onSelect={t => setUrl({ ...targetPosition(t), fov: TARGET_FOV_ARCMIN })}
            />
          </div>
          <button
            onClick={openData}
            className="absolute left-1/2 top-3 z-10 -translate-x-1/2 rounded bg-sky-600 px-4 py-2 text-sm font-medium shadow hover:bg-sky-500"
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

      <Credits raised={view === 'data'} />
    </main>
  )
}
