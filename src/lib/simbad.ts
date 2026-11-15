// Nearest catalogued star with a parallax, from SIMBAD. The CDS host was unreachable, so this uses
// the Harvard mirror (it allows browser requests). It only describes what is catalogued next to
// the position: it does NOT say that this is the object the user is looking at.
const TAP = 'https://simbad.harvard.edu/simbad/sim-tap/sync'
export const NEAR_RADIUS_ARCSEC = 10
const MIN_PARALLAX_SNR = 3 // below this the distance is not worth showing
const UNCERTAIN_BELOW_SNR = 5 // between the two: say "roughly"

export interface NearbyStar {
  name: string
  distanceLy: number
  separationArcsec: number
  uncertain: boolean
}

const adql = (ra: number, dec: number) => `
SELECT TOP 1 main_id, plx_value, plx_err,
  DISTANCE(POINT('ICRS', ra, dec), POINT('ICRS', ${ra}, ${dec})) AS sep
FROM basic
WHERE CONTAINS(POINT('ICRS', ra, dec), CIRCLE('ICRS', ${ra}, ${dec}, ${NEAR_RADIUS_ARCSEC / 3600})) = 1
  AND plx_value > 0 AND plx_err > 0
ORDER BY sep`

/** `null` when nothing with a usable parallax lies within 10″ of the position. */
export async function nearestStar(ra: number, dec: number, signal?: AbortSignal): Promise<NearbyStar | null> {
  const url = new URL(TAP)
  url.search = new URLSearchParams({ request: 'doQuery', lang: 'adql', format: 'json', query: adql(ra, dec) }).toString()
  const res = await fetch(url, { signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(8000)]) : AbortSignal.timeout(8000) })
  if (!res.ok) throw new Error(`SIMBAD answered ${res.status}`)
  const json = (await res.json()) as { data?: [string, number, number, number][] }
  const row = json.data?.[0]
  if (!row) return null
  const [name, plx, err, sep] = row
  const snr = plx / err
  if (!(snr >= MIN_PARALLAX_SNR)) return null
  return {
    name: name.replace(/^(\*|V\*|NAME)\s+/, '').trim(),
    distanceLy: (1000 / plx) * 3.26156, // parallax in mas -> parsecs -> light-years
    separationArcsec: sep * 3600,
    uncertain: snr < UNCERTAIN_BELOW_SNR,
  }
}

export function nearbyStarText(s: NearbyStar): string {
  const ly = s.distanceLy < 100 ? s.distanceLy.toFixed(1) : Math.round(s.distanceLy).toLocaleString('en-US')
  return `Nearest catalogued star (${Math.round(s.separationArcsec)}″ away): ${s.name}, ${s.uncertain ? 'roughly ' : ''}${ly} light-years.`
}
