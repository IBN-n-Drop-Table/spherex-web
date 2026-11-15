import { useEffect, useMemo, useState } from 'react'
import { altAzToRaDec, angularSeparation, compassPoint } from '../lib/astro'
import { TARGETS, targetPosition, type Target } from '../data/targets'
import type { SkyPointing, PointingStatus } from '../hooks/useSkyPointing'
import { Button, Callout, LinkButton, Panel } from './ui'
import { fieldClass } from './classes'

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

  const looking = `Looking ${compassPoint(aim.az)}, ${Math.round(aim.alt)}° up`
  return (
    <Panel
      title={minimized && (place || sensorsOn) ? `${looking}${sensorsOn ? ' (approximate)' : ''}` : 'What is above you?'}
      subtitle="Say where you are and where you look. The map shows that sky, right now."
      onClose={onClose}
      minimised={minimized}
      onMinimise={() => setMinimized(m => !m)}
      minimiseEverywhere
      actions={
        minimized && sensorsOn ? (
          <Button size="sm" variant="primary" onClick={sensors.stop}>
            Stop
          </Button>
        ) : undefined
      }
      className="h-full"
    >
      <div className="space-y-5 text-xs">
        {/* On a phone the sensors come first: it is the natural way to use it. The sliders stay below. */}
        {sensors.supported && (
          <section className="space-y-2">
            <h3 className="label-caps text-faint">Point your phone</h3>
            <p className="text-muted">Hold the phone up to the sky: the map follows where its back points. It asks for motion and location access.</p>
            <Button
              variant={sensorsOn ? 'secondary' : 'primary'}
              onClick={
                sensorsOn
                  ? sensors.stop
                  : () => {
                      setMinimized(true)
                      sensors.start()
                    }
              }
              pressed={sensors.status === 'active' ? true : undefined}
              className="w-full"
            >
              {sensorsOn ? 'Stop following my phone' : 'Point my phone at the sky'}
            </Button>
            {sensors.status === 'starting' && <p className="text-muted">Waiting for the sensors…</p>}
            {sensors.status === 'active' && (
              <Callout tone="caution">Approximate: phone compasses are off by several degrees. If it points the wrong way, wave the phone in a figure 8.</Callout>
            )}
            {sensors.status === 'error' && sensors.error && <Callout tone="error">{sensors.error}</Callout>}
          </section>
        )}
        {sensors.supported && <h3 className="border-t border-rule pt-4 font-display text-base italic text-muted">Or aim by hand</h3>}
        <section className="space-y-2">
          <h3 className="label-caps text-faint">1 · Where are you?</h3>
          <Button onClick={locate} disabled={locating} className="w-full">
            {locating ? 'Asking your browser…' : 'Use my location'}
          </Button>
          <div className="flex items-end gap-2">
            <label className="min-w-0 flex-1">
              <span className="mb-1 block text-muted">Latitude</span>
              <input value={latText} onChange={e => setLatText(e.target.value)} inputMode="decimal" placeholder="40.4" aria-label="Latitude" className={`${fieldClass} font-mono`} />
            </label>
            <label className="min-w-0 flex-1">
              <span className="mb-1 block text-muted">Longitude</span>
              <input value={lonText} onChange={e => setLonText(e.target.value)} inputMode="decimal" placeholder="-3.7" aria-label="Longitude" className={`${fieldClass} font-mono`} />
            </label>
            <Button onClick={useTyped}>Use</Button>
          </div>
          <p className="text-2xs text-faint">North and east are positive (Madrid: 40.4, -3.7). Your location stays on this device.</p>
          {place && (
            <p className="font-mono text-muted">
              {place.lat.toFixed(2)}°, {place.lon.toFixed(2)}°
            </p>
          )}
          {placeError && <Callout tone="caution">{placeError}</Callout>}
        </section>

        <section className="space-y-2">
          <h3 className="label-caps text-faint">2 · Which way do you look?</h3>
          <div className="flex gap-1.5">
            {([['N', 0], ['E', 90], ['S', 180], ['W', 270]] as const).map(([name, deg]) => (
              <Button key={name} size="sm" onClick={() => setAz(deg)} disabled={sensorsOn} pressed={!sensorsOn && Math.round(aim.az) === deg ? true : undefined} className="flex-1">
                {name}
              </Button>
            ))}
          </div>
          <input type="range" min={0} max={359} value={Math.round(aim.az)} onChange={e => setAz(Number(e.target.value))} disabled={sensorsOn} aria-label="Direction" className="w-full" />
          <p className="text-muted">
            Towards <span className="text-paper">{compassPoint(aim.az)}</span> <span className="font-mono">({Math.round(aim.az)}°, 0 = north)</span>
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="label-caps text-faint">3 · How high?</h3>
          <input type="range" min={0} max={90} value={Math.round(Math.max(0, aim.alt))} onChange={e => setAlt(Number(e.target.value))} disabled={sensorsOn} aria-label="Height above the horizon" className="w-full" />
          <div className="flex items-center justify-between gap-2 text-muted">
            <span>
              <span className="font-mono text-paper">{Math.round(aim.alt)}°</span> above the horizon (90° = straight up)
            </span>
            <Button size="sm" onClick={() => setAlt(90)} disabled={sensorsOn}>
              Straight up
            </Button>
          </div>
        </section>

        {!place && !sensorsOn && <Callout>Set your location (step 1) and the map will follow your choices.</Callout>}
        {place && aim.alt < 0 && <Callout tone="caution">That is below the horizon: you would be looking at the ground.</Callout>}
        {sky && nearest && (
          <p className="border-t border-rule pt-3 text-muted">
            Near this view: <span className="font-display text-sm italic text-paper">{nearest.target.name}</span>, {Math.round(nearest.deg)}° away.{' '}
            <LinkButton onClick={() => onGoTo(nearest.target)}>Go to it</LinkButton>
          </p>
        )}

      </div>
    </Panel>
  )
}
