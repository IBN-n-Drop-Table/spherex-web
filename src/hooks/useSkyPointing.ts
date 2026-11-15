import { useCallback, useEffect, useRef, useState } from 'react'
import { altAz, altAzToRaDec, cameraDirection, type Vec3 } from '../lib/astro'

export type PointingStatus = 'idle' | 'starting' | 'active' | 'error'

export interface SkyPointing {
  ra: number
  dec: number
  alt: number // degrees above the horizon
  az: number // degrees from north, turning east
}

const SMOOTHING = 0.3 // share of each new reading that enters the average (sensors jitter)
const EMIT_EVERY_MS = 80 // about 12 map updates per second
const MIN_MOVE_DEG = 0.02 // smaller moves are not worth a redraw
const NO_SENSOR_AFTER_MS = 2500

/** Touch devices that expose orientation events. A laptop gets none, so the control stays hidden. */
export const pointingSupported = () =>
  typeof window !== 'undefined' && 'DeviceOrientationEvent' in window && navigator.maxTouchPoints > 0

const norm = (v: Vec3): Vec3 => {
  const n = Math.hypot(v.x, v.y, v.z) || 1
  return { x: v.x / n, y: v.y / n, z: v.z / n }
}

/**
 * "Point your phone at the sky": follows where the back of the phone points, using the compass and
 * tilt sensors plus the location and the time, and reports it as RA/Dec for the map.
 * Everything stays on the device: the position and the orientation are never sent anywhere.
 * `onPoint` is called about 12 times a second at most.
 */
export function useSkyPointing(onPoint: (p: SkyPointing) => void) {
  const [status, setStatus] = useState<PointingStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [now, setNow] = useState<SkyPointing | null>(null)
  const stopRef = useRef<(() => void) | null>(null)
  const latest = useRef(onPoint)
  useEffect(() => {
    latest.current = onPoint
  })

  const stop = useCallback(() => {
    stopRef.current?.()
    stopRef.current = null
    setStatus('idle')
    setNow(null)
  }, [])
  useEffect(() => () => stopRef.current?.(), [])

  const fail = (message: string) => {
    stopRef.current?.()
    stopRef.current = null
    setError(message)
    setStatus('error')
  }

  /** Must run from a tap: iOS only shows its motion permission prompt for a user gesture. */
  const start = useCallback(async () => {
    if (stopRef.current) return
    setError(null)
    setStatus('starting')
    if (!window.isSecureContext) {
      return fail('Phone sensors only work on a secure (https) page. Open the site through its https address.')
    }
    // 1. Motion permission (iOS asks; other browsers just allow it). This must be the first await.
    const Motion = DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<'granted' | 'denied'> }
    if (typeof Motion.requestPermission === 'function') {
      try {
        if ((await Motion.requestPermission()) !== 'granted') {
          return fail('Motion sensors were not allowed. Allow motion and orientation access for this site in the browser settings.')
        }
      } catch {
        return fail('Could not ask for motion sensor access.')
      }
    }
    // 2. Where on Earth: needed to know which part of the sky is overhead. Used only here.
    let lat: number
    let lon: number
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        if (!navigator.geolocation) return reject(new Error('unavailable'))
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 12_000, maximumAge: 10 * 60_000 })
      })
      lat = pos.coords.latitude
      lon = pos.coords.longitude
    } catch {
      return fail('Your location is needed to know which part of the sky is above you. It stays on your device. Allow location access and try again.')
    }

    // 3. Follow the sensors.
    const absolute = 'ondeviceorientationabsolute' in window
    const eventName = absolute ? 'deviceorientationabsolute' : 'deviceorientation'
    let smooth: Vec3 | null = null
    let lastEmit = 0
    let last: SkyPointing | null = null
    let gotReading = false
    const noSensor = setTimeout(() => {
      if (!gotReading) fail('No motion sensor was found on this device.')
    }, NO_SENSOR_AFTER_MS)

    const onEvent = (e: Event) => {
      const o = e as DeviceOrientationEvent & { webkitCompassHeading?: number }
      if (o.beta == null || o.gamma == null) return
      // North reference: the absolute (compass) event, or iOS's compass heading. A relative alpha
      // knows nothing about north, so it would point at the wrong stars.
      let alpha: number | null = null
      if (typeof o.webkitCompassHeading === 'number') alpha = 360 - o.webkitCompassHeading
      else if (o.alpha != null && (absolute || o.absolute)) alpha = o.alpha
      if (alpha === null) {
        if (!gotReading) fail("This device doesn't report a compass direction, so it can't tell where north is.")
        return
      }
      gotReading = true
      const v = cameraDirection(alpha, o.beta, o.gamma)
      smooth = smooth ? norm({ x: smooth.x + SMOOTHING * (v.x - smooth.x), y: smooth.y + SMOOTHING * (v.y - smooth.y), z: smooth.z + SMOOTHING * (v.z - smooth.z) }) : v
      const t = performance.now()
      if (t - lastEmit < EMIT_EVERY_MS) return
      lastEmit = t
      const aa = altAz(smooth)
      const { ra, dec } = altAzToRaDec(aa.alt, aa.az, lat, lon, new Date())
      if (last && Math.hypot(((ra - last.ra + 540) % 360) - 180, dec - last.dec) < MIN_MOVE_DEG) return
      last = { ra, dec, alt: aa.alt, az: aa.az }
      setStatus('active')
      setNow(last)
      latest.current(last)
    }
    window.addEventListener(eventName, onEvent)
    stopRef.current = () => {
      clearTimeout(noSensor)
      window.removeEventListener(eventName, onEvent)
    }
  }, [])

  return { supported: pointingSupported(), status, error, now, start, stop }
}
