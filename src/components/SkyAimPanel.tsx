import { useEffect, useMemo, useState } from 'react'
import { altAzToRaDec, angularSeparation, compassPoint } from '../lib/astro'
import { TARGETS, targetPosition, type Target } from '../data/targets'
import type { SkyPointing, PointingStatus } from '../hooks/useSkyPointing'

interface Sensors {
  supported: boolean
  status: PointingStatus
  error: string | null
  now: SkyPointing | null
  start: () => void
  stop: () => void
}

interface Props {
  /** Move the map to this position (without touching the URL). */
  onPoint: (ra: number, dec: number) => void
  /** Go to one of the five objects. */
  onGoTo: (t: Target) => void
  sensors: Sensors
  onClose: () => void
}

interface Place {
  lat: number
  lon: number
}

const NEAR_TARGET_DEG = 20
/** The current time, read when the aim is (re)computed: the sky shown is the sky of that moment. */
const currentTime = () => new Date()

/**
 * "What is above you?": the map shows the part of the sky in a direction you choose, from where you
 * are, right now. The direction comes from two sliders (works on any computer) or from the phone's
 * sensors. The location never leaves the device.
 */
export default function SkyAimPanel({ onPoint, onGoTo, sensors, onClose }: Props) {
  const [place, setPlace] = useState<Place | null>(null)
  const [placeError, setPlaceError] = useState<string | null>(null)
  const [locating, setLocating] = useState(false)
  const [latText, setLatText] = useState('')
  const [lonText, setLonText] = useState('')
  const [az, setAz] = useState(180) // facing south: where most of the sky is for the north hemisphere
  const [alt, setAlt] = useState(45)
  const sensorsOn = sensors.status === 'active' || sensors.status === 'starting'
  // Minimized: just one line, so the map (what you came to look at) is not hidden behind the panel.
  const [minimized, setMinimized] = useState(false)

  const aim = sensorsOn && sensors.now ? { alt: sensors.now.alt, az: sensors.now.az } : { alt, az }
  const sky = useMemo(
    () => (place ? altAzToRaDec(aim.alt, aim.az, place.lat, place.lon, currentTime()) : null),
    // the sky turns slowly: re-computed whenever the aim or the place changes
    [place, aim.alt, aim.az],
  )

  // Manual aiming drives the map. (With the sensors on, the sensor hook moves it instead.)
  useEffect(() => {
    if (!sensorsOn && sky) onPoint(sky.ra, sky.dec)
  }, [sky, sensorsOn, onPoint])

  const nearest = useMemo(() => {
    if (!sky) return null
    let best: { target: Target; deg: number } | null = null
    for (const t of TARGETS) {
      const p = targetPosition(t)
      const deg = angularSeparation(sky.ra, sky.dec, p.ra, p.dec)
      if (!best || deg < best.deg) best = { target: t, deg }
    }
    return best && best.deg <= NEAR_TARGET_DEG ? best : null
  }, [sky])

  const locate = () => {
    setPlaceError(null)
    if (!navigator.geolocation) return setPlaceError('This browser cannot give a location. Type it below.')
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLocating(false)
        setPlace({ lat: pos.coords.latitude, lon: pos.coords.longitude })
      },
      () => {
        setLocating(false)
        setPlaceError('Could not get your location. Allow it in the browser, or type it below.')
      },
      { timeout: 12_000, maximumAge: 10 * 60_000 },
    )
  }
  const useTyped = () => {
    const [lat, lon] = [Number(latText), Number(lonText)]
    if (latText.trim() === '' || lonText.trim() === '' || !(lat >= -90 && lat <= 90) || !(lon >= -180 && lon <= 180)) {
      return setPlaceError('Latitude must be between -90 and 90, and longitude between -180 and 180.')
    }
    setPlaceError(null)
    setPlace({ lat, lon })
  }

  if (minimized) {
    return (
      <div className="flex w-[17rem] max-w-[calc(100vw-1.5rem)] items-center justify-between gap-2 rounded bg-black/80 px-3 py-2 text-xs backdrop-blur">
        <span className="text-slate-200">
          {place || sensorsOn ? `Looking ${compassPoint(aim.az)}, ${Math.round(aim.alt)}° up` : 'What is above you?'}
        </span>
        <span className="flex gap-1">
          <button onClick={() => setMinimized(false)} className="rounded bg-slate-800 px-2 py-1 hover:bg-slate-700">
            Show
          </button>
          {sensorsOn && (
            <button onClick={sensors.stop} className="rounded bg-sky-700 px-2 py-1 hover:bg-sky-600">
              Stop
            </button>
          )}
        </span>
      </div>
    )
  }

  const field = 'w-20 rounded bg-slate-900 px-2 py-1 text-slate-100 outline-none ring-sky-600 focus:ring-1'
  return (
    <div className="max-h-[calc(100vh-19rem)] min-h-[14rem] w-[17rem] max-w-[calc(100vw-1.5rem)] space-y-3 overflow-y-auto rounded bg-black/80 p-3 text-xs backdrop-blur">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-sm font-medium text-slate-100">What is above you?</div>
          <div className="text-slate-400">The map shows the sky you would see, right now.</div>
        </div>
        <span className="flex gap-1">
          <button onClick={() => setMinimized(true)} aria-label="Minimize" title="Minimize: see the map" className="rounded bg-slate-800 px-2 py-1 hover:bg-slate-700">
            –
          </button>
          <button onClick={onClose} aria-label="Close" className="rounded bg-slate-800 px-2 py-1 hover:bg-slate-700">
            ✕
          </button>
        </span>
      </div>

      <div className="space-y-1">
        <div className="text-slate-300">1. Where are you?</div>
        <button onClick={locate} disabled={locating} className="w-full rounded bg-sky-700 px-2 py-1.5 hover:bg-sky-600 disabled:opacity-50">
          {locating ? 'Asking your browser…' : 'Use my location'}
        </button>
        <div className="flex items-center gap-1">
          <input value={latText} onChange={e => setLatText(e.target.value)} placeholder="Lat" aria-label="Latitude" className={field} />
          <input value={lonText} onChange={e => setLonText(e.target.value)} placeholder="Lon" aria-label="Longitude" className={field} />
          <button onClick={useTyped} className="rounded bg-slate-700 px-2 py-1 hover:bg-slate-600">
            Use
          </button>
        </div>
        <div className="text-[11px] text-slate-500">North and east are positive (Madrid: 40.4, -3.7). It stays on your device.</div>
        {place && (
          <div className="text-slate-300">
            Location: {place.lat.toFixed(2)}°, {place.lon.toFixed(2)}°
          </div>
        )}
        {placeError && <div className="rounded bg-amber-900/70 px-2 py-1 text-amber-100">{placeError}</div>}
      </div>

      <div className="space-y-1">
        <div className="text-slate-300">2. Which way do you look?</div>
        <div className="flex gap-1">
          {([['N', 0], ['E', 90], ['S', 180], ['W', 270]] as const).map(([name, deg]) => (
            <button key={name} onClick={() => setAz(deg)} disabled={sensorsOn} className="flex-1 rounded bg-slate-800 py-1 hover:bg-slate-700 disabled:opacity-50">
              {name}
            </button>
          ))}
        </div>
        <input type="range" min={0} max={359} value={Math.round(aim.az)} onChange={e => setAz(Number(e.target.value))} disabled={sensorsOn} aria-label="Direction" className="w-full accent-sky-500" />
        <div className="text-slate-400">
          Towards {compassPoint(aim.az)} ({Math.round(aim.az)}°, 0 = north)
        </div>
      </div>

      <div className="space-y-1">
        <div className="text-slate-300">3. How high?</div>
        <input type="range" min={0} max={90} value={Math.round(Math.max(0, aim.alt))} onChange={e => setAlt(Number(e.target.value))} disabled={sensorsOn} aria-label="Height above the horizon" className="w-full accent-sky-500" />
        <div className="flex items-center justify-between text-slate-400">
          <span>{Math.round(aim.alt)}° above the horizon (90° = straight up)</span>
          <button onClick={() => setAlt(90)} disabled={sensorsOn} className="rounded bg-slate-800 px-2 py-0.5 hover:bg-slate-700 disabled:opacity-50">
            Straight up
          </button>
        </div>
      </div>

      {!place && <p className="rounded bg-slate-900 px-2 py-1 text-slate-300">Set your location (step 1) and the map will follow your choices.</p>}
      {place && aim.alt < 0 && <p className="rounded bg-amber-900/70 px-2 py-1 text-amber-100">That is below the horizon: you would be looking at the ground.</p>}
      {sky && nearest && (
        <div className="rounded bg-slate-900 px-2 py-1.5 text-slate-200">
          Near this view: <strong>{nearest.target.name}</strong>, {Math.round(nearest.deg)}° away.{' '}
          <button onClick={() => onGoTo(nearest.target)} className="underline hover:text-sky-300">
            Go to it
          </button>
        </div>
      )}

      {sensors.supported && (
        <div className="space-y-1 border-t border-slate-700 pt-2">
          <button onClick={sensorsOn ? sensors.stop : () => { setMinimized(true); sensors.start() }} aria-pressed={sensors.status === 'active'} className={`w-full rounded px-2 py-1.5 ${sensorsOn ? 'bg-sky-600' : 'bg-slate-700 hover:bg-slate-600'}`}>
            {sensorsOn ? 'Stop using my phone’s sensors' : 'Use my phone’s sensors instead'}
          </button>
          {sensors.status === 'starting' && <p className="text-slate-300">Waiting for the sensors…</p>}
          {sensors.status === 'active' && <p className="text-slate-400">Approximate: phone compasses are off by several degrees. If it points the wrong way, wave the phone in a figure 8.</p>}
          {sensors.status === 'error' && sensors.error && <p className="rounded bg-amber-900/70 px-2 py-1">{sensors.error}</p>}
        </div>
      )}
    </div>
  )
}
