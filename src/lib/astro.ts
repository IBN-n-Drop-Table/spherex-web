// Where is the phone pointing, in the sky? Pure maths (no sensors here), so it can be checked
// against astropy. Angles in degrees unless a name says otherwise.

const RAD = Math.PI / 180
const DEG = 180 / Math.PI
const norm360 = (x: number) => ((x % 360) + 360) % 360

/** Local direction in the Earth frame: x east, y north, z up (unit length). */
export interface Vec3 {
  x: number
  y: number
  z: number
}

/**
 * The direction the BACK of the phone faces (where its camera looks), from the W3C device
 * orientation angles (alpha = compass turn, beta = front-back tilt, gamma = left-right tilt).
 * R = Rz(alpha) · Rx(beta) · Ry(gamma) takes device axes to Earth axes; the camera looks along the
 * device's -z axis, i.e. minus the third column of R.
 */
export function cameraDirection(alphaDeg: number, betaDeg: number, gammaDeg: number): Vec3 {
  const [a, b, g] = [alphaDeg * RAD, betaDeg * RAD, gammaDeg * RAD]
  const [cA, sA, cB, sB, cG, sG] = [Math.cos(a), Math.sin(a), Math.cos(b), Math.sin(b), Math.cos(g), Math.sin(g)]
  return {
    x: -(cA * sG + sA * sB * cG),
    y: -(sA * sG - cA * sB * cG),
    z: -(cB * cG),
  }
}

/** Altitude above the horizon and azimuth (from north, turning east) of a local direction. */
export function altAz(v: Vec3): { alt: number; az: number } {
  return { alt: Math.asin(Math.max(-1, Math.min(1, v.z))) * DEG, az: norm360(Math.atan2(v.x, v.y) * DEG) }
}

/** Julian date of a Date. */
export const julianDate = (d: Date) => d.getTime() / 86_400_000 + 2440587.5

/** Greenwich mean sidereal time in degrees (accurate to about a second for dates near today). */
export function gmstDeg(d: Date): number {
  return norm360(280.46061837 + 360.98564736629 * (julianDate(d) - 2451545.0))
}

/**
 * Altitude/azimuth for an observer to RA/Dec, in the J2000 frame the sky map uses.
 * Steps: horizontal -> equatorial of date (with local sidereal time), then undo precession.
 * Refraction, nutation and aberration (all under ~0.01 degrees) are ignored: the phone's compass
 * is hundreds of times less precise.
 */
export function altAzToRaDec(altDeg: number, azDeg: number, latDeg: number, lonDeg: number, date: Date): { ra: number; dec: number } {
  const [h, A, phi] = [altDeg * RAD, azDeg * RAD, latDeg * RAD]
  const sinDec = Math.sin(phi) * Math.sin(h) + Math.cos(phi) * Math.cos(h) * Math.cos(A)
  const dec = Math.asin(Math.max(-1, Math.min(1, sinDec)))
  const hourAngle = Math.atan2(-Math.cos(h) * Math.sin(A), Math.sin(h) * Math.cos(phi) - Math.cos(h) * Math.sin(phi) * Math.cos(A))
  const lst = gmstDeg(date) + lonDeg
  const raDate = norm360(lst - hourAngle * DEG)
  return precessToJ2000(raDate, dec * DEG, date)
}

/** Equatorial coordinates of date to J2000 (first-order precession; good to a few arcseconds for 25 years). */
export function precessToJ2000(raDeg: number, decDeg: number, date: Date): { ra: number; dec: number } {
  const years = (julianDate(date) - 2451545.0) / 365.25
  const m = 46.1244 / 3600 // deg per year
  const n = 20.0431 / 3600
  const [ra, dec] = [raDeg * RAD, decDeg * RAD]
  const dRa = (m + n * Math.sin(ra) * Math.tan(dec)) * years
  const dDec = n * Math.cos(ra) * years
  return { ra: norm360(raDeg - dRa), dec: Math.max(-90, Math.min(90, decDeg - dDec)) }
}

/** Angle between two sky positions, in degrees. */
export function angularSeparation(ra1: number, dec1: number, ra2: number, dec2: number): number {
  const [a1, d1, a2, d2] = [ra1 * RAD, dec1 * RAD, ra2 * RAD, dec2 * RAD]
  const c = Math.sin(d1) * Math.sin(d2) + Math.cos(d1) * Math.cos(d2) * Math.cos(a1 - a2)
  return Math.acos(Math.max(-1, Math.min(1, c))) * DEG
}

const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const
/** "NE" for 45 degrees: the compass point of an azimuth. */
export const compassPoint = (azDeg: number) => COMPASS[Math.round(norm360(azDeg) / 45) % 8]
