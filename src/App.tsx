import { useState } from 'react'
import { useSkyPatch } from './hooks/useSkyPatch'
import { useAutoplay } from './hooks/useAutoplay'
import { useUrlState } from './hooks/useUrlState'
import { LAYER_DIFF } from './lib/layers'
import SkyViewer from './components/SkyViewer'
import CoordinatesPanel from './components/CoordinatesPanel'
import TimelineBar from './components/TimelineBar'
import LayerSwitcher from './components/LayerSwitcher'

const FPS_OPTIONS = [1, 2, 4, 12, 24]

export default function App() {
  const [{ ra, dec, fov, band: layer }, setUrl] = useUrlState()
  const { data, loading, error } = useSkyPatch({ ra, dec, fov })
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

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-black text-slate-100">
      {/* Full-screen sky (Aladin Lite goes here later). Old data stays while a new query loads. */}
      {data && epoch && imageUrl && (
        <SkyViewer
          imageUrl={imageUrl}
          alt={`${data.target_info.name} ${epoch.epoch_id} ${layer}`}
          anomalies={layer === LAYER_DIFF ? data.difference_imaging.detected_anomalies : []}
        />
      )}

      {/* Overlays: always rendered so a bad query can be corrected */}
      <CoordinatesPanel
        key={`${ra}|${dec}|${fov}`}
        value={{ ra, dec, fov }}
        loading={loading}
        onSubmit={c => setUrl(c)}
      />

      {error && (
        <p className="absolute left-1/2 top-4 z-10 -translate-x-1/2 rounded bg-red-900/80 px-4 py-2 text-sm">
          {error}
        </p>
      )}

      {data && epoch && (
        <>
          <LayerSwitcher
            filters={Object.keys(epoch.chemical_filters)}
            layer={layer}
            onChange={band => setUrl({ band }, { replace: true })}
          />
          <TimelineBar
            epochs={data.timelapse_epochs}
            index={player.index}
            playing={player.playing}
            fps={fps}
            onIndex={player.setIndex}
            onToggle={player.toggle}
            onPrev={player.prev}
            onNext={player.next}
            onFpsClick={() => setFpsIdx(i => (i + 1) % FPS_OPTIONS.length)}
          />
        </>
      )}
    </main>
  )
}
